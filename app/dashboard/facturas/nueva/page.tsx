import { createSsrServerClient } from '@/lib/ssr-server'
import { FacturaNuevaForm } from '@/components/facturas/factura-nueva-form'
import { redirect } from 'next/navigation'
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default async function NuevaFacturaPage({
  searchParams,
}: {
  searchParams: { presupuesto_final_id?: string }
}) {
  const supabase = await createSsrServerClient()
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

  // 1. Cargar Presupuesto Final
  const { data: presupuestoData, error: presupuestoError } = await supabase
    .from("presupuestos_finales")
    .select("*")
    .eq("id", presupuestoFinalId)
    .single()

  if (presupuestoError || !presupuestoData) {
    console.error("Error cargando presupuesto:", presupuestoError)
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

  // 2. Cargar Cliente
  let cliente = undefined
  if (presupuestoData.cliente_id) {
    const { data: clienteData } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", presupuestoData.cliente_id)
      .single()
    if (clienteData) cliente = clienteData
  }

  // 3. Cargar Items (desde tabla items o items_presupuesto según corresponda)
  // La lógica original buscaba en tabla 'items' por id_presupuesto (que es el ID del presupuesto final en este contexto según logica anterior)
  // OJO: id_presupuesto en items suele referir al presupuesto FINAL.
  const { data: itemsData } = await supabase
    .from("items")
    .select("*")
    .eq("id_presupuesto", presupuestoFinalId)

  const items = itemsData || []

  // 4. Estados Factura
  const { data: estadosData } = await supabase
    .from("estados_facturas")
    .select("*")
    .order("orden")

  const estadosFactura = estadosData || []

  // 5. Generar Siguiente Código
  let nextCodigo = "fac000001"
  const { data: facturasExistentes } = await supabase
    .from("facturas")
    .select("code")

  if (facturasExistentes && facturasExistentes.length > 0) {
    const numeros = facturasExistentes
      .map(f => f.code)
      .filter((c): c is string => typeof c === 'string' && c.startsWith("fac"))
      .map(c => parseInt(c.substring(3), 10))
      .filter(n => !isNaN(n))

    if (numeros.length > 0) {
      const last = Math.max(...numeros)
      nextCodigo = `fac${(last + 1).toString().padStart(6, '0')}`
    }
  }

  // Estructurar props
  const presupuestoCompleto = {
    ...presupuestoData,
    cliente,
    items
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Nueva Factura</h1>
      <FacturaNuevaForm
        presupuesto={presupuestoCompleto}
        estadosFactura={estadosFactura}
        nextCodigo={nextCodigo}
        initialItems={items}
      />
    </div>
  )
}


