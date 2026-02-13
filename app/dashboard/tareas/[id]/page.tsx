import { getTareaDetail } from "@/app/dashboard/tareas/loader"
import { TaskDetailView } from "@/components/tasks/task-detail-view"
import { notFound } from "next/navigation"

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const data = await getTareaDetail(id)

    // Serializar datos si es necesario (Next.js server components to client components lo hace auto para JSON types)
    // fechas pueden requerir toISOString() si son objetos Date, pero Supabase devuelve strings.

    return <TaskDetailView initialData={data} />

  } catch (error) {
    console.error("Error loading task detail:", error)
    return notFound()
  }
}
