import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { getPresupuestoFinalById } from './loader'
import { PresupuestoFinalDetail } from '@/components/presupuestos-finales/presupuesto-final-detail'
import { notFound, redirect } from 'next/navigation'

export default async function PresupuestoFinalPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // 1. Validar Usuario (Service Role bypass auth check)
  // Esto asegura que Descope Auth + Supabase User están sync.
  const user = await validateSessionAndGetUser()

  // 🔒 GATEKEEPER PATTERN (SPC Protocol v80.1)
  // ESTRICTO: Solo admin puede ver presupuesto final completo.
  // Regla de Oro: Gatekeeper en el Servidor.
  if (user.rol !== 'admin') {
    console.log(`[GATEKEEPER] Acceso denegado a presupuestos-finales/${id} para usuario ${user.email} (rol: ${user.rol})`)
    redirect('/dashboard')
  }

  // 2. Fetch de datos usando Loader (Service Role bypass RLS)
  const data = await getPresupuestoFinalById(id)

  if (!data) {
    // Si el loader devuelve null, es que no existe o error grave.
    return notFound()
  }

  return (
    <div className="container mx-auto py-6">
      <PresupuestoFinalDetail
        presupuesto={data.presupuesto}
        items={data.items}
      />
    </div>
  )
}
