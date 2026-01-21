'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
        <div className="border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Acciones Rápidas
                </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
                {roleActions.map((action) => (
                    <Button
                        key={action.command}
                        variant={action.variant || 'outline'}
                        size="sm"
                        className="h-auto py-1.5 px-2 flex items-center justify-start gap-1.5 text-left hover:scale-105 transition-transform"
                        onClick={() => onActionClick(action.command)}
                    >
                        <span className="text-sm">{action.icon}</span>
                        <span className="text-[10px] font-medium leading-tight">{action.label}</span>
                    </Button>
                ))}
            </div>
        </div>
    )
}
