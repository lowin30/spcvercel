import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { getDashboardStats } from "./actions"
import { getDashboardSupervisorData } from "./dashboard-supervisor.actions"
import { AdminDashboard } from "./admin-dashboard"
import { SupervisorDashboard } from "./supervisor-dashboard"
import { TrabajadorDashboard } from "./trabajador-dashboard"
import { createServerClient } from "@/lib/supabase-server"
import { executeQuery } from "@/lib/supabase-helpers"

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface DashboardTask {
  id: number
  code?: string
  titulo?: string
  id_estado_nuevo?: number
  finalizada?: boolean
  created_at?: string
  fecha_visita?: string | null
  nombre_edificio?: string
}

interface DashboardBuilding {
  id: number
  nombre?: string
  direccion?: string | null
  created_at?: string
}

export default async function DashboardPage() {
  // 1. Validacion de sesion y usuario (Modo Dios Server-Side)
  const userData = await validateSessionAndGetUser()

  if (!userData) {
    redirect('/login')
  }

  const supabase = await createServerClient()

  // 2. Branching de carga de datos segun ROL (Server Actions)
  let stats = null
  let financialStats = null
  let supervisorInitialData = null
  let trabajadorStats = null
  let recentTasks: DashboardTask[] = []
  let recentBuildings: DashboardBuilding[] = []

  if (userData.rol === 'supervisor') {
    const superData = await getDashboardSupervisorData()
    if (superData.success) {
      supervisorInitialData = superData
    }
  } else {
    const dashboardData = await getDashboardStats()
    if (!dashboardData.error) {
      stats = dashboardData.stats
      if (userData.rol === 'admin') {
        financialStats = {
          ...dashboardData.roleStats,
          presupuestos_activos: dashboardData.roleStats?.presupuestos_finales_total || 0,
        }
      } else if (userData.rol === 'trabajador') {
        trabajadorStats = {
          ...dashboardData.roleStats,
          mis_tareas: dashboardData.roleStats?.tareas_asignadas_total || 0,
        }
      }
    }
  }

  // 3. Tareas recientes (Logica de servidor)
  let tasksQuery = supabase.from("vista_tareas_completa").select("*").eq('finalizada', false)

  if (userData.rol === 'supervisor') {
    const { data: asignaciones } = await supabase.from('supervisores_tareas').select('id_tarea').eq('id_supervisor', userData.id)
    const ids = asignaciones?.map(a => a.id_tarea) || []
    tasksQuery = tasksQuery.in('id', ids.length > 0 ? ids : [0]) // id es number en la base de datos
  } else if (userData.rol === 'trabajador') {
    const { data: asignaciones } = await supabase.from('trabajadores_tareas').select('id_tarea').eq('id_trabajador', userData.id)
    const ids = asignaciones?.map(a => a.id_tarea) || []
    tasksQuery = tasksQuery.in('id', ids.length > 0 ? ids : [0]) // id es number en la base de datos
  }

  const { data: tasksData } = await executeQuery<DashboardTask>(tasksQuery, 5, "created_at", false)
  recentTasks = tasksData || []

  // 4. Edificios recientes
  const { data: buildingsData } = await executeQuery<DashboardBuilding>(supabase.from("edificios").select("*"), 5, "created_at", false)
  recentBuildings = buildingsData || []

  return (
    <div className="space-y-8">
      {userData.rol !== 'supervisor' && (
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">dashboard</h1>
        </div>
      )}

      {userData.rol === 'admin' && (
        <AdminDashboard
          stats={stats || undefined}
          financialStats={financialStats}
          recentTasks={recentTasks as any}
          recentBuildings={recentBuildings as any}
        />
      )}

      {userData.rol === 'supervisor' && (
        <SupervisorDashboard
          initialData={supervisorInitialData}
        />
      )}

      {userData.rol === 'trabajador' && (
        <TrabajadorDashboard
          stats={stats || undefined}
          trabajadorStats={trabajadorStats}
          recentTasks={recentTasks as any}
          userId={userData.id}
          salarioDiario={0} // este dato podria venir de userDetails si fuera necesario
        />
      )}
    </div>
  )
}

