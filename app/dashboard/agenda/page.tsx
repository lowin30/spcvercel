import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { getAgendaDataV2 } from "@/lib/tools/partes/loader"
import AgendaPageClient from "./agenda-page-client"
import { format, startOfMonth, endOfMonth } from "date-fns"

/**
 * AGENDA PAGE PLATINUM v2
 * Server Component que centraliza la orquestación de datos
 */
export default async function AgendaPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await validateSessionAndGetUser()
  const resolvedParams = (await (searchParams || Promise.resolve({}))) as any

  // Rango de fechas por defecto (mes actual)
  const hoy = new Date()
  const fechaDesde = resolvedParams?.desde || format(startOfMonth(hoy), 'yyyy-MM-dd')
  const fechaHasta = resolvedParams?.hasta || format(endOfMonth(hoy), 'yyyy-MM-dd')

  const data = await getAgendaDataV2({
    userId: user.id,
    userRol: user.rol,
    edificioId: resolvedParams?.edificio ? Number(resolvedParams.edificio) : undefined,
    trabajadorId: resolvedParams?.asignado as string | undefined,
    fechaDesde: fechaDesde as string,
    fechaHasta: fechaHasta as string
  })

  return (
    <AgendaPageClient
      userDetails={{ id: user.id, email: user.email, rol: user.rol }}
      data={data}
    />
  )
}
