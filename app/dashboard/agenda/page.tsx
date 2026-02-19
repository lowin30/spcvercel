import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { getAgendaData } from "./loader"
import AgendaPageClient from "./agenda-page-client"

/**
 * AGENDA PAGE v109.0 (Server-Side Data Loading)
 * Server Component que:
 * 1. Valida la sesión con Descope
 * 2. Lee searchParams para filtros
 * 3. Precarga tareas, edificios, estados y usuarios según rol
 * 4. Pasa datos al Client Component
 */
export default async function AgendaPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await validateSessionAndGetUser()

  const resolvedParams = await (searchParams || Promise.resolve({}))

  const { tareas, tareasCalendar, edificios, estadosTareas, usuarios } = await getAgendaData({
    userId: user.id,
    userRol: user.rol,
    edificioId: resolvedParams?.edificio as string | undefined,
    estadoTarea: resolvedParams?.estado as string | undefined,
    fechaDesde: resolvedParams?.desde as string | undefined,
    fechaHasta: resolvedParams?.hasta as string | undefined,
    asignadoId: resolvedParams?.asignado as string | undefined,
  })

  return (
    <AgendaPageClient
      userDetails={{ id: user.id, email: user.email, rol: user.rol }}
      initialTareas={tareas}
      initialTareasCalendar={tareasCalendar}
      initialEdificios={edificios}
      initialEstadosTareas={estadosTareas}
      initialUsuarios={usuarios}
    />
  )
}
