import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { redirect } from "next/navigation"
import { getAjustesData } from "./loader"
import AjustesClient from "./ajustes-client"

/**
 * AJUSTES PAGE v105.0 (Server-Side Data Loading)
 * Server Component que:
 * 1. Valida la sesión (Gatekeeper de Descope)
 * 2. Precarga los datos con supabaseAdmin (Service Role → Bypasea RLS)
 * 3. Pasa los datos precargados al Client Component
 */
export default async function AjustesPage() {
  // 1. EL GATEKEEPER (Bridge Protocol)
  const user = await validateSessionAndGetUser()

  // 2. RECHAZO INMEDIATO
  if (user.rol !== 'admin') {
    console.warn(`[GATEKEEPER] Acceso denegado a Ajustes para ${user.email} (Rol: ${user.rol})`)
    redirect("/dashboard?error=acceso_denegado_ajustes")
  }

  // 3. PRECARGA DE DATOS (Server-Side con Service Role)
  const { facturas, administradores } = await getAjustesData()

  // 4. PASE VIP con datos precargados
  return (
    <AjustesClient
      user={user}
      initialFacturas={facturas}
      initialAdministradores={administradores}
    />
  )
}
