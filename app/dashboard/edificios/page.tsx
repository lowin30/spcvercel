import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { getEdificiosData } from "./loader"
import EdificiosPageClient from "./edificios-page-client"

/**
 * EDIFICIOS PAGE v107.0 (Server-Side Data Loading)
 * Server Component que:
 * 1. Valida la sesión (Gatekeeper de Descope)
 * 2. Precarga edificios y administradores con supabaseAdmin (bypasea RLS)
 * 3. Pasa los datos precargados al Client Component
 *
 * Nota: A diferencia de Ajustes y Configuración, Edificios NO rechaza
 * a no-admins. Supervisores y trabajadores también ven edificios,
 * pero solo admins ven el botón "Nuevo Edificio".
 */
export default async function EdificiosPage() {
  // 1. EL GATEKEEPER (Bridge Protocol)
  const user = await validateSessionAndGetUser()

  // 2. PRECARGA DE DATOS (Server-Side con Service Role)
  const { edificios, administradores } = await getEdificiosData()

  // 3. PASE VIP con datos precargados
  return (
    <EdificiosPageClient
      initialEdificios={edificios}
      initialAdministradores={administradores}
      userRol={user.rol}
    />
  )
}
