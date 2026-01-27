"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { TaskForm } from "@/components/task-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface TaskFormChatWrapperProps {
    onSuccess: (taskId: number, code?: string, title?: string) => void
    onCancel: () => void
}

export default function TaskFormChatWrapper({ onSuccess, onCancel }: TaskFormChatWrapperProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [supervisores, setSupervisores] = useState<any[]>([])
    const [trabajadores, setTrabajadores] = useState<any[]>([])

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                // 1. Cargar Supervisores
                const { data: supervisoresFetched, error: supervisoresError } = await supabase
                    .from('usuarios')
                    .select('id, email, rol, code, color_perfil')
                    .eq('rol', 'supervisor')
                    .order('email', { ascending: true })

                if (supervisoresError) throw supervisoresError

                let supervisoresData = (supervisoresFetched || []).slice()

                // Ordenar para priorizar 'super1' (Lógica idéntica a NuevaTareaPage)
                const isSuper1 = (s: any) => {
                    const email = (s?.email || '').toLowerCase()
                    const code = (s?.code || '').toLowerCase().replace(/\s+/g, '')
                    return email.includes('super1') || code.includes('super1')
                }

                supervisoresData.sort((a: any, b: any) => {
                    const a1 = isSuper1(a) ? 1 : 0
                    const b1 = isSuper1(b) ? 1 : 0
                    return b1 - a1
                })

                setSupervisores(supervisoresData)

                // 2. Cargar Trabajadores
                const { data: trabajadoresFetched, error: trabajadoresError } = await supabase
                    .from('usuarios')
                    .select('id, email, rol, code, color_perfil')
                    .eq('rol', 'trabajador')
                    .order('email', { ascending: true })

                if (trabajadoresError) throw trabajadoresError

                setTrabajadores(trabajadoresFetched || [])

            } catch (error: any) {
                console.error('Error fetching data for chat task form:', error)
                toast.error("Error cargando datos para el formulario.")
                onCancel() // Fallback si falla la carga
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, []) // Remove 'supabase' dependency to avoid re-running on client recreation if memoization is missing

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                <p className="text-sm text-gray-500">Preparando formulario...</p>
            </div>
        )
    }

    return (
        <div className="w-full bg-white dark:bg-gray-900 rounded-lg border shadow-sm overflow-hidden">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b flex justify-between items-center">
                <h3 className="font-medium text-sm">📝 Nueva Tarea</h3>
                <button
                    onClick={onCancel}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs underline"
                >
                    Cancelar
                </button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
                <TaskForm
                    supervisores={supervisores}
                    trabajadores={trabajadores}
                    isEditMode={false}
                    onSuccess={onSuccess}
                />
            </div>
        </div>
    )
}
