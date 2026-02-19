import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { redirect } from "next/navigation"
import { getNuevoEdificioFormData } from "./loader"
import NuevoEdificioClient from "./nuevo-edificio-client"

/**
 * NUEVO EDIFICIO PAGE v108.0 (Server-Side Data Loading)
 * Server Component que:
 * 1. Valida la sesión (Gatekeeper de Descope)
 * 2. Verifica rol admin
 * 3. Precarga administradores para el formulario
 */
export default async function NuevoEdificioPage() {
  // 1. EL GATEKEEPER (Bridge Protocol)
  const user = await validateSessionAndGetUser()

  // 2. RECHAZO INMEDIATO — solo admins crean edificios
  if (user.rol !== 'admin') {
    console.warn(`[GATEKEEPER] Acceso denegado a Nuevo Edificio para ${user.email} (Rol: ${user.rol})`)
    redirect("/dashboard?error=acceso_denegado")
  }

  // 3. PRECARGA DE DATOS (Server-Side con Service Role)
  const { administradores } = await getNuevoEdificioFormData()

  // 4. PASE VIP
  return <NuevoEdificioClient administradores={administradores} />
}
