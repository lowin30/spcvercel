"use client"

import React, { useState } from "react"
import { format, addDays, startOfToday } from "date-fns"
import { es } from "date-fns/locale"
import {
    Calendar as CalendarIcon,
    User,
    Check,
    Loader2,
    CalendarPlus,
    Users,
    ChevronRight,
    CheckCircle2
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { agendarTareaMultiDia } from "@/lib/tools/partes/actions"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface QuickTaskPlannerProps {
    tareaId: number
    tareaTitulo: string
    trabajadoresAsignados: Array<{
        id: string
        nombre: string
        email: string
        color_perfil: string
    }>
    onSuccess?: () => void
    onCancel?: () => void
}

export default function QuickTaskPlanner({
    tareaId,
    tareaTitulo,
    trabajadoresAsignados = [],
    onSuccess,
    onCancel
}: QuickTaskPlannerProps) {
    const [selectedDays, setSelectedDays] = useState<Date[]>([])
    const [selectedWorkers, setSelectedWorkers] = useState<string[]>(
        trabajadoresAsignados.map(t => t.id)
    )
    const [isSaving, setIsSaving] = useState(false)
    const router = useRouter()

    const toggleWorker = (id: string) => {
        setSelectedWorkers(prev =>
            prev.includes(id)
                ? prev.filter(w => w !== id)
                : [...prev, id]
        )
    }

    const handleSave = async () => {
        if (selectedDays.length === 0) {
            toast.error("Selecciona al menos un día")
            return
        }
        if (selectedWorkers.length === 0) {
            toast.error("Selecciona al menos un trabajador")
            return
        }

        try {
            setIsSaving(true)

            // Enviamos un registro por cada trabajador (batch de fechas por trabajador)
            // Nota: Podríamos optimizarlo a un solo action "agendarTareaMatrix" en el futuro,
            // pero para no tocar el backend mas de lo necesario, usaremos el robusto agendarTareaMultiDia en paralelo.

            const results = await Promise.all(
                selectedWorkers.map(workerId =>
                    agendarTareaMultiDia({
                        id_tarea: tareaId,
                        id_trabajador: workerId,
                        fechas: selectedDays.map(d => ({
                            fecha: format(d, "yyyy-MM-dd"),
                            tipo_jornada: "dia_completo"
                        }))
                    })
                )
            )

            const errores = results.filter(r => !r.ok)
            if (errores.length > 0) {
                toast.error(errores[0].error || "Ocurrió un error al agendar")
            } else {
                toast.success(`¡Hecho! Se han programado ${selectedDays.length * selectedWorkers.length} visitas.`)
                if (onSuccess) onSuccess()
                router.refresh()
            }
        } catch (e) {
            toast.error("Error crítico al guardar")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="flex flex-col h-full max-h-[90vh] bg-background">
            {/* Header Platinum */}
            <div className="p-4 border-b bg-violet-600 dark:bg-violet-900 text-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl">
                        <CalendarPlus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-tight">Programador Matrix</h3>
                        <p className="text-white/70 text-[10px] uppercase tracking-wider font-semibold">
                            {tareaId} • {tareaTitulo}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Paso 1: Equipo */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-violet-600 dark:text-violet-400">
                            <Users className="w-4 h-4" />
                            <span>EQUIPO ASIGNADO</span>
                        </div>
                        <Badge variant="secondary" className="text-[10px] h-5 rounded-full px-2">
                            {selectedWorkers.length} seleccionados
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {trabajadoresAsignados.length === 0 ? (
                            <div className="col-span-full py-4 text-center border-2 border-dashed rounded-2xl text-muted-foreground text-xs italic">
                                No hay personal fijo asignado a esta tarea aún.
                            </div>
                        ) : (
                            trabajadoresAsignados.map((t) => (
                                <div
                                    key={t.id}
                                    onClick={() => toggleWorker(t.id)}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer select-none",
                                        selectedWorkers.includes(t.id)
                                            ? "border-violet-500 bg-violet-500/5 shadow-sm"
                                            : "border-transparent bg-secondary/30 grayscale hover:grayscale-0"
                                    )}
                                >
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                                        style={{ backgroundColor: t.color_perfil || '#4f46e5' }}
                                    >
                                        {t.nombre?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate leading-none mb-1">
                                            {t.nombre || t.email.split('@')[0]}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground truncate uppercase tracking-tighter">
                                            Trabajador Fijo
                                        </p>
                                    </div>
                                    {selectedWorkers.includes(t.id) && (
                                        <div className="bg-violet-500 rounded-full p-1 shadow-md animate-in zoom-in-50 duration-200">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Paso 2: Calendario */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-violet-600 dark:text-violet-400">
                            <CalendarIcon className="w-4 h-4" />
                            <span>CALENDARIO DE VISITAS</span>
                        </div>
                        {selectedDays.length > 0 && (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px] h-5 rounded-full px-2 animate-in fade-in slide-in-from-right-2">
                                {selectedDays.length} días marcados
                            </Badge>
                        )}
                    </div>

                    <div className="bg-secondary/20 rounded-3xl p-2 border shadow-inner">
                        <Calendar
                            mode="multiple"
                            selected={selectedDays}
                            onSelect={(days) => setSelectedDays(days || [])}
                            locale={es}
                            fromDate={startOfToday()}
                            className="bg-transparent border-none w-full"
                            classNames={{
                                head_cell: "text-muted-foreground font-bold text-[10px] uppercase",
                                cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                                day: "h-11 w-11 p-0 font-normal aria-selected:opacity-100 hover:bg-violet-100 rounded-full transition-colors flex items-center justify-center mx-auto",
                                day_selected: "bg-violet-600 text-white hover:bg-violet-700 hover:text-white focus:bg-violet-600 focus:text-white rounded-full shadow-lg font-bold scale-110",
                                day_today: "bg-secondary text-primary font-bold border-2 border-violet-200",
                                day_outside: "text-muted-foreground opacity-50",
                                day_disabled: "text-muted-foreground opacity-50",
                                day_hidden: "invisible",
                            }}
                        />
                    </div>
                </section>
            </div>

            {/* Acciones */}
            <div className="p-4 border-t bg-secondary/10 sticky bottom-0 z-10 flex gap-2">
                <Button
                    variant="ghost"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="flex-1 h-12 rounded-2xl font-bold"
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={isSaving || selectedDays.length === 0 || selectedWorkers.length === 0}
                    className={cn(
                        "flex-[2] h-12 rounded-2xl font-bold transition-all shadow-xl",
                        selectedDays.length > 0 && selectedWorkers.length > 0
                            ? "bg-violet-600 hover:bg-violet-700 shadow-violet-200 dark:shadow-none"
                            : ""
                    )}
                >
                    {isSaving ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                    )}
                    {isSaving ? "Guardando..." : `Programar ${selectedDays.length * selectedWorkers.length} visitas`}
                </Button>
            </div>
        </div>
    )
}
