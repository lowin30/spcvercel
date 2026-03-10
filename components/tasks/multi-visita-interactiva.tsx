"use client"

import React, { useState } from "react"
import { format, parseISO, isAfter, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import {
    CalendarDays,
    Plus,
    X,
    User,
    Calendar as CalendarIcon,
    AlertCircle,
    Loader2,
    CalendarPlus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { marcarAusencia, planificarParte } from "@/lib/tools/partes/actions"
import { useRouter } from "next/navigation"
import QuickTaskPlanner from "@/components/tasks/quick-task-planner"

interface Proyectado {
    id: number
    fecha: string
    id_trabajador: string
    tipo_jornada: 'dia_completo' | 'medio_dia'
    usuarios?: {
        id: string
        email: string
        nombre: string
        color_perfil: string
    }
}

interface MultiVisitaInteractivaProps {
    tareaId: number
    tareaTitulo: string
    proyectados: Proyectado[]
    trabajadoresAsignados: any[]
    trabajadoresDisponibles: any[]
}

export function MultiVisitaInteractiva({
    tareaId,
    tareaTitulo,
    proyectados = [],
    trabajadoresAsignados = [],
    trabajadoresDisponibles = []
}: MultiVisitaInteractivaProps) {
    const [isAdding, setIsAdding] = useState(false)
    const [isDeleting, setIsDeleting] = useState<number | null>(null)
    const router = useRouter()

    const handleRemove = async (id: number) => {
        try {
            setIsDeleting(id)
            const res = await marcarAusencia(id)
            if (res.ok) {
                toast.success("Visita eliminada")
                router.refresh()
            } else {
                toast.error(res.error || "No se pudo eliminar")
            }
        } catch (e) {
            toast.error("Error al eliminar visita")
        } finally {
            setIsDeleting(null)
        }
    }

    const proximasVisitas = proyectados.filter(p => {
        const d = parseISO(p.fecha)
        return isAfter(d, startOfDay(new Date())) || format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    })

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
                {proximasVisitas.length === 0 ? (
                    <span className="text-muted-foreground text-xs italic">Sin visitas programadas</span>
                ) : (
                    proximasVisitas.map((p) => (
                        <div
                            key={p.id}
                            className="group flex items-center gap-2 bg-secondary/50 hover:bg-secondary border border-border/40 rounded-full pl-2 pr-1 py-1 transition-all"
                        >
                            <CalendarIcon className="w-3 h-3 text-violet-500" />
                            <div className="flex flex-col leading-none">
                                <span className="text-[11px] font-bold">
                                    {format(parseISO(p.fecha), "eee d MMM", { locale: es })}
                                </span>
                                {p.usuarios && (
                                    <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">
                                        {p.usuarios.nombre || p.usuarios.email.split('@')[0]}
                                    </span>
                                )}
                            </div>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => handleRemove(p.id)}
                                            disabled={isDeleting === p.id}
                                            className="h-5 w-5 rounded-full flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                        >
                                            {isDeleting === p.id ? (
                                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                            ) : (
                                                <X className="w-2.5 h-2.5" />
                                            )}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Eliminar visita</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    ))
                )}

                <Dialog open={isAdding} onOpenChange={setIsAdding}>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full border-dashed border-violet-500/50 hover:border-violet-500 hover:bg-violet-500/5 text-violet-600 gap-1 px-3"
                        >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">Programar</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none bg-transparent shadow-none">
                        <div className="bg-background rounded-3xl overflow-hidden shadow-2xl border">
                            <QuickTaskPlanner
                                tareaId={tareaId}
                                tareaTitulo={tareaTitulo}
                                trabajadoresAsignados={trabajadoresAsignados.map(t => ({
                                    id: t.usuarios.id,
                                    nombre: t.usuarios.nombre || t.usuarios.email.split('@')[0],
                                    email: t.usuarios.email,
                                    color_perfil: t.usuarios.color_perfil
                                }))}
                                onSuccess={() => {
                                    setIsAdding(false)
                                    router.refresh()
                                }}
                                onCancel={() => setIsAdding(false)}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
