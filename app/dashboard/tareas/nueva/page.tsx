"use client"

import { useRouter } from "next/navigation"
import { TaskWizard } from "@/components/tasks/task-wizard"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function NuevaTareaPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" className="mr-2" onClick={() => router.push("/dashboard/tareas")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Nueva Tarea</h1>
      </div>

      <TaskWizard
        onSuccess={(taskId) => {
          // Si el usuario quiere ver detalle de tarea, lo enviamos allí. 
          // O podríamos volver al listado. 
          // El Wizard ya hace un router.push por defecto si no le pasamos onSuccess personalizado que NO haga push.
          // Pero TaskWizard.tsx linea 226 ejecuta onSuccess O un router.push.
          // Si pasamos onSuccess, el wizard NO hace push.
          router.push(`/dashboard/tareas/${taskId}`)
          router.refresh()
        }}
      />
    </div>
  )
}