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
import { finalizarTareaAction } from "@/app/dashboard/tareas/actions"

interface FinalizarTareaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tareaId: number
  onFinalizada: () => void
  presupuestoBase?: any
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
  presupuestoBase,
  isChatVariant = false,
  onSuccess
}: FinalizarTareaDialogProps) {
  const [resumen, setResumen] = useState("")
  const [huboTrabajo, setHuboTrabajo] = useState<boolean | null>(null)
  const [tienePB, setTienePB] = useState(!!presupuestoBase)
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

        // Actualizar tienePB desde la prop o el estado local si es necesario
        setTienePB(!!presupuestoBase)

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

    // VALIDACION CRITICA: Si hubo trabajo, debe existir PB
    if (huboTrabajo && !tienePB) {
      toast.error("debes crear un presupuesto base antes de finalizar esta tarea", {
        duration: 6000,
        action: {
          label: "crear pb",
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

      // 3. Ejecutar Acción de Servidor (Consolidada)
      const result = await finalizarTareaAction({
        taskId: tareaId,
        huboTrabajo: huboTrabajo,
        resumen: resumen,
        notasDepartamentos: notasDepartamentos
      })

      if (!result.success) {
        throw new Error(result.message)
      }

      toast.success("tarea finalizada con exito")
      onFinalizada()
      onOpenChange(false)
      setResumen("")
      setHuboTrabajo(null)
      setNotasDepartamentos({})

      // NUEVA LOGICA DE CONTINUIDAD (CLONADO DIRECTO - AUTO SAVE)
      if (continuarTarea && rubrosContinuidad.length > 0) {
        toast.loading("creando tarea de seguimiento...")

        // Importación dinámica para evitar problemas de SSR si no se usara
        const { quickCloneTask } = await import('@/app/dashboard/tareas/actions')

        const res = await quickCloneTask(tareaId, rubrosContinuidad)

        if (!res.success) {
          toast.error(res.message || "Error al clonar tarea")
          return
        }

        const nuevaTarea = res.task

        // EXITO FINAL
        toast.dismiss() // Quitar loading
        toast.success(`tarea finalizada.\nnueva tarea iniciada: ${nuevaTarea.titulo}`, {
          duration: 5000
        })

        // Limpiar estados local
        setDepartamentos([])
        setRubrosContinuidad([])
        setContinuarTarea(false)

        onFinalizada()
        onOpenChange(false)
        setResumen("")
        setHuboTrabajo(null)
        setNotasDepartamentos({})

        // Callback para Chat o Refresh
        if (onSuccess) onSuccess()

        return
      }

      setDepartamentos([])
      setRubrosContinuidad([])
      setContinuarTarea(false)

      // Chat variant: trigger success callback (solo si NO hay continuidad)
      if (isChatVariant && onSuccess) {
        onSuccess()
      } else {
        // Redirigir a la página de tareas después de un breve delay
        setTimeout(() => {
          // Forzar refresh router para ver la nueva tarea si es necesario
          router.refresh()
          router.push("/dashboard/tareas")
        }, 1000)
      }
    } catch (error) {
      console.error("error al finalizar tarea:", error)
      toast.error("error al finalizar tarea")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setResumen("")
    setHuboTrabajo(null)
    setNotasDepartamentos({})
    setContinuarTarea(false)
    setRubrosContinuidad([])
    onOpenChange(false)
  }

  // Estado para continuidad
  const [continuarTarea, setContinuarTarea] = useState(false)
  const [rubrosContinuidad, setRubrosContinuidad] = useState<string[]>([])

  const toggleRubro = (rubro: string) => {
    setRubrosContinuidad(prev =>
      prev.includes(rubro)
        ? prev.filter(r => r !== rubro)
        : [...prev, rubro]
    )
  }

  const RubrosList = ["Pintura", "Albañilería", "Plomería", "Electricidad", "Gas", "Herrería", "Impermeabilización", "Destapación"]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>finalizar tarea</DialogTitle>
          <DialogDescription>
            confirma si se realizo trabajo y describe que se hizo o por que se cancela.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* NUEVA SECCIÓN: ¿Se trabajó? */}
          <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4">
            <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              ¿se realizo trabajo en esta tarea? *
            </Label>
            <RadioGroup
              value={huboTrabajo?.toString()}
              onValueChange={(v) => setHuboTrabajo(v === "true")}
            >
              <div className="flex items-start space-x-2 mb-2">
                <RadioGroupItem value="true" id="trabajo-si" />
                <Label htmlFor="trabajo-si" className="cursor-pointer">
                  <div className="font-medium">si, se trabajo</div>
                  <div className="text-xs text-muted-foreground">
                    la tarea se completo y se debe facturar al cliente
                  </div>
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="false" id="trabajo-no" />
                <Label htmlFor="trabajo-no" className="cursor-pointer">
                  <div className="font-medium">no, no se trabajo</div>
                  <div className="text-xs text-muted-foreground">
                    tarea cancelada o sin actividad real
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="resumen" className="text-sm font-medium">
              resumen de lo realizado *
            </Label>
            <Textarea
              id="resumen"
              placeholder={huboTrabajo === false
                ? "ej: cliente cancelo el trabajo, no se pudo acceder al depto..."
                : "ej: se realizo la reparacion completa del sistema electrico..."}
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
              rows={4}
              className="mt-1"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              este comentario sera visible para todos los usuarios de la tarea
            </p>
          </div>

          {/* Sección de notas de departamentos */}
          {departamentos.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">
                  notas de atencion de departamentos (opcional)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                ¿como te atendieron en cada departamento?
              </p>
              <div className="space-y-3">
                {departamentos.map((dep) => (
                  <div key={dep.id} className="space-y-1.5">
                    <Label htmlFor={`nota-dep-${dep.id}`} className="text-xs font-medium">
                      {dep.codigo} {dep.propietario && `(${dep.propietario})`}
                    </Label>
                    {dep.notaActual && (
                      <p className="text-[11px] text-muted-foreground italic line-clamp-1">
                        ultima nota: {dep.notaActual.split('\n\n').pop()}
                      </p>
                    )}
                    <Textarea
                      id={`nota-dep-${dep.id}`}
                      placeholder="ej: muy amable, nos atendio rapido..."
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

          {/* SECCIÓN CONTINUIDAD (Web & Mobile Friendly) - REFINADO */}
          <div className={`border-t pt-4 mt-4 transition-all duration-300 ${continuarTarea ? 'bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900 mx-[-1rem] px-6' : ''}`}>
            <div className="flex items-start space-x-3">
              {/* Checkbox "manual" mejorado visualmente */}
              <div
                className={`w-6 h-6 min-w-[1.5rem] rounded-md border-2 flex items-center justify-center cursor-pointer mt-0.5 transition-all duration-200 ${continuarTarea ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm scale-110' : 'border-muted-foreground/30 hover:border-indigo-400 bg-white dark:bg-gray-950'}`}
                onClick={() => setContinuarTarea(!continuarTarea)}
              >
                {continuarTarea && <span className="text-sm font-bold leading-none">v</span>}
              </div>

              <div className="grid gap-1.5 leading-none flex-1">
                <Label
                  className={`text-base font-semibold leading-none cursor-pointer transition-colors ${continuarTarea ? 'text-indigo-700 dark:text-indigo-300' : 'text-foreground'}`}
                  onClick={() => setContinuarTarea(!continuarTarea)}
                >
                  ¿quedan trabajos pendientes?
                </Label>
                <p className="text-sm text-muted-foreground">
                  al finalizar, se abrira la pantalla para crear una tarea de seguimiento.
                </p>
              </div>
            </div>

            {continuarTarea && (
              <div className="mt-4 pl-0 sm:pl-9 grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2">
                {RubrosList.map((rubro) => (
                  <div
                    key={rubro}
                    className={`flex items-center space-x-2 p-2 rounded-lg transition-colors cursor-pointer border ${rubrosContinuidad.includes(rubro) ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`}
                    onClick={() => toggleRubro(rubro)}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${rubrosContinuidad.includes(rubro) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-400'}`}
                    >
                      {rubrosContinuidad.includes(rubro) && <span className="text-[10px] font-bold">v</span>}
                    </div>
                    <span
                      className={`text-sm font-medium ${rubrosContinuidad.includes(rubro) ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      {rubro === "Impermeabilización" ? "Impermea..." : rubro}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="border-muted-foreground/30 text-muted-foreground dark:border-gray-700 dark:text-gray-300 hover:bg-muted/20"
          >
            cancelar
          </Button>
          <Button
            onClick={handleFinalizar}
            disabled={isSubmitting || !resumen.trim() || huboTrabajo === null}
            className="bg-green-600 hover:bg-green-700 text-white focus-visible:ring-2 focus-visible:ring-green-400/60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? "finalizando..." : "finalizar tarea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
