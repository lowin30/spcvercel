'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarPlus, Plus, Trash2, Loader2, Check, Sun, CloudSun } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { planificarParte } from '@/lib/tools/partes/actions'
import type { TareaConTrabajadores, PaseListaItem } from '@/lib/tools/partes/types'

interface ToolPlanificadorProps {
    tareas: TareaConTrabajadores[]
    partesExistentes: PaseListaItem[]
    usuarioActual: { id: string; rol: string; email: string }
    onSuccess?: () => void
}

// generar fechas de la semana (lunes a sabado)
function getFechasSemana(offset = 0): { label: string; fecha: string; esHoy: boolean }[] {
    const hoy = new Date()
    const dia = hoy.getDay()
    const diffLunes = (dia + 6) % 7
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - diffLunes + offset * 7)

    const dias = []
    const nombresCortos = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab']

    for (let i = 0; i < 6; i++) {
        const d = new Date(lunes)
        d.setDate(lunes.getDate() + i)
        const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const esHoy = d.toDateString() === hoy.toDateString()
        dias.push({
            label: `${nombresCortos[i]} ${d.getDate()}`,
            fecha,
            esHoy,
        })
    }
    return dias
}

export default function ToolPlanificador({
    tareas,
    partesExistentes,
    usuarioActual,
    onSuccess,
}: ToolPlanificadorProps) {
    const [isPending, startTransition] = useTransition()
    const [semanaOffset, setSemanaOffset] = useState(0)
    const [selectedTarea, setSelectedTarea] = useState<number | null>(null)
    const [selectedTrabajador, setSelectedTrabajador] = useState<string | null>(null)

    const fechas = getFechasSemana(semanaOffset)
    const tareaActual = tareas.find(t => t.id === selectedTarea)
    const trabajadores = tareaActual?.trabajadores || []

    // buscar partes existentes para las fechas visibles
    const getPartesParaFecha = (fecha: string) => {
        return partesExistentes.filter(p =>
            p.fecha === fecha &&
            (!selectedTrabajador || p.id_trabajador === selectedTrabajador)
        )
    }

    const handlePlanificar = (fecha: string, tipo: 'dia_completo' | 'medio_dia') => {
        if (!selectedTarea || !selectedTrabajador) {
            toast({ title: 'selecciona tarea y trabajador', variant: 'destructive' })
            return
        }

        startTransition(async () => {
            const result = await planificarParte({
                id_tarea: selectedTarea,
                id_trabajador: selectedTrabajador,
                fecha,
                tipo_jornada: tipo,
            })

            if (result.ok) {
                toast({ title: 'planificado', description: `bloque creado para ${fecha}` })
                onSuccess?.()
            } else {
                toast({ title: 'error', description: result.error, variant: 'destructive' })
            }
        })
    }

    return (
        <div className="space-y-4">
            {/* header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg">
                    <CalendarPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm">planificador</h3>
                    <p className="text-xs text-muted-foreground">sembrar bloques de trabajo</p>
                </div>
            </div>

            {/* selectores */}
            <div className="grid grid-cols-1 gap-2.5">
                <Select onValueChange={v => { setSelectedTarea(Number(v)); setSelectedTrabajador(null) }} value={selectedTarea?.toString() ?? ''}>
                    <SelectTrigger className="h-11 rounded-xl border-muted-foreground/20 bg-background/50">
                        <SelectValue placeholder="seleccionar tarea..." />
                    </SelectTrigger>
                    <SelectContent>
                        {tareas.map(t => (
                            <SelectItem key={t.id} value={t.id.toString()}>
                                <span className="font-medium">{t.titulo}</span>
                                <span className="text-xs text-muted-foreground ml-2">{t.nombre_edificio}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {selectedTarea && (
                    <Select onValueChange={setSelectedTrabajador} value={selectedTrabajador ?? ''}>
                        <SelectTrigger className="h-11 rounded-xl border-muted-foreground/20 bg-background/50">
                            <SelectValue placeholder="seleccionar trabajador..." />
                        </SelectTrigger>
                        <SelectContent>
                            {trabajadores.map(t => (
                                <SelectItem key={t.id} value={t.id}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color_perfil }} />
                                        <span>{t.nombre}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* navegacion de semana */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setSemanaOffset(s => s - 1)} className="text-xs">
                    ← anterior
                </Button>
                <span className="text-xs font-medium text-muted-foreground">
                    {semanaOffset === 0 ? 'esta semana' : semanaOffset === 1 ? 'semana que viene' : `+${semanaOffset} semanas`}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setSemanaOffset(s => s + 1)} className="text-xs">
                    siguiente →
                </Button>
            </div>

            {/* grilla semanal */}
            <div className="grid grid-cols-6 gap-1.5">
                {fechas.map(dia => {
                    const partesDelDia = getPartesParaFecha(dia.fecha)
                    const cargaTotal = partesDelDia.reduce((acc, p) =>
                        acc + (p.tipo_jornada === 'dia_completo' ? 1 : 0.5), 0)

                    return (
                        <div
                            key={dia.fecha}
                            className={`rounded-xl border-2 p-2 min-h-[100px] transition-all ${dia.esHoy
                                    ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/20'
                                    : 'border-muted-foreground/10 bg-background/50'
                                }`}
                        >
                            <p className={`text-[10px] font-medium text-center mb-1.5 ${dia.esHoy ? 'text-blue-600' : 'text-muted-foreground'
                                }`}>
                                {dia.label}
                            </p>

                            {/* partes existentes para este dia */}
                            <div className="space-y-1 mb-1.5">
                                {partesDelDia.map(parte => (
                                    <motion.div
                                        key={parte.id}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className={`rounded-lg px-1.5 py-1 text-[9px] font-medium text-white truncate ${parte.estado === 'proyectado'
                                                ? 'bg-gradient-to-r from-violet-400/80 to-purple-500/80'
                                                : 'bg-gradient-to-r from-emerald-400 to-green-500'
                                            }`}
                                        title={`${parte.nombre_trabajador}: ${parte.titulo_tarea}`}
                                    >
                                        {parte.tipo_jornada === 'dia_completo' ? '☀️' : '🌤️'}{' '}
                                        {parte.nombre_trabajador.split(' ')[0]}
                                    </motion.div>
                                ))}
                            </div>

                            {/* botones de agregar (solo si hay espacio y seleccion) */}
                            {selectedTarea && selectedTrabajador && cargaTotal < 1 && (
                                <div className="flex gap-0.5 justify-center">
                                    <button
                                        onClick={() => handlePlanificar(dia.fecha, cargaTotal === 0 ? 'dia_completo' : 'medio_dia')}
                                        disabled={isPending}
                                        className="w-6 h-6 rounded-md bg-muted/50 hover:bg-violet-100 dark:hover:bg-violet-900/30 flex items-center justify-center transition-colors"
                                        title={cargaTotal === 0 ? 'dia completo' : 'medio dia'}
                                    >
                                        {isPending ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Plus className="w-3 h-3 text-violet-600" />
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* leyenda */}
            <div className="flex items-center gap-4 justify-center text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-violet-400 to-purple-500" /> proyectado
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-emerald-400 to-green-500" /> confirmado
                </span>
            </div>
        </div>
    )
}
