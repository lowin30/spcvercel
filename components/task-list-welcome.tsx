'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'

interface Task {
    id: number
    titulo: string
    descripcion?: string
    estado_tarea: string
    fecha_visita?: string
    nombre_edificio?: string
}

interface TaskListWelcomeProps {
    tasks: Task[]
    onTaskSelect: (taskId: number, taskTitle: string) => void
    userRole: string
}

export function TaskListWelcome({ tasks, onTaskSelect, userRole }: TaskListWelcomeProps) {
    const getStateColor = (estado: string) => {
        const colores: Record<string, string> = {
            'Aprobado': 'bg-green-100 text-green-700 border-green-300',
            'En Proceso': 'bg-blue-100 text-blue-700 border-blue-300',
            'Presupuestado': 'bg-yellow-100 text-yellow-700 border-yellow-300',
            'Enviado': 'bg-purple-100 text-purple-700 border-purple-300',
            'Organizar': 'bg-orange-100 text-orange-700 border-orange-300',
            'Preguntar': 'bg-red-100 text-red-700 border-red-300',
        }
        return colores[estado] || 'bg-gray-100 text-gray-700 border-gray-300'
    }

    if (tasks.length === 0) {
        return (
            <div className="text-center py-8 px-4">
                <p className="text-sm text-gray-500">No hay tareas activas</p>
                <p className="text-xs text-gray-400 mt-2">Escribe tu consulta abajo</p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between px-1 mb-2">
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    👷 Tareas Activas ({tasks.length})
                </h3>
            </div>

            <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
                {tasks.map((task, index) => (
                    <motion.button
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => onTaskSelect(task.id, task.titulo)}
                        className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 transition-all group"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        {task.titulo}
                                    </span>
                                </div>
                                {task.nombre_edificio && (
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                        🏢 {task.nombre_edificio}
                                    </p>
                                )}
                            </div>
                            <Badge
                                className={`text-[9px] px-1.5 py-0.5 shrink-0 ${getStateColor(task.estado_tarea)}`}
                                variant="outline"
                            >
                                {task.estado_tarea}
                            </Badge>
                        </div>
                    </motion.button>
                ))}
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-[10px] text-center text-gray-400">
                    💬 O escribe tu consulta abajo
                </p>
            </div>
        </div>
    )
}
