import { validateSessionAndGetUser } from "@/lib/supabase-server"
import { createClient } from "@/lib/supabase-server"
import { redirect, notFound } from "next/navigation"
import { AssignSupervisorClient } from "./assign-supervisor-client"

interface AssignSupervisorPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AssignSupervisorPage({ params }: AssignSupervisorPageProps) {
  const { id } = await params

  // 1. Validar sesión y usuario (Nivel Servidor V81.0)
  const { user, profile } = await validateSessionAndGetUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Verificar permisos - solo admin puede asignar supervisor
  if (profile?.rol !== "admin") {
    redirect("/dashboard")
  }

  const supabase = await createClient()

  // 3. Carga de datos en paralelo (Nivel Servidor)
  const [tareaResult, supervisorActualResult, supervisoresResult] = await Promise.all([
    supabase
      .from("vista_tareas_completa")
      .select("id, titulo")
      .eq("id", id)
      .single(),
    supabase
      .from("supervisores_tareas")
      .select("id_supervisor")
      .eq("id_tarea", id)
      .maybeSingle(),
    supabase
      .from("usuarios")
      .select("id, email")
      .eq("rol", "supervisor")
  ])

  if (tareaResult.error || !tareaResult.data) {
    return notFound()
  }

  // 4. Renderizar componente cliente con datos inyectados
  return (
    <AssignSupervisorClient
      taskId={id}
      tarea={tareaResult.data}
      supervisorActual={supervisorActualResult.data}
      supervisores={supervisoresResult.data || []}
    />
  )
}
