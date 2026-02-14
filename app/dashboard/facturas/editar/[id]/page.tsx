import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { getInvoiceForEdit } from './loader'
import { InvoiceForm } from '@/components/invoice-form'
import { saveInvoice } from './actions'
import { notFound, redirect } from 'next/navigation'

export default async function EditarFacturaPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // 1. Validar Usuario (Service Role bypass auth check)
  const user = await validateSessionAndGetUser()

  // 🔒 GATEKEEPER PATTERN (SPC Protocol v82.2)
  // ESTRICTO: Solo admin puede editar facturas.
  if (user.rol !== 'admin') {
    console.log(`[GATEKEEPER] Acceso denegado a editar factura ${id} para usuario ${user.email}`)
    redirect('/dashboard')
  }

  // 2. Fetch de datos usando Loader (Service Role bypass RLS)
  const data = await getInvoiceForEdit(id)

  if (!data) {
    return notFound()
  }

  return (
    <div className="space-y-6 container mx-auto py-6">
      <div className="encabezado-responsive">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Editar Factura</h1>
          <p className="text-sm text-muted-foreground">
            Modificando la factura con código: {data.factura.code || `ID: ${data.factura.id}`}
          </p>
        </div>
      </div>
      <InvoiceForm
        presupuestos={data.presupuestos}
        factura={data.factura}
        items={data.items}
        onSave={saveInvoice}
      />
    </div>
  )
}