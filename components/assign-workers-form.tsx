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
      console.log("=== INICIO PROCESO ASIGNACIÓN DE TRABAJADORES ===")
      console.log("taskId original:", taskId, typeof taskId);
      console.log("Trabajadores seleccionados (emails):", selectedWorkers);
      console.log("Trabajadores disponibles:", workers);

      // Convertir taskId a número
      const taskIdNum = parseInt(taskId, 10);
      console.log("taskId convertido:", taskIdNum);

      if (isNaN(taskIdNum)) {
        throw new Error(`ID de tarea inválido: ${taskId}`);
      }

      // Primero, eliminar todas las asignaciones existentes
      console.log("Eliminando asignaciones existentes para tarea ID:", taskIdNum);
      const deleteResult = await supabase.from("trabajadores_tareas").delete().eq("id_tarea", taskIdNum);
      console.log("Resultado de eliminar asignaciones previas:", deleteResult);

      // Luego, crear las nuevas asignaciones
      if (selectedWorkers.length > 0) {
        // Ya tenemos taskIdNum convertido arriba

        // Crear asignaciones directamente basadas en los IDs
        const newAssignments = [];

        // Para cada trabajador seleccionado
        for (const workerEmail of selectedWorkers) {
          // Buscar el trabajador por email
          const worker = workers.find(w => w.email === workerEmail);

          if (worker && worker.id) {
            console.log("Asignando trabajador:", worker.email, "con ID:", worker.id);

            newAssignments.push({
              id_tarea: taskIdNum,
              id_trabajador: worker.id
            });
          }
        }

        // Verificar si se crearon asignaciones
        if (newAssignments.length > 0) {
          console.log("Insertando asignaciones:", newAssignments);

          // Insertar las asignaciones
          const insertResult = await supabase
            .from("trabajadores_tareas")
            .insert(newAssignments);

          if (insertResult.error) {
            console.error("Error al insertar asignaciones:", insertResult.error);
            throw insertResult.error;
          } else {
            console.log("Asignaciones insertadas correctamente");
          }
        } else {
          console.warn("No se crearon asignaciones para insertar");
        }
      } else {
        console.log("No hay trabajadores seleccionados para asignar");
      }

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
    } catch (error) {
      console.error("Error al asignar trabajadores:", error)
      toast({
        title: "Error",
        description: "No se pudieron asignar los trabajadores",
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
