import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { getInvoiceForEdit } from './loader'
import { EditarFacturaClient } from './editar-factura-client'
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
  if (user.rol !== 'admin') {
    redirect('/dashboard')
  }

  // 2. Fetch de datos usando Loader
  const data = await getInvoiceForEdit(id)

  if (!data) {
    return notFound()
  }

  return (
    <div className="min-h-screen bg-transparent">
      <EditarFacturaClient 
        data={data} 
        saveInvoiceAction={saveInvoice} 
      />
    </div>
  )
}