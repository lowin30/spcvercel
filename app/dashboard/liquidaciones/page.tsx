import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { getLiquidaciones, getSupervisores } from './loader'
import { LiquidacionesClientWrapper } from '@/components/liquidaciones/liquidaciones-client-wrapper'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function LiquidacionesPage() {
  // 1. Gatekeeper: Validar sesión y rol en el servidor
  const user = await validateSessionAndGetUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Bloqueo estricto a trabajadores
  if (user.rol === 'trabajador') {
    redirect('/dashboard')
  }

  // 3. Fetch de datos seguro (Server-Side)
  // El loader aplica los filtros y sanitización DTO según el rol
  const liquidaciones = await getLiquidaciones(user.id, user.rol)

  // 4. Fetch de datos auxiliares (Solo para Admin)
  let supervisores: { id: string; email: string }[] = []
  if (user.rol === 'admin') {
    supervisores = await getSupervisores() || []
  }

  // 5. Renderizado con datos iniciales inyectados
  return (
    <LiquidacionesClientWrapper
      initialLiquidaciones={liquidaciones}
      userRole={user.rol}
      supervisores={supervisores}
    />
  )
}