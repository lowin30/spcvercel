'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Check, AlertTriangle, Loader2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { registrarParteRapido } from '@/lib/tools/partes/actions'
import type { ToolContext, TareaConTrabajadores } from '@/lib/tools/partes/types'

interface ToolRegistroRapidoProps {
    context?: ToolContext
    tareas: TareaConTrabajadores[]
    usuarioActual: { id: string; rol: string; email: string }
    onSuccess?: () => void
}

export default function ToolRegistroRapido({
    context,
    tareas,
    usuarioActual,
    onSuccess,
}: ToolRegistroRapidoProps) {
    const [isPending, startTransition] = useTransition()
    const [success, setSuccess] = useState(false)
    const [selectedTarea, setSelectedTarea] = useState<number | null>(context?.id_tarea ?? null)
    const [selectedTrabajador, setSelectedTrabajador] = useState<string | null>(context?.id_trabajador ?? null)
    const [tipoJornada, setTipoJornada] = useState<'dia_completo' | 'medio_dia'>('dia_completo')
    const [fecha, setFecha] = useState(() => {
        if (context?.fecha) return context.fecha
        const hoy = new Date()
        return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
    })

    // obtener trabajadores de la tarea seleccionada
    const tareaActual = tareas.find(t => t.id === selectedTarea)
    const trabajadores = tareaActual?.trabajadores || []

    // auto-seleccionar si es trabajador
    const esTrabajador = usuarioActual.rol === 'trabajador'
    const trabajadorFinal = esTrabajador ? usuarioActual.id : selectedTrabajador

    const handleSubmit = () => {
        if (!selectedTarea || !trabajadorFinal || !fecha) return

        startTransition(async () => {
            const result = await registrarParteRapido({
                id_tarea: selectedTarea,
                id_trabajador: trabajadorFinal,
                fecha,
                tipo_jornada: tipoJornada,
            })

            if (result.ok) {
                setSuccess(true)
                toast({ title: 'registrado', description: 'parte de trabajo confirmado correctamente' })
                setTimeout(() => {
                    setSuccess(false)
                    onSuccess?.()
                }, 1500)
            } else {
                toast({ title: 'error', description: result.error, variant: 'destructive' })
            }
        })
    }

    const esCompleto = selectedTarea && trabajadorFinal && fecha

    return (
        <div className="space-y-4">
            {/* header con icono */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm">registro rapido</h3>
                    <p className="text-xs text-muted-foreground">confirmar un parte al instante</p>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {success ? (
                    <motion.div
                        key="success"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex flex-col items-center justify-center py-8"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg mb-3"
                        >
                            <Check className="w-8 h-8 text-white" />
                        </motion.div>
                        <p className="text-sm font-medium text-emerald-700">parte registrado</p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                    >
                        {/* selector de tarea (se oculta si viene en el contexto) */}
                        {!context?.id_tarea && (
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">tarea</label>
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
                            </div>
                        )}

                        {/* selector de trabajador (se oculta si es trabajador o viene en contexto) */}
                        {!esTrabajador && !context?.id_trabajador && selectedTarea && (
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">trabajador</label>
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
                                        {trabajadores.length === 0 && (
                                            <div className="p-3 text-center text-xs text-muted-foreground">
                                                no hay trabajadores asignados
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* tipo de jornada */}
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">jornada</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTipoJornada('dia_completo')}
                                    className={`p-3 rounded-xl border-2 transition-all text-center ${tipoJornada === 'dia_completo'
                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-sm'
                                            : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                                        }`}
                                >
                                    <span className="text-lg">☀️</span>
                                    <p className="text-xs font-medium mt-1">dia completo</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTipoJornada('medio_dia')}
                                    className={`p-3 rounded-xl border-2 transition-all text-center ${tipoJornada === 'medio_dia'
                                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 shadow-sm'
                                            : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                                        }`}
                                >
                                    <span className="text-lg">🌤️</span>
                                    <p className="text-xs font-medium mt-1">medio dia</p>
                                </button>
                            </div>
                        </div>

                        {/* fecha */}
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">fecha</label>
                            <input
                                type="date"
                                value={fecha}
                                onChange={e => setFecha(e.target.value)}
                                className="w-full h-11 rounded-xl border border-muted-foreground/20 bg-background/50 px-3 text-sm"
                            />
                        </div>

                        {/* boton de envio */}
                        <Button
                            onClick={handleSubmit}
                            disabled={!esCompleto || isPending}
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg transition-all"
                        >
                            {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Zap className="w-4 h-4 mr-2" />
                            )}
                            {isPending ? 'registrando...' : 'registrar parte'}
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
