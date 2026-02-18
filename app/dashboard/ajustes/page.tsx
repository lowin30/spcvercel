import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { redirect } from "next/navigation"
import AjustesClient from "./ajustes-client"

/**
 * AJUSTES PAGE v94.8 (Bridge Protocol)
 * Server Component que actúa como Gatekeeper Primario.
 * Solo permite el acceso a usuarios con rol 'admin'.
 */
export default async function AjustesPage() {
  // 1. EL GATEKEEPER (Bridge Protocol)
  const user = await validateSessionAndGetUser()

  // 2. RECHAZO INMEDIATO
  if (user.rol !== 'admin') {
    console.warn(`[GATEKEEPER] Acceso denegado a Ajustes para ${user.email} (Rol: ${user.rol})`)
    redirect("/dashboard?error=acceso_denegado_ajustes")
  }

  // 3. PASE VIP
  // Si llegamos acá, es Admin. Le pasamos el usuario al cliente y renderizamos.
  return <AjustesClient user={user} />
}
