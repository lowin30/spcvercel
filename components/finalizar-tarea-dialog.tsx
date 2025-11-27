"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface FinalizarTareaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tareaId: number
  onFinalizada: () => void
}

export function FinalizarTareaDialog({
  open,
  onOpenChange,
  tareaId,
  onFinalizada
}: FinalizarTareaDialogProps) {
  const [resumen, setResumen] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleFinalizar = async () => {
    if (!resumen.trim()) {
      toast.error("Debes escribir un resumen de lo realizado")
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      // 1. Guardar comentario con resumen
      const { error: commentError } = await supabase
        .from("comentarios")
        .insert({
          contenido: `TAREA FINALIZADA\n\nResumen: ${resumen.trim()}`,
          id_tarea: tareaId,
          id_usuario: user.id,
        })

      if (commentError) throw commentError

      // 2. Marcar tarea como finalizada
      const { error: taskError } = await supabase
        .from("tareas")
        .update({
          finalizada: true,
          id_estado_nuevo: 7 // terminado
        })
        .eq("id", tareaId)

      if (taskError) throw taskError

      toast.success("✅ Tarea finalizada con éxito")
      onFinalizada()
      onOpenChange(false)
      setResumen("")
      
      // Redirigir a la página de tareas después de un breve delay
      setTimeout(() => {
        router.push("/dashboard/tareas")
      }, 1000)

    } catch (error) {
      console.error("Error al finalizar tarea:", error)
      toast.error("Error al finalizar tarea")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setResumen("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Finalizar Tarea</DialogTitle>
          <DialogDescription>
            Describe brevemente qué se realizó para completar esta tarea.
            Este resumen quedará registrado como comentario en el historial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="resumen" className="text-sm font-medium">
              Resumen de lo realizado *
            </Label>
            <Textarea
              id="resumen"
              placeholder="Ej: Se realizó la reparación completa del sistema eléctrico, se cambiaron todos los fusibles defectuosos y se verificó el correcto funcionamiento..."
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
              rows={4}
              className="mt-1"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Este comentario será visible para todos los usuarios de la tarea
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleFinalizar}
            disabled={isSubmitting || !resumen.trim()}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? "Finalizando..." : "Finalizar Tarea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
