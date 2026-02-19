import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { getGastosData } from "./loader"
import GastosPageClient from "./gastos-page-client"

/**
 * GASTOS PAGE v109.0 (Server-Side Data Loading)
 * Server Component que:
 * 1. Valida la sesión con Descope
 * 2. Precarga gastos, jornales, tareas y liquidaciones según rol
 * 3. Pasa datos al Client Component
 */
export default async function GastosPage() {
  const user = await validateSessionAndGetUser()

  const { gastos, jornalesConSalario, lastLiquidation, tareas } = await getGastosData(user.id, user.rol)

  return (
    <GastosPageClient
      userDetails={{ id: user.id, email: user.email, rol: user.rol }}
      initialGastos={gastos}
      initialJornales={jornalesConSalario}
      initialLastLiquidation={lastLiquidation}
      initialTareas={tareas}
    />
  )
}
