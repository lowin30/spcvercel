'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { useBadges } from '@/hooks/use-badges'

interface QuickAction {
    icon: string
    label: string
    command: string
    variant?: 'default' | 'outline' | 'destructive' | 'secondary'
}

interface ChatQuickActionsProps {
    role: string
    onActionClick: (command: string) => void
}

export function ChatQuickActions({ role, onActionClick }: ChatQuickActionsProps) {
    const { badges } = useBadges() // Hook seguro para contadores

    const actions: Record<string, QuickAction[]> = {
        admin: [
            { icon: '➕', label: 'Nueva Tarea', command: 'crear_tarea', variant: 'default' },
            { icon: '✅', label: 'Aprobar Presup.', command: 'aprobar_presupuesto', variant: 'default' },
            { icon: '📊', label: 'Ver KPIs', command: 'mostrar_kpis', variant: 'outline' },
            { icon: '🔔', label: 'Alertas', command: 'ver_alertas', variant: 'destructive' },
            { icon: '💰', label: 'Liquidación', command: 'crear_liquidacion', variant: 'outline' },
            { icon: '📈', label: 'ROI', command: 'calcular_roi_tarea', variant: 'outline' },
        ],
        supervisor: [
            { icon: '📋', label: 'Mis Tareas', command: 'listar_mis_tareas', variant: 'default' },
            { icon: '✅', label: 'Aprobar Gasto', command: 'aprobar_gasto', variant: 'default' },
            { icon: '➕', label: 'Nueva Tarea', command: 'crear_tarea', variant: 'outline' },
            { icon: '💼', label: 'Presup. Base', command: 'crear_presupuesto_base', variant: 'outline' },
            { icon: '👷', label: 'Mi Equipo', command: 'ver_mi_equipo', variant: 'outline' },
            { icon: '📊', label: 'Liquidación', command: 'ver_liquidacion_equipo', variant: 'outline' },
        ],
        trabajador: [
            { icon: '📋', label: 'Mis Tareas', command: 'listar_mis_tareas', variant: 'default' },
            { icon: '⏱️', label: 'Registrar Día', command: 'registrar_parte', variant: 'default' },
            { icon: '💰', label: 'Nuevo Gasto', command: 'registrar_gasto', variant: 'outline' },
            { icon: '💵', label: 'Mis Pagos', command: 'ver_mis_pagos', variant: 'outline' },
        ],
    }

    const roleActions = actions[role] || []

    if (roleActions.length === 0) {
        return null
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 px-3 py-2"
            >
                <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Acciones Rápidas
                    </span>
                    {Object.keys(badges).length > 0 && (
                        <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    {roleActions.map((action, index) => (
                        <motion.div
                            key={action.command}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Button
                                variant={action.variant || 'outline'}
                                size="sm"
                                className="w-full h-auto py-1.5 px-2 flex items-center justify-start gap-1.5 text-left hover:scale-105 transition-transform relative"
                                onClick={() => onActionClick(action.command)}
                            >
                                <span className="text-sm">{action.icon}</span>
                                <span className="text-[10px] font-medium leading-tight truncate flex-1">{action.label}</span>

                                {/* Badge Dinámico */}
                                {badges[action.command] && badges[action.command] > 0 && (
                                    <Badge
                                        variant="destructive"
                                        className="h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full absolute -top-1 -right-1 shadow-sm"
                                    >
                                        {badges[action.command]}
                                    </Badge>
                                )}
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
