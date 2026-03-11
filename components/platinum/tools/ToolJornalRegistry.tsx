"use client"

import React, { useState, useTransition, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, Check, Users, Save, ArrowLeft, Loader2, Calendar, Sun, Moon, Info, ArrowUpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { registrarParteRapido, registrarParteBatch, registrarParteMultiFecha, actualizarParte } from "@/lib/tools/partes/actions"
import { TareaConTrabajadores, JornalEvent } from "./types_jornal"
import { TimeStrip, DailyOcupation } from "./TimeStrip"

interface ToolJornalRegistryProps {
    tareaId?: number
    trabajadorId?: string
    userRole: string
    userId: string
    tareas: TareaConTrabajadores[]
    registeredJornales?: JornalEvent[]
    onSuccess?: () => void
    editData?: any
}

export function ToolJornalRegistry({
    tareaId,
    trabajadorId,
    userRole,
    userId,
    tareas,
    registeredJornales = [],
    onSuccess,
    editData
}: ToolJornalRegistryProps) {
    const [isPending, startTransition] = useTransition()
    const [selectedTareaId, setSelectedTareaId] = useState<number | null>(tareaId || null)
    const [selectedTrabajadores, setSelectedTrabajadores] = useState<string[]>(trabajadorId ? [trabajadorId] : [])
    const [tipoJornada, setTipoJornada] = useState<'dia_completo' | 'medio_dia'>('dia_completo')
    const [selectedDates, setSelectedDates] = useState<string[]>([])

    // Precargar datos si estamos en modo edición o si la tareaId cambia desde arriba
    useEffect(() => {
        if (editData) {
            setSelectedTareaId(editData.id_tarea)
            setSelectedTrabajadores([editData.id_usuario])
            setTipoJornada(editData.detalle_tipo)
            setSelectedDates([editData.fecha])
        } else if (tareaId) {
            setSelectedTareaId(tareaId)
        }
    }, [editData, tareaId])

    // Calcular Ocupación Dual (Global y Local) de los trabajadores seleccionados
    const ocupationData = useMemo<DailyOcupation[]>(() => {
        if (selectedTrabajadores.length === 0) return []

        // Mapeamos los últimos 15 días tentativos
        const today = new Date()
        const datesMap = new Map<string, { global: number, local: number }>()

        // Solo contemplamos los registros de la gente seleccionada
        const relevantJornales = registeredJornales.filter(j => selectedTrabajadores.includes(j.id_usuario))

        relevantJornales.forEach(j => {
            const current = datesMap.get(j.fecha) || { global: 0, local: 0 }
            // CORRECCIÓN: Usar detalle_tipo de JornalEvent (vista maestra)
            const points = j.detalle_tipo === 'dia_completo' ? 1.0 : 0.5

            // Ocupación en cualquier lado
            current.global += points

            // Ocupación específica en la tarea actual
            if (j.id_tarea === selectedTareaId) {
                current.local += points
            }

            datesMap.set(j.fecha, current)
        })

        const result: DailyOcupation[] = []
        datesMap.forEach((vals, dateStr) => {
            result.push({
                dateStr,
                globalOcupation: vals.global,
                localOcupation: vals.local
            })
        })

        return result
    }, [registeredJornales, selectedTrabajadores, selectedTareaId])

    const esSupervisorOAdmin = userRole === 'admin' || userRole === 'supervisor'
    const esTrabajador = userRole === 'trabajador'

    // Obtener trabajadores disponibles según la tarea
    const tareaActual = useMemo(() => tareas.find(t => t.id === selectedTareaId), [tareas, selectedTareaId])
    const trabajadoresDisponibles = useMemo(() => tareaActual?.trabajadores || [], [tareaActual])

    const handleToggleTrabajador = (id: string) => {
        if (trabajadorId) return // Bloqueado si viene por prop
        setSelectedTrabajadores(prev => {
            const isSelected = prev.includes(id)
            const newSel = isSelected ? prev.filter(t => t !== id) : [...prev, id]
            // Si el set de trabajadores cambia, se limpia la selección de fechas por precaución visual (evitar confusiones UI)
            setSelectedDates([])
            return newSel
        })
    }

    const handleSelectAll = () => {
        if (selectedTrabajadores.length === trabajadoresDisponibles.length) {
            setSelectedTrabajadores([])
        } else {
            setSelectedTrabajadores(trabajadoresDisponibles.map((t: any) => t.id))
        }
        setSelectedDates([])
    }

    const handleGuardar = () => {
        if (!selectedTareaId || selectedTrabajadores.length === 0 || selectedDates.length === 0) {
            toast.error("Selecciona tarea, personal y fechas")
            return
        }

        startTransition(async () => {
            let result;

            // Si hay editData, es una edición de un registro específico (corrección/downgrade posible)
            if (editData?.event_id) {
                result = await actualizarParte(Number(editData.event_id), {
                    id_tarea: selectedTareaId,
                    tipo_jornada: tipoJornada
                })
            } else {
                // Registro masivo inteligente
                result = await registrarParteMultiFecha({
                    id_tarea: selectedTareaId,
                    ids_trabajadores: selectedTrabajadores,
                    fechas: selectedDates,
                    tipo_jornada: tipoJornada,
                    id_registrador: userId
                })
            }

            if (result.ok) {
                // Notificación Predictiva
                if (editData) {
                    toast.success("Registro actualizado correctamente")
                } else if (result.data?.msg) {
                    toast.success(result.data.msg)
                } else {
                    toast.success(selectedDates.length > 1 ? "Jornadas registradas" : "Jornada registrada")
                }
                if (onSuccess) onSuccess()
                setSelectedDates([])
                if (!trabajadorId) setSelectedTrabajadores([])
            } else {
                toast.error(result.error || "Fallo al procesar")
            }
        })
    }

    // Determinar si alguna fecha seleccionada está en la "Ventana de Gracia"
    const esFechaGracia = useMemo(() => {
        if (selectedDates.length === 0) return false

        const today = new Date()
        return selectedDates.some(f => {
            const d = new Date(`${f}T12:00:00`)
            const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
            return diffDays > 0 && diffDays <= 7 // Informativo
        })
    }, [selectedDates])

    // Sumario Predictivo en el Botón (Motor Inmortal)
    const predictionMessage = useMemo(() => {
        if (selectedDates.length === 0 || selectedTrabajadores.length === 0) return ""
        let willUpgradeCount = 0
        let willInsertCount = 0
        let blockedCount = 0

        selectedDates.forEach(d => {
            const ocup = ocupationData.find(o => o.dateStr === d)
            const isLocalHalf = ocup?.localOcupation === 0.5
            const isGlobalFull = (ocup?.globalOcupation || 0) >= 1.0 && (ocup?.localOcupation || 0) < 1.0

            if (isLocalHalf) {
                willUpgradeCount++
            } else if (!isGlobalFull && (ocup?.localOcupation || 0) < 1.0) {
                willInsertCount++
            } else {
                blockedCount++
            }
        })

        const totalTrabajadores = selectedTrabajadores.length
        const totalNuevos = willInsertCount * totalTrabajadores
        const totalUpgrades = willUpgradeCount * totalTrabajadores

        const msgs = []
        if (totalNuevos > 0) msgs.push(`Nuevos: ${totalNuevos}`)
        if (totalUpgrades > 0) msgs.push(`Mejoras: ${totalUpgrades}`)
        if (blockedCount > 0) msgs.push(`${blockedCount * totalTrabajadores} ya ocupados`)

        return msgs.join(" | ")
    }, [selectedDates, ocupationData, selectedTrabajadores.length])

    return (
        <div className="space-y-5">
            {/* Indicador de Edición */}
            <AnimatePresence>
                {editData && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest">Modo Edición Activo</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-600 dark:text-blue-400">ID: {editData.event_id}</Badge>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 1. Selector de Tarea (Si no está bloqueada) */}
            {!tareaId && (
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Proyecto / Tarea</Label>
                    <Select value={selectedTareaId?.toString()} onValueChange={(v) => setSelectedTareaId(Number(v))}>
                        <SelectTrigger className="h-12 rounded-2xl border-primary/20 bg-primary/5 font-bold shadow-sm">
                            <SelectValue placeholder="Selecciona tarea..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border shadow-xl">
                            {tareas.map(t => (
                                <SelectItem key={t.id} value={t.id.toString()} className="p-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-primary uppercase">{t.code}</span>
                                        <span className="text-sm">{t.titulo}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* 2. Personal (Grid de Avatares para 320px) */}
            <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Personal {selectedTrabajadores.length > 0 && `(${selectedTrabajadores.length})`}</Label>
                    {esSupervisorOAdmin && !trabajadorId && selectedTareaId && (
                        <button onClick={handleSelectAll} className="text-[10px] font-bold text-primary hover:underline">
                            {selectedTrabajadores.length === trabajadoresDisponibles.length ? 'QUITAR TODOS' : 'TODOS'}
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {trabajadoresDisponibles.length > 0 ? (
                        trabajadoresDisponibles.map((t: any) => {
                            const isSelected = selectedTrabajadores.includes(t.id)
                            const isBlocked = !!trabajadorId && t.id !== trabajadorId
                            if (isBlocked) return null

                            return (
                                <motion.button
                                    key={t.id}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleToggleTrabajador(t.id)}
                                    className={`relative flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-all ${isSelected
                                        ? 'bg-primary border-primary text-primary-foreground shadow-md'
                                        : 'bg-muted/50 border-border/40 text-muted-foreground hover:border-primary/40 dark:bg-muted/10'
                                        }`}
                                >
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white/20"
                                        style={{ backgroundColor: t.color_perfil }}
                                    >
                                        <span className={isSelected ? 'text-white' : 'text-foreground'}>{t.nombre.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <span className="text-xs font-bold truncate max-w-[80px]">{t.nombre.split(' ')[0]}</span>
                                    {isSelected && <Check className="w-3 h-3 ml-1" />}
                                </motion.button>
                            )
                        })
                    ) : (
                        <div className="w-full p-4 rounded-2xl border border-dashed border-border/60 text-center">
                            <p className="text-xs text-muted-foreground">
                                {selectedTareaId
                                    ? "No hay personal asignado a esta tarea"
                                    : "Selecciona una tarea para ver el personal"}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Jornada (Visual 320px compatible) */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setTipoJornada('dia_completo')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${tipoJornada === 'dia_completo'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 text-muted-foreground hover:border-primary/40 dark:bg-muted/5'
                        }`}
                >
                    <Sun className="w-6 h-6" />
                    <span className="text-xs font-bold font-mono">1.0 DÍA</span>
                </button>
                <button
                    onClick={() => setTipoJornada('medio_dia')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${tipoJornada === 'medio_dia'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-500'
                        : 'border-border/40 text-muted-foreground hover:border-amber-500/40 dark:bg-muted/5'
                        }`}
                >
                    <Moon className="w-5 h-5" />
                    <span className="text-xs font-bold font-mono">0.5 DÍA</span>
                </button>
            </div>

            {/* 4. Fechas (Librería Externa TimeStrip) */}
            <div className="space-y-2">
                <TimeStrip
                    selectedDates={selectedDates}
                    ocupationData={ocupationData}
                    onChange={setSelectedDates}
                    daysToShow={8}
                />
            </div>

            {/* Warning Ventana de Gracia */}
            <AnimatePresence>
                {esFechaGracia && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 mt-4">
                            <Info className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-xs font-medium text-amber-800 dark:text-amber-400">
                                Una o más fechas seleccionadas son de días pasados (Ventana de Gracia activa).
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Action Button en 320px */}
            <div className="pt-4 pb-2">
                <Button
                    size="lg"
                    onClick={handleGuardar}
                    disabled={isPending || !selectedTareaId || selectedTrabajadores.length === 0 || selectedDates.length === 0}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 text-white font-black shadow-lg shadow-primary/20 flex flex-col gap-0.5 justify-center"
                >
                    {isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <Save className="w-5 h-5" />
                                <span className="uppercase tracking-widest text-xs">
                                    {predictionMessage ? 'EJECUTAR CAMBIOS' : 'GUARDAR JORNADAS'}
                                </span>
                            </div>
                            {predictionMessage && (
                                <span className="text-[9px] font-normal opacity-90 uppercase tracking-widest bg-black/20 px-2 py-0.5 rounded-full mt-1">
                                    {predictionMessage}
                                </span>
                            )}
                        </>
                    )}
                </Button>
            </div>

            {esFechaGracia && esTrabajador && (
                <p className="text-[10px] text-center text-muted-foreground px-4 leading-relaxed mt-4">
                    Recuerda que registrar días de la semana pasada es una <span className="text-primary font-bold">concesión excepcional</span> para evitar errores de nómina. ¡No lo olvides!
                </p>
            )}
        </div>
    )
}
