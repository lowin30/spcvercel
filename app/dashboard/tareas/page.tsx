import { Suspense } from "react"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import TareasClientPage from "@/app/dashboard/tareas/client-page"
import { Loader2 } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

// Componente de carga para Suspense
function TareasLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
    </div>
  )
}

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// 1. Loader Imports
import {
  getTareasData,
  getRecordatorios,
  getTareasParaPresupuesto,
  getPresupuestosBase,
  getTareasCounts
} from "@/app/dashboard/tareas/loader"
import { supabaseAdmin } from "@/lib/supabase-admin" // Direct fetch for catalogs or new loader function?
// Let's use direct admin fetch here for brevity or better, a dedicated loader function
// getCatalogsForWizard returns { administradores, supervisores, trabajadores }. Missing Edificios linked to Admin.

async function getFiltersCatalogs() {
  const [admins, eds, sups, states] = await Promise.all([
    supabaseAdmin.from('administradores').select('id, nombre').eq('estado', 'activo').order('nombre'),
    supabaseAdmin.from('vista_edificios_completa').select('id, nombre, id_administrador').order('nombre'),
    supabaseAdmin.from('usuarios').select('id, email, nombre, code').eq('rol', 'supervisor'),
    supabaseAdmin.from('estados_tareas').select('id, nombre, codigo').order('orden')
  ]);

  return {
    administradores: admins.data || [],
    edificios: eds.data || [],
    supervisores: sups.data || [],
    estados: states.data || []
  }
}

export default async function TareasPage({ searchParams }: Props) {
  // 1. Identity Bridge: Validar Sesión y Obtener Usuario
  const user = await validateSessionAndGetUser()

  // 2. Parse Search Params
  const params = await searchParams
  const crearPresupuestoMode = params.crear_presupuesto === 'true'

  // Extract Filters
  const filters = {
    id_administrador: params.id_administrador as string,
    id_edificio: params.id_edificio as string,
    estado: params.estado as string,
    id_supervisor: params.id_supervisor as string,
    search: params.search as string,
    view: params.view as string
  }

  let initialTareas: any[] = []
  let initialPresupuestosBase = {}
  let initialCounts = { activas: 0, aprobadas: 0, enviadas: 0, finalizadas: 0, todas: 0 }
  let recordatorios: any[] = []
  let catalogs: any = null

  // 3. Data Fetching (Server Side) via Loader (Bypass RLS controlled)
  try {
    if (crearPresupuestoMode) {
      const [tareas, counts, recs, cats] = await Promise.all([
        getTareasParaPresupuesto(),
        getTareasCounts(filters),
        getRecordatorios(user.rol, user.id),
        getFiltersCatalogs()
      ])
      initialTareas = tareas
      initialCounts = counts
      recordatorios = recs
      catalogs = cats

      if (initialTareas.length > 0) {
        const ids = initialTareas.map(t => t.id)
        initialPresupuestosBase = await getPresupuestosBase(ids)
      }
    } else {
      // Pass filters to loader
      const [tareas, counts, recs, cats] = await Promise.all([
        getTareasData(filters),
        getTareasCounts(filters),
        getRecordatorios(user.rol, user.id),
        getFiltersCatalogs()
      ])
      initialTareas = tareas
      initialCounts = counts
      recordatorios = recs
      catalogs = cats
    }
  } catch (error) {
    console.error("Critical Data Fetch Error:", error)
    initialTareas = []
    initialCounts = { activas: 0, aprobadas: 0, enviadas: 0, finalizadas: 0, todas: 0 }
    recordatorios = []
    catalogs = { administradores: [], edificios: [], supervisores: [], estados: [] }
  }

  // 5. Render Client Component with Hydrated Data
  return (
    <Suspense fallback={<TareasLoading />}>
      <TareasClientPage
        initialTareas={initialTareas}
        initialUserDetails={user}
        initialRecordatorios={recordatorios}
        initialPresupuestosBase={initialPresupuestosBase}
        initialCounts={initialCounts}
        crearPresupuestoMode={crearPresupuestoMode}
        catalogs={catalogs} // Pass catalogs
      />
    </Suspense>
  )
}
