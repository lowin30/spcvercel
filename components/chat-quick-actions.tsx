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
        <div className="border-b bg-muted/20 p-3">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                    🚀 Acciones Rápidas
                </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {roleActions.map((action) => (
                    <Button
                        key={action.command}
                        variant={action.variant || 'outline'}
                        size="sm"
                        className="h-auto py-3 px-3 flex flex-col items-start gap-1 text-left"
                        onClick={() => onActionClick(action.command)}
                    >
                        <div className="flex items-center gap-2 w-full">
                            <span className="text-lg">{action.icon}</span>
                            <span className="text-xs font-medium flex-1">{action.label}</span>
                        </div>
                    </Button>
                ))}
            </div>
        </div>
    )
}
