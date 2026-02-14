import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { getCandidateTasks, getSupervisores } from './loader'
import { LiquidacionesNuevaForm } from '@/components/liquidaciones/liquidaciones-nueva-form'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function NuevaLiquidacionPage() {
  // 1. Gatekeeper: Validar sesión y rol en el servidor
  const user = await validateSessionAndGetUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Bloqueo estricto a trabajadores (aunque el Loader filtraría todo, mejor bloquear navegación)
  if (user.rol === 'trabajador') {
    redirect('/dashboard')
  }

  // 3. Fetch de Candidatos Seguro (Server-Side)
  // El loader aplica los filtros de rol:
  // - Admin: Ve todas las tareas aprobadas + finalizadas - liquidadas
  // - Supervisor: Ve SOLO sus tareas asignadas que cumplan condición
  const candidates = await getCandidateTasks(user.id, user.rol)

  // 4. Fetch de datos auxiliares (Solo para Admin)
  let supervisores: { id: string; email: string }[] = []
  if (user.rol === 'admin') {
    supervisores = await getSupervisores() || []
  }

  // 5. Renderizado con datos iniciales inyectados
  return (
    <LiquidacionesNuevaForm
      initialCandidates={candidates}
      userRole={user.rol}
      supervisores={supervisores}
      currentUserId={user.id}
    />
  )
}