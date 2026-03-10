"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DrawerClose } from "@/components/ui/drawer"

import {
    CalendarClock,
    CalendarDays,
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    X,
    Sun,
    SunMoon,
    Loader2
} from "lucide-react"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { agendarTareaMultiDia } from "@/lib/tools/partes/actions"
import { toast } from "@/components/ui/use-toast"
import { AgendaData, TareaConTrabajadores } from "@/lib/tools/partes/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface ToolAgendarMultiDiaProps {
    id_tarea: number
    titulo_tarea: string
    id_trabajador_default: string
    nombre_trabajador_default: string
    catalogos?: AgendaData['catalogos']
    onSuccess?: () => void
    onCancel?: () => void
}

type Jornada = 'dia_completo' | 'medio_dia'

export default function ToolAgendarMultiDia({
    id_tarea: initialIdTarea,
    titulo_tarea: initialTituloTarea,
    id_trabajador_default: initialIdTrabajador,
    nombre_trabajador_default: initialNombreTrabajador,
    catalogos,
    onSuccess,
    onCancel
}: ToolAgendarMultiDiaProps) {
    const [step, setStep] = useState(initialIdTarea === 0 || !initialIdTrabajador ? 0 : 1) // 0: Contexto, 1: Fechas, 2: Configuración, 3: Éxito
    const [selectedTaskId, setSelectedTaskId] = useState(initialIdTarea)
    const [selectedTaskTitle, setSelectedTaskTitle] = useState(initialTituloTarea)
    const [selectedWorkerId, setSelectedWorkerId] = useState(initialIdTrabajador)
    const [selectedWorkerName, setSelectedWorkerName] = useState(initialNombreTrabajador)
    const [selectedDays, setSelectedDays] = useState<Date[]>([])
    const [configFechas, setConfigFechas] = useState<{ [key: string]: Jornada }>({})
    const [isLoading, setIsLoading] = useState(false)

    // Al cambiar la tarea manualmente en el paso 0
    const handleTaskChange = (val: string) => {
        const id = parseInt(val)
        const tarea = catalogos?.tareas.find(t => t.id === id)
        if (tarea) {
            setSelectedTaskId(id)
            setSelectedTaskTitle(tarea.titulo)
            // Si la tarea tiene trabajadores, podríamos resetear o mantener el actual
        }
    }

    // Al cambiar el trabajador manualmente
    const handleWorkerChange = (val: string) => {
        const user = catalogos?.usuarios.find(u => u.id === val)
        if (user) {
            setSelectedWorkerId(val)
            setSelectedWorkerName(user.nombre || user.email)
        }
    }

    // Al seleccionar fechas, inicializamos su configuración como 'dia_completo'
    const handleSelectDays = (days: Date[] | undefined) => {
        if (!days) return
        setSelectedDays(days)

        const newConfig = { ...configFechas }
        days.forEach(d => {
            const key = format(d, 'yyyy-MM-dd')
            if (!newConfig[key]) newConfig[key] = 'dia_completo'
        })
        setConfigFechas(newConfig)
    }

    const toggleJornada = (dateKey: string) => {
        setConfigFechas(prev => ({
            ...prev,
            [dateKey]: prev[dateKey] === 'dia_completo' ? 'medio_dia' : 'dia_completo'
        }))
    }

    const handleGuardar = async () => {
        // Validar trabajador
        if (!selectedWorkerId || selectedWorkerId === "undefined" || selectedWorkerId === "") {
            toast({
                title: "Trabajador no identificado",
                description: "No se puede agendar sin un trabajador seleccionado.",
                variant: "destructive"
            })
            return
        }

        if (selectedDays.length === 0) {
            toast({
                title: "Sin fechas",
                description: "Debes seleccionar al menos un día en el calendario.",
                variant: "destructive"
            })
            return
        }

        setIsLoading(true)
        const fechasPayload = selectedDays.map(d => ({
            fecha: format(d, 'yyyy-MM-dd'),
            tipo_jornada: configFechas[format(d, 'yyyy-MM-dd')]
        }))

        try {
            const result = await agendarTareaMultiDia({
                id_tarea: selectedTaskId,
                id_trabajador: selectedWorkerId,
                fechas: fechasPayload
            })

            if (result.ok) {
                setStep(3)
                if (onSuccess) setTimeout(onSuccess, 1500)
            } else {
                toast({
                    title: "No se pudo agendar",
                    description: result.error || "Ocurrió un error en el servidor",
                    variant: "destructive"
                })
            }
        } catch (error: any) {
            toast({
                title: "Error técnico",
                description: error.message || "Error de conexión con el servidor",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="w-full h-full flex flex-col">

            {/* Header Dinámico - Ultra-Slim Edition */}
            <div className="p-4 bg-gradient-to-r from-violet-600/5 to-indigo-600/5 border-b border-border/30">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-2xl bg-violet-600/10 text-violet-600 shadow-inner">
                            <CalendarRange className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm sm:text-lg font-bold text-foreground leading-tight">
                                Planificador Multi-día
                            </h3>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                                Selecciona fechas y confirma
                            </p>
                        </div>
                    </div>
                    <DrawerClose asChild>
                        <Button variant="ghost" size="icon" className="absolute right-4 top-4 h-8 w-8 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                        </Button>
                    </DrawerClose>
                </div>

            </div>

            <div className="p-3 sm:p-4 min-h-[400px]">

                <AnimatePresence mode="wait">
                    {step === 0 && (
                        <motion.div
                            key="step0"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6 pt-4"
                        >
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{initialIdTarea !== 0 ? 'Tarea Actual' : 'Tarea / Ubicación'}</label>
                                    {initialIdTarea !== 0 ? (
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-600/5 border border-violet-600/20">
                                            <div className="w-2 h-8 bg-violet-600 rounded-full" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-foreground">{selectedTaskTitle}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase font-medium">Lugar de trabajo identificado</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <Select
                                            value={selectedTaskId.toString()}
                                            onValueChange={handleTaskChange}
                                        >
                                            <SelectTrigger className="rounded-xl h-12">
                                                <SelectValue placeholder="Seleccione una tarea..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {catalogos?.tareas.length === 0 ? (
                                                    <div className="p-4 text-center text-xs text-muted-foreground italic">
                                                        No tienes tareas activas asignadas.
                                                    </div>
                                                ) : (
                                                    catalogos?.tareas.map(t => (
                                                        <SelectItem key={t.id} value={t.id.toString()}>
                                                            {t.titulo} ({t.nombre_edificio})
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Trabajador</label>
                                    <Select
                                        value={selectedWorkerId}
                                        onValueChange={handleWorkerChange}
                                    >
                                        <SelectTrigger className="rounded-xl h-12">
                                            <SelectValue placeholder="Seleccione un trabajador..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {catalogos?.usuarios.filter(u => (u.rol?.toLowerCase() || '') === 'trabajador').length === 0 ? (
                                                <div className="p-4 text-center text-xs text-muted-foreground italic">
                                                    Cargando personal...
                                                </div>
                                            ) : (
                                                catalogos?.usuarios
                                                    .filter(u => (u.rol?.toLowerCase() || '') === 'trabajador')


                                                    .map(u => (
                                                        <SelectItem key={u.id} value={u.id}>
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-2 h-2 rounded-full"
                                                                    style={{ backgroundColor: u.color_perfil || '#6366f1' }}
                                                                />
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold">{u.nombre || u.email.split('@')[0]}</span>
                                                                    {u.nombre && <span className="text-[10px] opacity-50">{u.email}</span>}
                                                                </div>

                                                            </div>
                                                        </SelectItem>
                                                    ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button
                                className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold"
                                onClick={() => setStep(1)}
                                disabled={selectedTaskId === 0 || !selectedWorkerId}
                            >
                                Siguiente: Elegir Fechas <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </motion.div>
                    )}

                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <div className="text-center">
                                <p className="text-sm font-medium text-muted-foreground mb-4 px-2">
                                    Selecciona los días para <span className="text-violet-600 font-bold">{selectedWorkerName}</span>
                                </p>
                                <div className="inline-block border rounded-3xl p-1 bg-card w-fit mx-auto overflow-hidden shadow-sm border-border/40">

                                    <Calendar
                                        mode="multiple"
                                        selected={selectedDays}
                                        onSelect={handleSelectDays}
                                        className="rounded-md"
                                    // disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} // Habilitamos pasado por flexibilidad operativa
                                    />
                                </div>



                            </div>

                            <div className="flex justify-between items-center pt-4">
                                <Badge variant="secondary" className="px-2 py-1">
                                    {selectedDays.length} días seleccionados
                                </Badge>
                                <Button
                                    onClick={() => setStep(2)}
                                    disabled={selectedDays.length === 0}
                                    className="bg-violet-600 hover:bg-violet-700 text-white"
                                >
                                    Continuar <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <p className="text-sm font-medium text-muted-foreground">
                                Configura la jornada para cada día:
                            </p>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {selectedDays.sort((a, b) => a.getTime() - b.getTime()).map((date) => {
                                    const key = format(date, 'yyyy-MM-dd')
                                    const jornada = configFechas[key]
                                    return (
                                        <div
                                            key={key}
                                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2.5 sm:p-3 rounded-lg bg-card/50 border border-border/50 hover:border-violet-500/30 transition-colors gap-3"
                                        >

                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold capitalize">
                                                    {format(date, 'EEEE d', { locale: es })}
                                                </span>
                                                <span className="text-xs text-muted-foreground capitalize">
                                                    {format(date, 'MMMM', { locale: es })}
                                                </span>
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => toggleJornada(key)}
                                                className={cn(
                                                    "h-9 sm:h-10 px-3 sm:px-4 rounded-full transition-all flex gap-2 w-full sm:w-auto justify-center",
                                                    jornada === 'dia_completo'
                                                        ? "bg-amber-500/10 border-amber-500/50 text-amber-700 dark:text-amber-400"
                                                        : "bg-blue-500/10 border-blue-500/50 text-blue-700 dark:text-blue-400"
                                                )}
                                            >
                                                {jornada === 'dia_completo' ? (
                                                    <><Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Mañana + Tarde</>
                                                ) : (
                                                    <><SunMoon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Medio Día</>
                                                )}
                                            </Button>

                                        </div>
                                    )
                                })}
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setStep(1)}
                                    disabled={isLoading}
                                >
                                    Volver
                                </Button>
                                <Button
                                    className="flex-[2] bg-violet-600 hover:bg-violet-700 text-white"
                                    onClick={handleGuardar}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Agendando...</>
                                    ) : (
                                        <><CalendarDays className="w-4 h-4 mr-2" /> Confirmar Plan</>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-10 text-center"
                        >
                            <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">¡Todo Agendado!</h3>
                            <p className="text-muted-foreground mt-2 max-w-[200px]">
                                Los días se han guardado como proyectados correctamente.
                            </p>
                            <Button
                                className="mt-6 font-semibold"
                                variant="outline"
                                onClick={onCancel}
                            >
                                Cerrar Wizard
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

