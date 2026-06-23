import { Suspense } from "react"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { getEdificiosData } from "./loader"
import EdificiosPageClient from "./edificios-page-client"

export const dynamic = 'force-dynamic';

/**
 * EDIFICIOS PAGE v140.0 (Protocolo Triple Barrera)
 * Server Component que carga datos con RLS y el objeto Permission.
 */
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function EdificiosPage(props: {
  searchParams: SearchParams
}) {
  // 1. EL GATEKEEPER (Bridge Protocol)
  const user = await validateSessionAndGetUser()
  const searchParams = await props.searchParams

  const search = typeof searchParams.search === 'string' ? searchParams.search : undefined
  const id_administrador = typeof searchParams.id_administrador === 'string' ? searchParams.id_administrador : undefined
  const estado = typeof searchParams.estado === 'string' ? searchParams.estado : undefined

  // 2. PRECARGA DE DATOS SEGUROS
  const { edificios, administradores, permissions } = await getEdificiosData({ search, id_administrador, estado })

  // 3. PASE VIP con datos precargados
  return (
    <Suspense fallback={<div className="p-12 text-center animate-pulse text-muted-foreground">cargando edificios...</div>}>
      <EdificiosPageClient
        initialEdificios={edificios}
        initialAdministradores={administradores}
        userRol={user.rol}
        permissions={permissions}
      />
    </Suspense>
  )
}
