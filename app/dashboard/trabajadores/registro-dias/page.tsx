import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import RegistroDiasClient from "./registro-dias-client"

/**
 * REGISTRO DÍAS PAGE v109.0 (Server-Side Data Loading)
 * Server Component — valida sesión con Descope y pasa user data al cliente.
 */
export default async function RegistroGeneralPartesPage() {
  const user = await validateSessionAndGetUser()

  return (
    <RegistroDiasClient
      userDetails={{ id: user.id, rol: user.rol, email: user.email }}
    />
  )
}
