"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface ClonarTareaDialogProps {
    tareaId: number | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

const rubrosDisponibles = [
    "Pintura",
    "Albañilería",
    "Plomería",
    "Electricidad",
    "Gas",
    "Herrería",
    "Aire Acondicionado",
    "Carpintería",
    "Impermeabilización",
    "Destapación"
]

export function ClonarTareaDialog({ tareaId, open, onOpenChange, onSuccess }: ClonarTareaDialogProps) {
    const [rubrosSeleccionados, setRubrosSeleccionados] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    const toggleRubro = (rubro: string) => {
        setRubrosSeleccionados(prev =>
            prev.includes(rubro)
                ? prev.filter(r => r !== rubro)
                : [...prev, rubro]
        )
    }

    const handleClonar = async () => {
        if (!tareaId) return

        setIsSubmitting(true)

        try {
            const { quickCloneTask } = await import('@/app/dashboard/tareas/actions')
            const res = await quickCloneTask(tareaId, rubrosSeleccionados)

            if (res.success) {
                toast.success(
                    `✅ Tarea clonada exitosamente\n📋 ${res.task.titulo}`,
                    { duration: 4000 }
                )
                onOpenChange(false)
                setRubrosSeleccionados([])
                if (onSuccess) onSuccess()
            } else {
                toast.error(res.message || "Error al clonar tarea")
            }
        } catch (error: any) {
            console.error("Error cloning task:", error)
            toast.error("Error inesperado al clonar la tarea")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        if (!isSubmitting) {
            setRubrosSeleccionados([])
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Clonar Tarea</DialogTitle>
                    <DialogDescription>
                        Selecciona los rubros que deseas agregar a la tarea clonada. El título se limpiará automáticamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <label className="text-sm font-medium mb-3 block">
                        Rubros a agregar (opcional)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {rubrosDisponibles.map((rubro) => (
                            <button
                                key={rubro}
                                type="button"
                                onClick={() => toggleRubro(rubro)}
                                disabled={isSubmitting}
                                className={`
                  px-3 py-2 rounded-md text-sm font-medium transition-all
                  ${rubrosSeleccionados.includes(rubro)
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    }
                  ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                            >
                                {rubro}
                            </button>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleClonar}
                        disabled={isSubmitting || !tareaId}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Clonando...
                            </>
                        ) : (
                            'Clonar Tarea'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
