import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { redirect } from "next/navigation"
import { getAuditoriaBalancesData } from "./loader"
import AuditoriaClient from "./auditoria-client"

export const dynamic = 'force-dynamic'

/**
 * AUDITORIA PAGE (SPC PLATINUM V3.0)
 * Server Component con Gatekeeper Estricto:
 * 1. Valida sesion en servidor.
 * 2. Bloquea todo rol distinto de 'admin' con redirect inmediato.
 * 3. Ejecuta getAuditoriaBalancesData con supabaseAdmin (Service Role).
 */
export default async function AuditoriaPage() {
  const user = await validateSessionAndGetUser()

  if (!user || user.rol !== 'admin') {
    console.warn(`[GATEKEEPER] Acceso denegado a Auditoria para usuario ${user?.email} con rol: ${user?.rol}`)
    redirect("/dashboard?error=acceso_denegado_auditoria")
  }

  const data = await getAuditoriaBalancesData()

  return (
    <AuditoriaClient
      user={user}
      initialBalances={data.balances}
      initialSupervisores={data.supervisores}
      initialAdministradores={data.administradores}
      initialLogs={data.logs}
    />
  )
}
