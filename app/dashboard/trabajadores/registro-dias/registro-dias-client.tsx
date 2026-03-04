'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardCheck, CalendarPlus, Zap, LayoutGrid, TrendingUp, Users, Briefcase } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ToolPaseLista from '@/components/tools/tool-pase-lista'
import ToolPlanificador from '@/components/tools/tool-planificador'
import ToolRegistroRapido from '@/components/tools/tool-registro-rapido'
import type { TareaConTrabajadores, PaseListaItem, ResumenPlanificacion } from '@/lib/tools/partes/types'

interface RegistroDiasClientProps {
    userDetails: { id: string; rol: string; email: string }
    tareas: TareaConTrabajadores[]
    partesHoy: PaseListaItem[]
    partesSemana: PaseListaItem[]
    resumen: ResumenPlanificacion
    fechaHoy: string
}

export default function RegistroDiasClient({
    userDetails,
    tareas,
    partesHoy,
    partesSemana,
    resumen,
    fechaHoy,
}: RegistroDiasClientProps) {
    const router = useRouter()
    const esSupervisorOAdmin = userDetails.rol === 'admin' || userDetails.rol === 'supervisor'

    const refresh = useCallback(() => {
        router.refresh()
    }, [router])

    // formatear fecha para display
    const fechaDisplay = new Date(fechaHoy + 'T12:00:00').toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    })

    return (
        <div className="min-h-screen pb-24 sm:pb-8">
            {/* header platinium */}
            <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mb-1"
                >
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <LayoutGrid className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                            {esSupervisorOAdmin ? 'consola de planificacion' : 'mis jornadas'}
                        </h1>
                        <p className="text-xs text-muted-foreground capitalize">{fechaDisplay}</p>
                    </div>
                </motion.div>
            </div>

            {/* KPIs de la semana (solo supervisor/admin) */}
            {esSupervisorOAdmin && (
                <div className="px-4 sm:px-6 mb-4">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-3 gap-2 sm:gap-3"
                    >
                        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950/40 dark:to-green-950/30 border border-emerald-200/50 dark:border-emerald-800/30 p-3 sm:p-4">
                            <div className="flex items-center gap-1.5 mb-1">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">confirmados</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{resumen.total_confirmados}</p>
                        </div>

                        <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-100 dark:from-violet-950/40 dark:to-purple-950/30 border border-violet-200/50 dark:border-violet-800/30 p-3 sm:p-4">
                            <div className="flex items-center gap-1.5 mb-1">
                                <CalendarPlus className="w-3.5 h-3.5 text-violet-600" />
                                <span className="text-[10px] font-medium text-violet-600 uppercase tracking-wider">pendientes</span>
                            </div>
                            <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">{resumen.total_pendientes}</p>
                        </div>

                        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/50 dark:border-blue-800/30 p-3 sm:p-4">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Users className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">oficiales</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{resumen.trabajadores_activos}</p>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* tabs principales */}
            <div className="px-4 sm:px-6">
                <Tabs defaultValue={esSupervisorOAdmin ? 'pase_lista' : 'registro'} className="w-full">
                    <TabsList className="w-full grid grid-cols-3 h-11 rounded-xl bg-muted/50 p-1">
                        {esSupervisorOAdmin && (
                            <TabsTrigger
                                value="pase_lista"
                                className="rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5"
                            >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">pase de lista</span>
                                <span className="sm:hidden">lista</span>
                                {resumen.total_pendientes > 0 && (
                                    <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] flex items-center justify-center font-bold">
                                        {resumen.total_pendientes}
                                    </span>
                                )}
                            </TabsTrigger>
                        )}

                        {esSupervisorOAdmin && (
                            <TabsTrigger
                                value="planificador"
                                className="rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5"
                            >
                                <CalendarPlus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">planificador</span>
                                <span className="sm:hidden">planificar</span>
                            </TabsTrigger>
                        )}

                        <TabsTrigger
                            value="registro"
                            className="rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5"
                        >
                            <Zap className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">registro rapido</span>
                            <span className="sm:hidden">rapido</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* pase de lista */}
                    {esSupervisorOAdmin && (
                        <TabsContent value="pase_lista" className="mt-3">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm p-4 shadow-sm"
                            >
                                <ToolPaseLista
                                    partes={partesHoy}
                                    onSuccess={refresh}
                                />
                            </motion.div>
                        </TabsContent>
                    )}

                    {/* planificador semanal */}
                    {esSupervisorOAdmin && (
                        <TabsContent value="planificador" className="mt-3">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm p-4 shadow-sm"
                            >
                                <ToolPlanificador
                                    tareas={tareas}
                                    partesExistentes={partesSemana}
                                    usuarioActual={userDetails}
                                    onSuccess={refresh}
                                />
                            </motion.div>
                        </TabsContent>
                    )}

                    {/* registro rapido */}
                    <TabsContent value="registro" className="mt-3">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm p-4 shadow-sm"
                        >
                            <ToolRegistroRapido
                                tareas={tareas}
                                usuarioActual={userDetails}
                                onSuccess={refresh}
                            />
                        </motion.div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
