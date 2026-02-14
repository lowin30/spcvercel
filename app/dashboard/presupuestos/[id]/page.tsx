import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { getPresupuestoById } from './loader'
import { PresupuestoDetail } from '@/components/presupuestos/presupuesto-detail'
import { notFound } from 'next/navigation'

export default async function PresupuestoPage({
  params
}: {
  params: { id: string }
}) {
  // 1. Validar Usuario y Sesión (Service Role bypass auth check)
  // Esto asegura que Descope Auth + Supabase User están sync.
  const user = await validateSessionAndGetUser()

  // 2. Fetch de datos usando Loader (Service Role bypass RLS)
  const presupuesto = await getPresupuestoById(params.id)

  if (!presupuesto) {
    return notFound()
  }

  // 3. Render
  // Pasamos userDetails para permisos en UI (aunque protected por loader si quisieramos RBAC estricto antes)
  // En este caso, validateSessionAndGetUser devuelve usuario valido, la logica de permisos (Admin vs Supervisor) 
  // podria agregarse aqui si fuera necesario, pero por ahora confiamos en la UI o agregamos check si es critico.

  // Para presupuestos, cualquier usuario con acceso al sistema puede VER los detalles (por ahora).
  // Si se requiere restricción, agregar: if (user.rol !== 'admin' && !presupuesto.isOwner...)

  return (
    <div className='container mx-auto py-6'>
      <PresupuestoDetail
        presupuesto={presupuesto}
        userDetails={user}
      />
    </div>
  )
}
