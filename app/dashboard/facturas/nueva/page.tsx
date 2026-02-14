import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { redirect } from 'next/navigation'
import { getDatosNuevaFactura } from './loader'
import { FacturaNuevaForm } from '@/components/facturas/factura-nueva-form'
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default async function NuevaFacturaPage({
  searchParams,
}: {
  searchParams: { presupuesto_final_id?: string }
}) {
  // 1. Validar Usuario y Sesión (Service Role bypass)
  const user = await validateSessionAndGetUser()

  // 🔒 GATEKEEPER PATTERN (SPC Protocol v80.0)
  // Solo admin puede crear facturas (acceso a Service Role para generar codigo y lista de clientes).
  if (user.rol !== 'admin') {
    // Redirigir silenciosamente o mostrar error
    redirect('/dashboard')
  }

  const presupuestoFinalId = searchParams.presupuesto_final_id

  // 2. Cargar Datos usando Loader (Service Role bypass RLS)
  // Desbloqueo: Pasamos el ID (puede ser undefined) y dejamos que el loader decida.
  const data = await getDatosNuevaFactura(presupuestoFinalId)

  // Si se pidió un ID específico y no existe, mostrar error (o fallback a selector)
  if (presupuestoFinalId && !data.presupuesto) {
    return (
      <Card className="border-red-500 m-8">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p>Error: No se pudo cargar el presupuesto final solicitado.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Nueva Factura</h1>
      <FacturaNuevaForm
        presupuesto={data.presupuesto}
        presupuestosDisponibles={data.presupuestosDisponibles} // Protocol v82.5
        estadosFactura={data.estadosFactura || []}
        nextCodigo={data.nextCodigo || "fac000000"}
        initialItems={data.presupuesto?.items || []}
        edificios={data.edificios}
        tareas={data.tareas}
      />
    </div>
  )
}
