import { validateSessionAndGetUser } from '@/lib/auth-bridge'
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

  const presupuestoFinalId = searchParams.presupuesto_final_id

  if (!presupuestoFinalId) {
    return (
      <Card className="border-red-500 m-8">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p>Error: No se ha especificado un presupuesto final para facturar.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 2. Cargar Datos usando Loader (Service Role bypass RLS)
  const data = await getDatosNuevaFactura(presupuestoFinalId)

  if (!data.presupuesto) {
    return (
      <Card className="border-red-500 m-8">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p>Error: No se pudo cargar el presupuesto final.</p>
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
        estadosFactura={data.estadosFactura}
        nextCodigo={data.nextCodigo}
        initialItems={data.presupuesto.items}
      />
    </div>
  )
}
