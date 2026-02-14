import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { getFacturaById } from './loader'
import { FacturaDetail } from '@/components/facturas/factura-detail'
import { notFound, redirect } from 'next/navigation'

export default async function InvoicePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // 1. Validar Usuario (Service Role bypass auth check)
  // Esto asegura que Descope Auth + Supabase User están sync.
  const user = await validateSessionAndGetUser()

  // 🔒 GATEKEEPER PATTERN (SPC Protocol v82.1)
  // ESTRICTO: Solo admin puede ver detalle de factura (datos sensibles/fiscales).
  if (user.rol !== 'admin') {
    console.log(`[GATEKEEPER] Acceso denegado a facturas/${id} para usuario ${user.email} (rol: ${user.rol})`)
    redirect('/dashboard')
  }

  // 2. Fetch de datos usando Loader (Service Role bypass RLS)
  const data = await getFacturaById(id)

  if (!data) {
    // Si el loader devuelve null, es que no existe o error grave.
    return notFound()
  }

  return (
    <div className="container mx-auto py-6">
      <FacturaDetail
        factura={data.factura}
        items={data.items}
        extras={data.extras}
      />
    </div>
  )
}