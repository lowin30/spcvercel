"use client"

import React, { useState, useMemo } from "react"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerOverlay,
    DrawerPortal
} from "@/components/ui/drawer"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
    X,
    CalendarCheck2,
    CalendarRange,
    Briefcase,
    Receipt,
    ChevronRight,
    Plus,
    User,
    Building2,
    CalendarPlus,
    CheckCircle2,
    Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AgendaData, AgendaEvento } from "@/lib/tools/partes/types"
import ToolAgendarMultiDia from "./tools/tool-agendar-multi-dia"
import { confirmarJornadaBatch } from "@/lib/tools/partes/actions"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"


interface SpcDayDrawerProps {
    isOpen: boolean
    onClose: () => void
    date: Date | null
    eventos: AgendaEvento[]
    catalogos: AgendaData['catalogos']
    userRole: string
}

export default function SpcDayDrawer({ isOpen, onClose, date, eventos, catalogos, userRole }: SpcDayDrawerProps) {
    const isTrabajador = userRole === 'trabajador'
    const [showWizard, setShowWizard] = useState(false)
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
    const [selectedTaskTitle, setSelectedTaskTitle] = useState("")
    const [selectedWorkerId, setSelectedWorkerId] = useState("")
    const [selectedWorkerName, setSelectedWorkerName] = useState("")
    const [isConfirming, setIsConfirming] = useState(false)
    const router = useRouter()

    // Platinum Focus Guard: Previene error de aria-hidden en Radix/Vaul
    React.useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                const titleElement = document.getElementById('day-drawer-title');
                if (titleElement) titleElement.focus();
            }, 100);
        }
    }, [isOpen]);


    const handleOpenWizard = (taskId?: number, title?: string, workerId?: string, workerName?: string) => {
        setSelectedTaskId(taskId || null)
        setSelectedTaskTitle(title || "")
        setSelectedWorkerId(workerId || "")
        setSelectedWorkerName(workerName || (taskId ? "Seleccionar Trabajador" : "Buscar Tarea..."))
        setShowWizard(true)
    }

    const eventosPorTarea = useMemo(() => {
        const groups: { [key: number]: any } = {}
        const evs = eventos || []
        evs.forEach(e => {
            const taskId = e.id_tarea
            if (taskId === undefined) return // Ignorar eventos sin tarea (ej: gastos puros sin tarea asociada)

            if (!groups[taskId]) {
                groups[taskId] = {
                    id_tarea: taskId,
                    titulo: e.titulo,
                    nombre_edificio: e.nombre_edificio,
                    trabajadores: []
                }
            }
            if (e.nombre_usuario) {
                groups[taskId].trabajadores.push({
                    id: e.id_usuario,
                    nombre: e.nombre_usuario,
                    tipo: e.tipo
                })
            }
        })
        return Object.values(groups)
    }, [eventos])

    if (!date) return null

    return (

        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="bg-background flex flex-col rounded-t-[32px] h-fit max-h-[96vh] sm:h-[85vh] fixed bottom-0 left-0 right-0 z-[101] outline-none max-w-5xl mx-auto border-x-0 sm:border-x pb-safe">


                <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-border my-4" />



                <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar">

                    {/* Accesibilidad: DialogTitle siempre presente en el DOM */}
                    <div className={cn("hidden", showWizard && "sr-only")}>
                        <DrawerTitle id="day-drawer-title">
                            {date ? format(date, 'EEEE d', { locale: es }) : 'Detalle del Día'}
                        </DrawerTitle>
                    </div>

                    {!showWizard ? (

                        <>
                            <DrawerHeader className="px-0 mb-8 flex items-center justify-between">
                                <div className="text-left">
                                    <DrawerTitle
                                        id="day-drawer-title"
                                        className="text-3xl font-black capitalize tracking-tight m-0 outline-none"
                                        tabIndex={-1}
                                    >
                                        {format(date, 'EEEE d', { locale: es })}
                                    </DrawerTitle>

                                    <DrawerDescription className="text-muted-foreground font-medium capitalize mt-1 text-left">
                                        {format(date, 'MMMM, yyyy', { locale: es })}
                                    </DrawerDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-muted/50">
                                    <X className="w-5 h-5" />
                                </Button>
                            </DrawerHeader>


                            {/* Lista de Tareas/Hoja de Ruta */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                        Hoja de Ruta ({eventosPorTarea.length} Tareas)
                                    </h4>
                                    {!isTrabajador && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleOpenWizard()}
                                            className="rounded-full bg-violet-600/10 text-violet-600 border-violet-600/20 hover:bg-violet-600 hover:text-white"
                                        >
                                            <CalendarPlus className="w-4 h-4 mr-2" />
                                            Planificar Nueva Tarea
                                        </Button>
                                    )}
                                </div>

                                {eventosPorTarea.length === 0 ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                                        <CalendarRange className="w-12 h-12 mb-4" />
                                        <p className="font-medium">Sin planificación para este día</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {eventosPorTarea.map((grupo, idx) => (
                                            <TareaHojaRutaCard
                                                key={idx}
                                                grupo={grupo}
                                                isTrabajador={isTrabajador}
                                                onAction={() => handleOpenWizard(grupo.id_tarea, grupo.titulo)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="h-full">
                            <ToolAgendarMultiDia
                                id_tarea={selectedTaskId || 0}
                                titulo_tarea={selectedTaskTitle || "Nueva Planificación"}
                                id_trabajador_default={selectedWorkerId}
                                nombre_trabajador_default={selectedWorkerName}
                                catalogos={catalogos}
                                onCancel={() => setShowWizard(false)}
                                onSuccess={() => {
                                    setShowWizard(false)
                                    onClose()
                                }}
                            />
                        </div>
                    )}
                </div>
            </DrawerContent>
        </Drawer>


    )
}

function TareaHojaRutaCard({
    grupo,
    isTrabajador,
    onAction
}: {
    grupo: any;
    isTrabajador: boolean;
    onAction: () => void;
}) {
    const router = useRouter()

    return (
        <div className="group relative p-5 rounded-3xl bg-card border border-border/50 hover:border-violet-500/30 transition-all shadow-sm">
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                        <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-600 flex-shrink-0">
                            <Building2 className="w-7 h-7" />
                        </div>
                        <div className="min-w-0">
                            <h5 className="font-black text-lg text-foreground truncate leading-tight">
                                {grupo.titulo}
                            </h5>
                            <div className="flex items-center text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                                <Briefcase className="w-3 h-3 mr-1" />
                                {grupo.nombre_edificio}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {grupo.trabajadores.map((t: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/20">
                            <div className={`w-1.5 h-1.5 rounded-full ${t.tipo === 'proyectado' ? 'bg-violet-500' : 'bg-green-500'}`} />
                            <span className="text-[11px] font-bold text-foreground/80">{t.nombre}</span>
                        </div>
                    ))}
                    {!isTrabajador && (
                        <button
                            onClick={onAction}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-600/10 text-violet-600 border border-violet-600/20 hover:bg-violet-600 hover:text-white transition-colors animate-pulse hover:animate-none"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-black italic">+ PERSONAL</span>
                        </button>
                    )}
                </div>

                <div className="pt-2 flex gap-2 border-t border-border/10">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/registro-dias?id_tarea=${grupo.id_tarea}`)}
                        className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-600/5"
                    >
                        Ver Detalles en Mis Días
                        <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
