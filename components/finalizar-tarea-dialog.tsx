"use client"

import { useState, useEffect } from "react"
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
import { Loader2, MessageSquare } from "lucide-react"

interface FinalizarTareaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tareaId: number
  onFinalizada: () => void
}

interface Departamento {
  id: number
  codigo: string
  propietario?: string
  notaActual?: string
}

export function FinalizarTareaDialog({
  open,
  onOpenChange,
  tareaId,
  onFinalizada
}: FinalizarTareaDialogProps) {
  const [resumen, setResumen] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [notasDepartamentos, setNotasDepartamentos] = useState<Record<number, string>>({})
  const router = useRouter()

  // Cargar departamentos de la tarea cuando se abre el dialog
  useEffect(() => {
    const cargarDepartamentos = async () => {
      if (!open || !tareaId) return

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("departamentos_tareas")
          .select(`
            departamentos:id_departamento(
              id,
              codigo,
              propietario,
              notas
            )
          `)
          .eq("id_tarea", tareaId)

        if (error) throw error

        const deps = data
          ?.map((item: any) => item.departamentos)
          .filter(Boolean)
          .map((dep: any) => ({
            id: dep.id,
            codigo: dep.codigo,
            propietario: dep.propietario,
            notaActual: dep.notas
          })) || []

        setDepartamentos(deps)
      } catch (error) {
        console.error("Error al cargar departamentos:", error)
      }
    }

    cargarDepartamentos()
  }, [open, tareaId])

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

      // 3. Guardar notas de departamentos (si hay alguna)
      const notasPromises = Object.entries(notasDepartamentos).map(async ([depId, nota]) => {
        if (!nota.trim()) return

        const fecha = new Date().toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
        const nuevaNota = `[${fecha}] ${nota.trim()}`

        // Obtener nota actual del departamento
        const { data: currentData } = await supabase
          .from("departamentos")
          .select("notas")
          .eq("id", Number(depId))
          .single()

        // Concatenar con historial
        const notasActualizadas = currentData?.notas 
          ? `${currentData.notas}\n\n${nuevaNota}`
          : nuevaNota

        // Actualizar
        return supabase
          .from("departamentos")
          .update({ notas: notasActualizadas })
          .eq("id", Number(depId))
      })

      await Promise.all(notasPromises)

      toast.success("✅ Tarea finalizada con éxito")
      onFinalizada()
      onOpenChange(false)
      setResumen("")
      setNotasDepartamentos({})
      setDepartamentos([])
      
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
    setNotasDepartamentos({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
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

          {/* Sección de notas de departamentos */}
          {departamentos.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">
                  Notas de atención de departamentos (opcional)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                ¿Cómo te atendieron en cada departamento?
              </p>
              <div className="space-y-3">
                {departamentos.map((dep) => (
                  <div key={dep.id} className="space-y-1.5">
                    <Label htmlFor={`nota-dep-${dep.id}`} className="text-xs font-medium">
                      {dep.codigo} {dep.propietario && `(${dep.propietario})`}
                    </Label>
                    {dep.notaActual && (
                      <p className="text-[11px] text-muted-foreground italic line-clamp-1">
                        Última nota: {dep.notaActual.split('\n\n').pop()}
                      </p>
                    )}
                    <Textarea
                      id={`nota-dep-${dep.id}`}
                      placeholder="Ej: Muy amable, nos atendió rápido..."
                      value={notasDepartamentos[dep.id] || ''}
                      onChange={(e) => setNotasDepartamentos(prev => ({
                        ...prev,
                        [dep.id]: e.target.value
                      }))}
                      rows={2}
                      className="text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="border-muted-foreground/30 text-muted-foreground dark:border-gray-700 dark:text-gray-300 hover:bg-muted/20"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleFinalizar}
            disabled={isSubmitting || !resumen.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? "Finalizando..." : "Finalizar Tarea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
