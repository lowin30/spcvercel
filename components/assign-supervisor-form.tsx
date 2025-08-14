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

interface Supervisor {
  id: string
  email: string
}

interface AssignSupervisorFormProps {
  taskId: string
  currentSupervisorId: string | null
  supervisors: Supervisor[]
}

export function AssignSupervisorForm({ taskId, currentSupervisorId, supervisors }: AssignSupervisorFormProps) {
  const [supervisorId, setSupervisorId] = useState(currentSupervisorId || "unassigned")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { supabase } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Primero, eliminar cualquier asignación existente
      await supabase.from("supervisores_tareas").delete().eq("id_tarea", taskId)

      // Luego, si se seleccionó un supervisor, crear la nueva asignación
      if (supervisorId !== "unassigned") {
        const { error } = await supabase.from("supervisores_tareas").insert({
          id_tarea: taskId,
          id_supervisor: supervisorId,
        })

        if (error) throw error
      }

      toast({
        title: "Supervisor asignado",
        description: "El supervisor ha sido asignado correctamente",
      })

      router.push(`/dashboard/tareas/${taskId}`)
      router.refresh()
    } catch (error) {
      console.error("Error al asignar supervisor:", error)
      toast({
        title: "Error",
        description: "No se pudo asignar el supervisor",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="supervisor">Seleccionar supervisor</Label>
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

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar asignación
      </Button>
    </form>
  )
}
