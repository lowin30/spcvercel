"use client"

import { QuickDeptCreateForm } from "@/components/quick-dept-create-form"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Check, DoorOpen } from "lucide-react"
import { useState } from "react"

interface DepartmentToolWrapperProps {
    data: any
    onSuccess?: () => void
}

export function DepartmentToolWrapper({ data, onSuccess }: DepartmentToolWrapperProps) {
    const [isCompleted, setIsCompleted] = useState(false)
    const [newDeptInfo, setNewDeptInfo] = useState<{ id: number, code: string } | null>(null)
    const [isCancelled, setIsCancelled] = useState(false)

    const handleSuccess = (id: number, code: string) => {
        setIsCompleted(true)
        setNewDeptInfo({ id, code })
        if (onSuccess) onSuccess()
    }

    const handleCancel = () => {
        setIsCancelled(true)
    }

    if (isCancelled) {
        return (
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex items-center gap-2 animate-in fade-in">
                <div className="bg-gray-200 dark:bg-gray-800 p-1.5 rounded-full">
                    <Check className="w-3 h-3 text-gray-500" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Operación cancelada por el usuario</span>
            </div>
        )
    }

    if (isCompleted && newDeptInfo) {
        return (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-green-100 dark:bg-green-800 p-2 rounded-full">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-300" />
                </div>
                <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        Departamento creado
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Unidad {newDeptInfo.code}
                    </p>
                </div>
            </div>
        )
    }

    // Si id_edificio es null, el Form se encarga de mostrar el selector
    // if (!data.id_edificio) ... (Removed)

    return (
        <Card className="w-full max-w-sm border border-blue-100 dark:border-blue-900 shadow-sm bg-white dark:bg-gray-950 overflow-hidden my-2">
            {/* Header Compacto */}
            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 px-4 py-2 border-b border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <DoorOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Nuevo Depto</span>
                </div>
                <Badge variant="outline" className="text-[10px] h-5 bg-white dark:bg-gray-900">
                    SPC
                </Badge>
            </div>

            {/* Formulario */}
            <div className="p-3">
                <QuickDeptCreateForm
                    edificioId={data.id_edificio}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                    isChatVariant={true}
                />
            </div>
        </Card>
    )
}
