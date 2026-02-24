import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { getEdificiosData } from "./loader"
import EdificiosPageClient from "./edificios-page-client"

export const dynamic = 'force-dynamic';

/**
 * EDIFICIOS PAGE v140.0 (Protocolo Triple Barrera)
 * Server Component que carga datos con RLS y el objeto Permission.
 */
export default async function EdificiosPage() {
  // 1. EL GATEKEEPER (Bridge Protocol)
  const user = await validateSessionAndGetUser()

  // 2. PRECARGA DE DATOS SEGUROS
  const { edificios, administradores, permissions } = await getEdificiosData()

  // 3. PASE VIP con datos precargados
  return (
    <EdificiosPageClient
      initialEdificios={edificios}
      initialAdministradores={administradores}
      userRol={user.rol}
      permissions={permissions}
    />
  )
}
