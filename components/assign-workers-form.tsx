"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
// import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"; // Comentado temporalmente

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Worker {
  id: string
  email: string
  color_perfil?: string
}

interface AssignWorkersFormProps {
  taskId: string
  currentWorkerEmails: string[] // Cambiamos para usar emails en vez de IDs
  workers: Worker[]
  // Chat Integration Props (SPC v9.5)
  isChatVariant?: boolean
  onSuccess?: () => void
}

export function AssignWorkersForm({ taskId, currentWorkerEmails, workers, isChatVariant = false, onSuccess }: AssignWorkersFormProps) {
  console.log("AssignWorkersForm - Props recibidas:", { taskId, currentWorkerEmails, workersCount: workers.length })
  console.log("AssignWorkersForm - Workers disponibles:", workers)

  const [selectedWorkers, setSelectedWorkers] = useState<string[]>(currentWorkerEmails)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const router = useRouter()

  const handleWorkerToggle = (workerEmail: string) => {
    setSelectedWorkers((prev) => {
      if (prev.includes(workerEmail)) {
        return prev.filter((email) => email !== workerEmail)
      } else {
        return [...prev, workerEmail]
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      console.log("taskId original:", taskId, typeof taskId);
      const taskIdNum = parseInt(taskId, 10);

      if (isNaN(taskIdNum)) {
        throw new Error(`ID de tarea inválido: ${taskId}`);
      }

      // Obtener IDs de trabajadores (las props vienen como emails, buscamos los IDs en la lista de workers)
      const selectedWorkerIds = selectedWorkers.map(email => {
        const w = workers.find(worker => worker.email === email);
        return w?.id;
      }).filter(Boolean) as string[];

      const { batchUpdateWorkersAction } = await import('@/app/dashboard/tareas/actions');
      const res = await batchUpdateWorkersAction(taskIdNum, selectedWorkerIds);

      if (!res.success) throw new Error(res.message);

      toast({
        title: "Trabajadores asignados",
        description: "Los trabajadores han sido asignados correctamente",
      })

      // Chat variant: trigger callback
      if (isChatVariant && onSuccess) {
        onSuccess()
      } else {
        router.push(`/dashboard/tareas/${taskId}`)
        router.refresh()
      }
    } catch (error: any) {
      console.error("Error al asignar trabajadores:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudieron asignar los trabajadores",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Label>Seleccionar trabajadores</Label>
        <div className="border rounded-md p-4 space-y-2 max-h-[300px] overflow-y-auto">
          {workers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay trabajadores disponibles</p>
          ) : (
            // Imprimir información sobre trabajadores disponibles
            console.log('Renderizando', workers.length, 'trabajadores') ||
            workers.map((worker) => (
              <div key={worker.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`worker-${worker.id}`}
                  checked={selectedWorkers.includes(worker.email)}
                  onCheckedChange={() => handleWorkerToggle(worker.email)}
                />
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: worker.color_perfil }} />
                  <Label htmlFor={`worker-${worker.id}`} className="text-sm font-normal cursor-pointer">
                    {worker.email}
                  </Label>
                </div>
              </div>
            ))
          )}
        </div>
        <p className="text-sm text-muted-foreground">Trabajadores seleccionados: {selectedWorkers.length}</p>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar asignaciones
      </Button>
    </form>
  )
}
