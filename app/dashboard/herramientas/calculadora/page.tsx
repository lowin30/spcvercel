import { getSession, getUserDetails } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { SobrecostoCalculator } from "@/components/sobrecosto-calculator"

export const dynamic = 'force-dynamic'
export default async function CalculadoraPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const userDetails = await getUserDetails()

  // Solo supervisores y admins pueden acceder a esta herramienta
  if (userDetails?.rol === "trabajador") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Calculadora de Sobrecostos</h1>
      <p className="text-muted-foreground">
        Utiliza esta herramienta para simular diferentes escenarios de sobrecostos y su impacto en la rentabilidad.
      </p>

      <SobrecostoCalculator />
    </div>
  )
}
