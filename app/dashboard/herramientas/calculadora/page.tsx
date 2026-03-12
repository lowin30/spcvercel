import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { redirect } from "next/navigation"
import { SobrecostoCalculator } from "@/components/sobrecosto-calculator"

export const dynamic = 'force-dynamic'
export default async function CalculadoraPage() {
  const user = await validateSessionAndGetUser()

  // solo supervisores y admins pueden acceder a esta herramienta
  if (user.rol === "trabajador") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">calculadora de sobrecostos</h1>
      <p className="text-muted-foreground">
        utiliza esta herramienta para simular diferentes escenarios de sobrecostos y su impacto en la rentabilidad.
      </p>

      <SobrecostoCalculator />
    </div>
  )
}
