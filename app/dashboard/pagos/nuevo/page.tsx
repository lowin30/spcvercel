import { Suspense } from "react"
import { redirect, notFound } from "next/navigation"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { PaymentForm } from "@/components/payment-form"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// Loader de servidor para datos de la factura
async function getInvoiceForPayment(facturaId: string) {
  // Intentar búsqueda por UUID original
  const { data, error } = await supabaseAdmin
    .from('facturas')
    .select(`
      id, 
      code, 
      total, 
      total_pagado,
      saldo_pendiente,
      presupuestos_finales (
        id,
        edificios (
          nombre
        )
      )
    `)
    .eq('id', facturaId)
    .single()

  if (error || !data) {
    // Si falla, intentar por ID numérico si aplica (algunas tablas usan integer)
    const idNum = parseInt(facturaId)
    if (!isNaN(idNum)) {
      const { data: dataNum } = await supabaseAdmin
        .from('facturas')
        .select(`
          id, 
          code, 
          total, 
          total_pagado,
          saldo_pendiente,
          presupuestos_finales (
            id,
            edificios (
              nombre
            )
          )
        `)
        .eq('id', idNum)
        .single()
      if (dataNum) return dataNum
    }
    return null
  }
  return data
}

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: { factura_id?: string }
}) {
  // 1. Gatekeeper: Solo Admin (Protocolo SPC v82.1)
  const user = await validateSessionAndGetUser()
  if (user.rol !== 'admin') {
    redirect("/dashboard?error=acceso_restringido_pagos")
  }

  const { factura_id } = await searchParams

  if (!factura_id) {
    redirect("/dashboard/facturas")
  }

  // 2. Fetch de Datos en el Servidor
  const facturaData = await getInvoiceForPayment(factura_id)

  if (!facturaData) {
    return notFound()
  }

  // Normalizar datos para el formulario
  const total = Number(facturaData.total || 0)
  const totalPagado = Number(facturaData.total_pagado || 0)
  const saldoPendiente = facturaData.saldo_pendiente !== null
    ? Number(facturaData.saldo_pendiente)
    : Math.max(0, total - totalPagado)

  // Extraer nombre del edificio de la relación anidada
  const pf = Array.isArray(facturaData.presupuestos_finales)
    ? facturaData.presupuestos_finales[0]
    : facturaData.presupuestos_finales

  const edificioNombre = pf?.edificios?.nombre || "N/A"

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link href={`/dashboard/facturas/${facturaData.id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver a la Factura
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Registrar Pago</h1>
          <p className="text-muted-foreground">
            Factura {facturaData.code} - {edificioNombre}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo Pago</CardTitle>
          <CardDescription>
            Registre la transacción para saldar la factura {facturaData.code}.
          </CardDescription>
        </CardHeader>

        <div className="p-6 border-t border-gray-100 bg-muted/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Monto total</p>
              <p className="text-xl font-bold">${total.toLocaleString('es-AR')}</p>
            </div>
            <div className="space-y-1 border-x border-gray-100">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total pagado</p>
              <p className="text-xl font-bold text-green-600">${totalPagado.toLocaleString('es-AR')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Saldo pendiente</p>
              <p className="text-xl font-bold text-blue-600">${saldoPendiente.toLocaleString('es-AR')}</p>
            </div>
          </div>
        </div>

        <div className="p-6 pt-2">
          <Suspense fallback={
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }>
            <PaymentForm
              facturaId={facturaData.id.toString()}
              montoTotalFactura={total}
              saldoPendiente={saldoPendiente}
            />
          </Suspense>
        </div>
      </Card>
    </div>
  )
}
