"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { getDashboardStats } from "./actions"
import { formatDate } from "@/lib/date-utils"
import { executeCountQuery, executeQuery } from "@/lib/supabase-helpers"
import { TaskStatusBadge } from "./tasks-badge"

// Importar componentes específicos por rol
import { AdminDashboard } from "./admin-dashboard"
import { SupervisorDashboard } from "./supervisor-dashboard"
import { TrabajadorDashboard } from "./trabajador-dashboard"


// Definir tipos para mejorar la inferencia
type StatsType = {
  total_edificios: number;
  total_contactos: number;
  total_administradores: number;
  tareas_activas: number;
};

type TaskType = {
  id: string;
  created_at: string;
  [key: string]: any;
};

type BuildingType = {
  id: string;
  created_at: string;
  [key: string]: any;
};

export default function DashboardPage() {
  const supabase = createClient()

  // Estados generales
  const [stats, setStats] = useState<StatsType | null>(null)
  const [recentTasks, setRecentTasks] = useState<TaskType[]>([])
  const [recentBuildings, setRecentBuildings] = useState<BuildingType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estado para almacenar los datos del usuario
  const [userDetails, setUserDetails] = useState<any>(null)

  // Estados específicos por rol
  const [financialStats, setFinancialStats] = useState<any>(null) // Para admin
  const [supervisorStats, setSupervisorStats] = useState<any>(null) // Para supervisor
  const [trabajadorStats, setTrabajadorStats] = useState<any>(null) // Para trabajador
  const [salarioDiarioTrabajador, setSalarioDiarioTrabajador] = useState<number>(0) // Salario del trabajador

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)

        if (!supabase) {
          setError("no se pudo inicializar supabase")
          return
        }

        // Usar Server Action para obtener datos (lee el JWT automáticamente)
        const { stats: dashboardStats, roleStats, userDetails: userData, error: serverError } = await getDashboardStats()

        if (serverError || !userData) {
          console.error('spc: error server side', serverError)
          setError("no se pudieron cargar los datos del usuario")
          return
        }

        setUserDetails(userData)
        setStats(dashboardStats)

        // Hidratar estadísticas según el rol del usuario desde roleStats
        if (userData.rol === 'admin' && roleStats) {
          setFinancialStats({
            ...roleStats,
            presupuestos_activos: roleStats.presupuestos_finales_total || 0, // Mapeo de nombre de columna
          })
        } else if (userData.rol === 'supervisor' && roleStats) {
          setSupervisorStats({
            ...roleStats,
            tareas_supervisadas: roleStats.tareas_supervisadas_total || 0, // Mapeo de nombre de columna
          })
        } else if (userData.rol === 'trabajador' && roleStats) {
          setTrabajadorStats({
            ...roleStats,
            mis_tareas: roleStats.tareas_asignadas_total || 0, // Mapeo de nombre de columna
          })
        }

        // Obtener tareas recientes filtradas por rol
        let tasksQuery;

        // Filtrar tareas según el rol del usuario
        if (userData?.rol === 'admin') {
          // Los admin ven todas las tareas usando la vista completa con JOIN a estados_tareas
          tasksQuery = supabase.from("vista_tareas_completa")
            .select(`
              id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
              estados:estados_tareas(id, nombre, color)
            `)
            .eq('finalizada', false)
            .order('fecha_visita', { ascending: true }) // Ordenar por fecha de visita más próxima
        }
        else if (userData?.rol === 'supervisor') {
          // Los supervisores solo ven tareas que supervisan
          try {
            // Primero obtenemos los IDs de tareas asignadas al supervisor
            const { data: asignaciones } = await supabase
              .from('supervisores_tareas')
              .select('id_tarea')
              .eq('id_supervisor', userData.id)

            const idsTareas = asignaciones?.map(a => a.id_tarea) || []

            if (idsTareas.length > 0) {
              // Luego filtramos las tareas por esos IDs usando la vista completa con JOIN a estados_tareas
              tasksQuery = supabase.from("vista_tareas_completa")
                .select(`
                  id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                  estados:estados_tareas(id, nombre, color)
                `)
                .in('id', idsTareas)
                .eq('finalizada', false)
                .order('fecha_visita', { ascending: true }) // Ordenar por fecha de visita más próxima
            } else {
              // Si no tiene tareas asignadas, mostramos una lista vacía
              tasksQuery = supabase.from("vista_tareas_completa")
                .select(`
                  id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                  estados:estados_tareas(id, nombre, color)
                `)
                .eq('id', -1) // No coincidirá con ninguna
            }
          } catch (e) {
            console.error("Error al consultar tareas del supervisor:", e)
            tasksQuery = supabase.from("vista_tareas_completa")
              .select(`
                id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                estados:estados_tareas(id, nombre, color)
              `)
              .limit(0)
          }
        }
        else if (userData?.rol === 'trabajador') {
          // Los trabajadores solo ven tareas donde están asignados
          try {
            // Primero obtenemos los IDs de tareas asignadas al trabajador
            const { data: asignaciones } = await supabase
              .from('trabajadores_tareas')
              .select('id_tarea')
              .eq('id_trabajador', userData.id)

            const idsTareas = asignaciones?.map(a => a.id_tarea) || []

            if (idsTareas.length > 0) {
              // Luego filtramos las tareas por esos IDs usando la vista completa con JOIN a estados_tareas
              tasksQuery = supabase.from("vista_tareas_completa")
                .select(`
                  id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                  estados:estados_tareas(id, nombre, color)
                `)
                .in('id', idsTareas)
                .eq('finalizada', false)
                .order('fecha_visita', { ascending: true }) // Ordenar por fecha de visita más próxima
            } else {
              // Si no tiene tareas asignadas, mostramos una lista vacía
              tasksQuery = supabase.from("vista_tareas_completa")
                .select(`
                  id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                  estados:estados_tareas(id, nombre, color)
                `)
                .eq('id', -1) // No coincidirá con ninguna
            }
          } catch (e) {
            console.error("Error al consultar tareas del trabajador:", e)
            tasksQuery = supabase.from("vista_tareas_completa")
              .select(`
                id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                estados:estados_tareas(id, nombre, color)
              `)
              .limit(0)
          }
        }
        else {
          // Para otros roles o si no hay rol definido, no mostramos tareas
          tasksQuery = supabase.from("vista_tareas_completa")
            .select(`
              id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
              estados:estados_tareas(id, nombre, color)
            `)
            .limit(0)
        }

        // Ejecutamos la consulta con límite
        const { data: tasksData, error: tasksError } = await executeQuery<TaskType>(
          tasksQuery,
          5,
          "created_at",
          false // descendente
        );

        if (tasksError) {
          console.error("Error al obtener tareas recientes:", tasksError)
        } else {
          setRecentTasks(tasksData)
        }

        // Obtener edificios recientes - usando la función de ayuda
        const buildingsQuery = supabase.from("edificios").select("*")
        const { data: buildingsData, error: buildingsError } = await executeQuery<BuildingType>(
          buildingsQuery,
          5,
          "created_at",
          false // descendente
        )

        if (buildingsError) {
          console.error("Error al obtener edificios recientes:", buildingsError)
        } else {
          setRecentBuildings(buildingsData)
        }

      } catch (err) {
        console.error("Error al cargar datos del dashboard:", err)
        setError("Ocurrió un error al cargar los datos del dashboard")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Estado de error
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-red-800">Error</h2>
        <p className="mt-2 text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>

      </div>

      {/* Mostrar interfaz específica según el rol del usuario */}
      {userDetails?.rol === 'admin' && (
        <AdminDashboard
          stats={stats ?? undefined}
          financialStats={financialStats}
          recentTasks={recentTasks}
          recentBuildings={recentBuildings}
        />
      )}

      {userDetails?.rol === 'supervisor' && (
        <SupervisorDashboard
          stats={stats ?? undefined}
          supervisorStats={supervisorStats}
          recentTasks={recentTasks}
        />
      )}

      {userDetails?.rol === 'trabajador' && (
        <TrabajadorDashboard
          stats={stats ?? undefined}
          trabajadorStats={trabajadorStats}
          recentTasks={recentTasks}
          userId={userDetails.id}
          salarioDiario={salarioDiarioTrabajador}
        />
      )}

      {/* Si no hay un rol definido, mostrar la interfaz genérica */}
      {!userDetails?.rol && (
        <>
          {/* Estadísticas generales */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Total Edificios</h3>
              <p className="mt-2 text-3xl font-bold">{stats?.total_edificios || 0}</p>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Total Administradores</h3>
              <p className="mt-2 text-3xl font-bold">{stats?.total_administradores || 0}</p>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Total Teléfonos</h3>
              <p className="mt-2 text-3xl font-bold">{stats?.total_contactos || 0}</p>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground">Tareas Activas</h3>
              <p className="mt-2 text-3xl font-bold">{stats?.tareas_activas || 0}</p>
            </div>
          </div>

          {/* Tareas recientes */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Tareas Recientes</h2>
            <div className="rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">Título</th>
                      <th className="px-4 py-2 text-left font-medium">Estado</th>
                      <th className="px-4 py-2 text-left font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTasks && recentTasks.length > 0 ? (
                      recentTasks.map((task) => (
                        <tr key={task.id} className="border-b">
                          <td className="px-4 py-2">{task.titulo}</td>
                          <td className="px-4 py-2">
                            <TaskStatusBadge task={task} />
                          </td>
                          <td className="px-4 py-2">{formatDate(task.created_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-center text-muted-foreground">
                          No hay tareas recientes
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Edificios recientes */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Edificios Recientes</h2>
            <div className="rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2 text-left font-medium">Nombre</th>
                      <th className="px-4 py-2 text-left font-medium">Dirección</th>
                      <th className="px-4 py-2 text-left font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBuildings && recentBuildings.length > 0 ? (
                      recentBuildings.map((building) => (
                        <tr key={building.id} className="border-b">
                          <td className="px-4 py-2">{building.nombre}</td>
                          <td className="px-4 py-2">{building.direccion}</td>
                          <td className="px-4 py-2">{formatDate(building.created_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-center text-muted-foreground">
                          No hay edificios recientes
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
