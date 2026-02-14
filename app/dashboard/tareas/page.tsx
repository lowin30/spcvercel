import { Suspense } from "react"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"

// 1. Loader Imports
import {
  getTareasData,
  getRecordatorios,
  getTareasParaPresupuesto,
  getPresupuestosBase
} from "@/app/dashboard/tareas/loader"
import { supabaseAdmin } from "@/lib/supabase-admin" // Direct fetch for catalogs or new loader function?
// Let's use direct admin fetch here for brevity or better, a dedicated loader function
import { getCatalogsForWizard } from "@/app/dashboard/tareas/loader" // Reuse this if possible or create new.
// getCatalogsForWizard returns { administradores, supervisores, trabajadores }. Missing Edificios linked to Admin.

async function getFiltersCatalogs() {
  const [admins, eds, sups] = await Promise.all([
    supabaseAdmin.from('administradores').select('id, nombre').eq('estado', 'activo').order('nombre'),
    supabaseAdmin.from('vista_edificios_completa').select('id, nombre, id_administrador').order('nombre'),
    supabaseAdmin.from('usuarios').select('id, email, nombre, code').eq('rol', 'supervisor')
  ]);

  return {
    administradores: admins.data || [],
    edificios: eds.data || [],
    supervisores: sups.data || []
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
    search: params.search as string
  }

  let initialTareas: any[] = []
  let initialPresupuestosBase = {}

  // 3. Data Fetching (Server Side) via Loader (Bypass RLS controlled)
  try {
    if (crearPresupuestoMode) {
      initialTareas = await getTareasParaPresupuesto()
      if (initialTareas.length > 0) {
        const ids = initialTareas.map(t => t.id)
        initialPresupuestosBase = await getPresupuestosBase(ids)
      }
    } else {
      // Pass filters to loader
      initialTareas = await getTareasData(filters)
    }
  } catch (error) {
    console.error("Critical Data Fetch Error:", error)
    initialTareas = []
  }

  // 4. Fetch Recordatorios
  const recordatorios = await getRecordatorios(user.rol, user.id)

  // 5. Fetch Catalogs for Filters
  const catalogs = await getFiltersCatalogs()

  // 5. Render Client Component with Hydrated Data
  return (
    <Suspense fallback={<TareasLoading />}>
      <TareasClientPage
        initialTareas={initialTareas}
        initialUserDetails={user}
        initialRecordatorios={recordatorios}
        initialPresupuestosBase={initialPresupuestosBase}
        crearPresupuestoMode={crearPresupuestoMode}
        catalogs={catalogs} // Pass catalogs
      />
    </Suspense>
  )
}
