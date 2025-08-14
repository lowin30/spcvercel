"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

interface Worker {
  id: string
  email: string
  color_perfil?: string
}

interface Supervisor {
  id: string
  email: string
}

interface AssignTaskFormProps {
  taskId: string
  currentWorkerId: string | null
  workers: Worker[]
  supervisors: Supervisor[]
  isAdmin: boolean
}

export function AssignTaskForm({ taskId, currentWorkerId, workers, supervisors, isAdmin }: AssignTaskFormProps) {
  const [workerId, setWorkerId] = useState(currentWorkerId || "unassigned")
  const [supervisorId, setSupervisorId] = useState("unassigned")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { supabase } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const updateData: any = {}

      if (workerId !== "unassigned") {
        updateData.id_asignado = workerId
      } else {
        updateData.id_asignado = null
      }

      const { error } = await supabase.from("tareas").update(updateData).eq("id", taskId)

      if (error) throw error

      toast({
        title: "Tarea asignada",
        description: "La tarea ha sido asignada correctamente",
      })

      router.push(`/dashboard/tareas/${taskId}`)
      router.refresh()
    } catch (error) {
      console.error("Error al asignar tarea:", error)
      toast({
        title: "Error",
        description: "No se pudo asignar la tarea",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="worker">Asignar trabajador</Label>
        <Select value={workerId} onValueChange={setWorkerId}>
          <SelectTrigger id="worker">
            <SelectValue placeholder="Seleccionar trabajador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Sin asignar</SelectItem>
            {workers.map((worker) => (
              <SelectItem key={worker.id} value={worker.id}>
                {worker.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isAdmin && (
        <div className="space-y-2">
          <Label htmlFor="supervisor">Asignar supervisor</Label>
          <Select value={supervisorId} onValueChange={setSupervisorId}>
            <SelectTrigger id="supervisor">
              <SelectValue placeholder="Seleccionar supervisor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Sin asignar</SelectItem>
              {supervisors.map((supervisor) => (
                <SelectItem key={supervisor.id} value={supervisor.id}>
                  {supervisor.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar asignación
      </Button>
    </form>
  )
}
