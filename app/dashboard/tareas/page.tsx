import { Suspense } from "react"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { getTareasData, getRecordatorios, getTareasParaPresupuesto, getPresupuestosBase } from "@/app/dashboard/tareas/loader"
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

export default async function TareasPage({ searchParams }: Props) {
  // 1. Identity Bridge: Validar Sesión y Obtener Usuario
  // Si falla, validateSessionAndGetUser lanzará error o redirect (según implementación, aqui lanza error)
  // Next.js capturará el error en error.tsx, o podemos usar try/catch para redirect.
  const user = await validateSessionAndGetUser()

  // 2. Parse Search Params
  const params = await searchParams
  const crearPresupuestoMode = params.crear_presupuesto === 'true'

  let initialTareas = []
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
      initialTareas = await getTareasData()
    }
  } catch (error) {
    console.error("Critical Data Fetch Error:", error)
    // Podríamos lanzar error para mostrar 'error.tsx'
    // throw error 
    // O devolver vacío para que la UI muestre "No data"
    initialTareas = []
  }

  // 4. Fetch Recordatorios (Parallelizable? Yes, but simple await is fine for now)
  const recordatorios = await getRecordatorios(user.rol, user.id)

  // 5. Render Client Component with Hydrated Data
  return (
    <Suspense fallback={<TareasLoading />}>
      <TareasClientPage
        initialTareas={initialTareas}
        initialUserDetails={user}
        initialRecordatorios={recordatorios}
        initialPresupuestosBase={initialPresupuestosBase}
        crearPresupuestoMode={crearPresupuestoMode}
      />
    </Suspense>
  )
}
