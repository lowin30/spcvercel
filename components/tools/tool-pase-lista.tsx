'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardCheck, Check, X, Loader2, Sun, CloudSun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/use-toast'
import { confirmarJornadaBatch, marcarAusencia } from '@/lib/tools/partes/actions'
import type { PaseListaItem } from '@/lib/tools/partes/types'

interface ToolPaseListaProps {
    partes: PaseListaItem[]
    onSuccess?: () => void
}

export default function ToolPaseLista({ partes, onSuccess }: ToolPaseListaProps) {
    const [isPending, startTransition] = useTransition()
    const [seleccionados, setSeleccionados] = useState<Record<number, boolean>>(() => {
        const initial: Record<number, boolean> = {}
        partes.forEach(p => { initial[p.id] = true })
        return initial
    })
    const [completado, setCompletado] = useState(false)

    const proyectados = partes.filter(p => p.estado === 'proyectado')
    const confirmados = partes.filter(p => p.estado === 'confirmado')

    const toggleTodos = (valor: boolean) => {
        const nuevo: Record<number, boolean> = {}
        proyectados.forEach(p => { nuevo[p.id] = valor })
        setSeleccionados(prev => ({ ...prev, ...nuevo }))
    }

    const handleConfirmarTodo = () => {
        startTransition(async () => {
            const idsConfirmar = proyectados.filter(p => seleccionados[p.id]).map(p => p.id)
            const idsAusentar = proyectados.filter(p => !seleccionados[p.id]).map(p => p.id)

            // confirmar los seleccionados
            if (idsConfirmar.length) {
                const res = await confirmarJornadaBatch(idsConfirmar)
                if (!res.ok) {
                    toast({ title: 'error', description: res.error, variant: 'destructive' })
                    return
                }
            }

            // eliminar los ausentes
            for (const id of idsAusentar) {
                await marcarAusencia(id)
            }

            setCompletado(true)
            toast({
                title: 'jornada confirmada',
                description: `${idsConfirmar.length} confirmados, ${idsAusentar.length} ausentes`,
            })
            setTimeout(() => {
                setCompletado(false)
                onSuccess?.()
            }, 2000)
        })
    }

    if (proyectados.length === 0 && confirmados.length === 0) {
        return (
            <div className="text-center py-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center mx-auto mb-3">
                    <ClipboardCheck className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">no hay registros para hoy</p>
                <p className="text-xs text-muted-foreground mt-1">usa el planificador para sembrar la semana</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg">
                        <ClipboardCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">pase de lista</h3>
                        <p className="text-xs text-muted-foreground">
                            {proyectados.length} pendientes · {confirmados.length} confirmados
                        </p>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {completado ? (
                    <motion.div
                        key="done"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center py-8"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg mb-3"
                        >
                            <Check className="w-8 h-8 text-white" />
                        </motion.div>
                        <p className="text-sm font-medium text-emerald-700">jornada confirmada</p>
                    </motion.div>
                ) : (
                    <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                        {/* pendientes de confirmar */}
                        {proyectados.length > 0 && (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">pendientes</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => toggleTodos(true)} className="text-xs text-blue-600 hover:underline">todos</button>
                                        <button onClick={() => toggleTodos(false)} className="text-xs text-red-500 hover:underline">ninguno</button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {proyectados.map((parte, i) => (
                                        <motion.div
                                            key={parte.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${seleccionados[parte.id]
                                                    ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900'
                                                    : 'border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900'
                                                }`}
                                        >
                                            {/* avatar con color */}
                                            <div
                                                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                                                style={{ backgroundColor: parte.color_trabajador }}
                                            >
                                                {parte.nombre_trabajador.charAt(0).toUpperCase()}
                                            </div>

                                            {/* info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{parte.nombre_trabajador}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {parte.titulo_tarea} · {parte.nombre_edificio}
                                                </p>
                                            </div>

                                            {/* tipo jornada badge */}
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {parte.tipo_jornada === 'dia_completo' ? (
                                                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                                                ) : (
                                                    <CloudSun className="w-3.5 h-3.5 text-orange-400" />
                                                )}
                                                <span className="text-xs text-muted-foreground">
                                                    {parte.tipo_jornada === 'dia_completo' ? 'dia' : '½'}
                                                </span>
                                            </div>

                                            {/* switch */}
                                            <Switch
                                                checked={seleccionados[parte.id] ?? true}
                                                onCheckedChange={checked => {
                                                    setSeleccionados(prev => ({ ...prev, [parte.id]: checked }))
                                                }}
                                                className="flex-shrink-0"
                                            />
                                        </motion.div>
                                    ))}
                                </div>

                                {/* boton confirmar */}
                                <Button
                                    onClick={handleConfirmarTodo}
                                    disabled={isPending}
                                    className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold shadow-lg"
                                >
                                    {isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <ClipboardCheck className="w-4 h-4 mr-2" />
                                    )}
                                    {isPending
                                        ? 'confirmando...'
                                        : `confirmar jornada (${proyectados.filter(p => seleccionados[p.id]).length})`
                                    }
                                </Button>
                            </>
                        )}

                        {/* ya confirmados hoy */}
                        {confirmados.length > 0 && (
                            <>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mt-4">
                                    confirmados hoy
                                </span>
                                <div className="space-y-1.5">
                                    {confirmados.map(parte => (
                                        <div
                                            key={parte.id}
                                            className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 opacity-70"
                                        >
                                            <div
                                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                style={{ backgroundColor: parte.color_trabajador }}
                                            >
                                                {parte.nombre_trabajador.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate">{parte.nombre_trabajador}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">{parte.titulo_tarea}</p>
                                            </div>
                                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
