"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

interface GenericToolWrapperProps {
    toolName: string
    toolLabel: string
    toolIcon?: string
    data: any
    onSuccess?: () => void
    children: React.ReactNode
}

export function GenericToolWrapper({
    toolName,
    toolLabel,
    toolIcon = '🔧',
    data,
    onSuccess,
    children
}: GenericToolWrapperProps) {
    const [isCompleted, setIsCompleted] = useState(false)

    const handleSuccess = () => {
        setIsCompleted(true)
        if (onSuccess) onSuccess()
    }

    if (isCompleted) {
        return (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-green-100 dark:bg-green-800 p-2 rounded-full">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-300" />
                </div>
                <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        {toolLabel} - Completado
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Acción ejecutada exitosamente
                    </p>
                </div>
            </div>
        )
    }

    return (
        <Card className="w-full max-w-md border border-blue-100 dark:border-blue-900 shadow-sm bg-white dark:bg-gray-950 overflow-hidden my-2">
            {/* Header Compacto tipo "Tool Context" */}
            <div className="bg-blue-50/50 dark:bg-blue-900/10 px-4 py-2 border-b border-blue-100 dark:border-blue-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm">{toolIcon}</span>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{toolLabel}</span>
                </div>
                <Badge variant="outline" className="text-[10px] h-5 bg-white dark:bg-gray-900">
                    SPC Protocol
                </Badge>
            </div>

            {/* Wrapper del Component Original */}
            <div className="p-4">
                {children}
            </div>
        </Card>
    )
}
