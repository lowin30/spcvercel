"use client"

import { TaskWizard } from "@/components/tasks/task-wizard"
import { X } from "lucide-react"

interface TaskFormChatWrapperProps {
    onSuccess: (taskId: number, code: string) => void
    onCancel: () => void
    initialData?: any // Para recibir título/descripción inferidos por la IA
    mode?: 'create' | 'edit'
    taskId?: number
}

export default function TaskFormChatWrapper({ onSuccess, onCancel, initialData, mode, taskId }: TaskFormChatWrapperProps) {
    return (
        <div className="w-full h-full bg-white dark:bg-gray-900 rounded-lg border shadow-sm overflow-hidden flex flex-col">
            {/* Header Miniatura */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b flex justify-between items-center shrink-0">
                <h3 className="font-medium text-sm flex items-center gap-2">
                    ✨ Asistente de Creación
                </h3>
                <button
                    onClick={onCancel}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Wizard Container - Scrollable */}
            <div className="p-4 flex-1 overflow-y-auto">
                <TaskWizard
                    defaultValues={initialData}
                    mode={mode}
                    taskId={taskId}
                    onSuccess={(id, code) => {
                        onSuccess(id, code)
                    }}
                />
            </div>
        </div>
    )
}
