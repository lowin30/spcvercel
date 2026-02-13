
import { Suspense } from "react"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { getPresupuestos, getKpisAdmin, getAdministradores } from "./loader"
import PresupuestosClientWrapper from "./client-wrapper"
import { Loader2 } from "lucide-react"

export default async function PresupuestosPage() {
  // 1. Auth & Session (Server Side)
  const user = await validateSessionAndGetUser()
  const { rol } = user;

  // 2. Data Fetching (Server Side)
  // Se ejecuta en paralelo para máxima velocidad
  const [presupuestos, kpisData, administradores] = await Promise.all([
    getPresupuestos(rol),
    getKpisAdmin(rol),
    getAdministradores(rol)
  ])

  // 3. Render Client Wrapper with Data
  return (
    <div className="container mx-auto py-6">
      <PresupuestosClientWrapper
        initialPresupuestos={presupuestos || []}
        kpisData={kpisData}
        administradores={administradores || []}
        userRole={rol}
        userDetails={user} // Pasamos el usuario completo por compatibilidad
      />
    </div>
  )
}
