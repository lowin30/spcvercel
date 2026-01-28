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
import { Loader2, MessageSquare, AlertCircle } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface FinalizarTareaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tareaId: number
  onFinalizada: () => void
  // Chat Integration Props (SPC v9.5)
  isChatVariant?: boolean
  onSuccess?: () => void
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
  onFinalizada,
  isChatVariant = false,
  onSuccess
}: FinalizarTareaDialogProps) {
  const [resumen, setResumen] = useState("")
  const [huboTrabajo, setHuboTrabajo] = useState<boolean | null>(null)
  const [tienePB, setTienePB] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [notasDepartamentos, setNotasDepartamentos] = useState<Record<number, string>>({})
  const router = useRouter()

  // Cargar departamentos y validar PB cuando se abre el dialog
  useEffect(() => {
    const cargarDatos = async () => {
      if (!open || !tareaId) return

      try {
        const supabase = createClient()

        // Verificar si existe PB
        const { data: pb } = await supabase
          .from("presupuestos_base")
          .select("id, aprobado")
          .eq("id_tarea", tareaId)
          .maybeSingle()

        setTienePB(!!pb)

        // Cargar departamentos
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
        console.error("Error al cargar datos:", error)
      }
    }

    cargarDatos()
  }, [open, tareaId])

  const handleFinalizar = async () => {
    // Validación 1: ¿Se indicó si hubo trabajo?
    if (huboTrabajo === null) {
      toast.error("Debes indicar si se realizó trabajo en esta tarea")
      return
    }

    // Validación 2: Resumen obligatorio
    if (!resumen.trim()) {
      toast.error("Debes escribir un resumen de lo realizado")
      return
    }

    // 🔴 VALIDACIÓN CRÍTICA: Si hubo trabajo, debe existir PB
    if (huboTrabajo && !tienePB) {
      toast.error("⚠️ Debes crear un Presupuesto Base antes de finalizar esta tarea", {
        duration: 6000,
        action: {
          label: "Crear PB",
          onClick: () => {
            router.push(`/dashboard/presupuestos-base/nuevo?tarea=${tareaId}`)
            onOpenChange(false)
          }
        }
      })
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      // 1. Determinar estado según si hubo trabajo
      const nuevoEstado = huboTrabajo ? 7 : 11 // terminado : vencido

      // 2. Marcar tarea como finalizada
      const { error: taskError } = await supabase
        .from("tareas")
        .update({
          finalizada: true,
          id_estado_nuevo: nuevoEstado
        })
        .eq("id", tareaId)

      if (taskError) throw taskError

      // 3. SI HUBO TRABAJO → Actualizar PF a Enviado (si existe y está en Borrador)
      if (huboTrabajo) {
        const { data: pf } = await supabase
          .from("presupuestos_finales")
          .select("id, id_estado")
          .eq("id_tarea", tareaId)
          .maybeSingle()

        if (pf) {
          const { data: estadoBorrador } = await supabase
            .from("estados_presupuestos")
            .select("id")
            .eq("codigo", "borrador")
            .single()

          if (pf.id_estado === estadoBorrador?.id) {
            const { data: estadoEnviado } = await supabase
              .from("estados_presupuestos")
              .select("id")
              .eq("codigo", "enviado")
              .single()

            await supabase
              .from("presupuestos_finales")
              .update({ id_estado: estadoEnviado?.id })
              .eq("id", pf.id)
          }
        }
      }
      // SI NO HUBO TRABAJO → El trigger rechaza PF automáticamente

      // 4. Guardar comentario con contexto
      const prefijoComentario = huboTrabajo
        ? "TAREA FINALIZADA"
        : "TAREA CERRADA SIN TRABAJO"

      const { error: commentError } = await supabase
        .from("comentarios")
        .insert({
          contenido: `${prefijoComentario}\n\nResumen: ${resumen.trim()}`,
          id_tarea: tareaId,
          id_usuario: user.id,
        })

      if (commentError) throw commentError

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
      setHuboTrabajo(null)
      setNotasDepartamentos({})
      setDepartamentos([])

      // Chat variant: trigger success callback
      if (isChatVariant && onSuccess) {
        onSuccess()
      } else {
        // Redirigir a la página de tareas después de un breve delay
        setTimeout(() => {
          router.push("/dashboard/tareas")
        }, 1000)
      }
    } catch (error) {
      console.error("Error al finalizar tarea:", error)
      toast.error("Error al finalizar tarea")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setResumen("")
    setHuboTrabajo(null)
    setNotasDepartamentos({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizar Tarea</DialogTitle>
          <DialogDescription>
            Confirma si se realizó trabajo y describe qué se hizo o por qué se cancela.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* NUEVA SECCIÓN: ¿Se trabajó? */}
          <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4">
            <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              ¿Se realizó trabajo en esta tarea? *
            </Label>
            <RadioGroup
              value={huboTrabajo?.toString()}
              onValueChange={(v) => setHuboTrabajo(v === "true")}
            >
              <div className="flex items-start space-x-2 mb-2">
                <RadioGroupItem value="true" id="trabajo-si" />
                <Label htmlFor="trabajo-si" className="cursor-pointer">
                  <div className="font-medium">Sí, se trabajó</div>
                  <div className="text-xs text-muted-foreground">
                    La tarea se completó y se debe facturar al cliente
                  </div>
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="false" id="trabajo-no" />
                <Label htmlFor="trabajo-no" className="cursor-pointer">
                  <div className="font-medium">No, no se trabajó</div>
                  <div className="text-xs text-muted-foreground">
                    Tarea cancelada o sin actividad real
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="resumen" className="text-sm font-medium">
              Resumen de lo realizado *
            </Label>
            <Textarea
              id="resumen"
              placeholder={huboTrabajo === false
                ? "Ej: Cliente canceló el trabajo, no se pudo acceder al depto..."
                : "Ej: Se realizó la reparación completa del sistema eléctrico..."}
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
            disabled={isSubmitting || !resumen.trim() || huboTrabajo === null}
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
