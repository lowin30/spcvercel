"use client"

import React, { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Receipt, History, PlusCircle, Search } from "lucide-react"
import { ToolGastoPlatinumProps, GastoEvent } from "./types"
import { createClient } from "@/lib/supabase-client"
import { toast } from "sonner"

import { ToolGastoRegistry } from "./ToolGastoRegistry"
import { ToolGastoHistory } from "./ToolGastoHistory"
import { motion, AnimatePresence } from "framer-motion"

export function ToolGastoPlatinum({
    tareaId,
    initialData,
    mode = 'full',
    userRole = 'trabajador',
    userId,
    onSuccess
}: ToolGastoPlatinumProps) {
    const [activeTab, setActiveTab] = useState<string>(tareaId ? "registry" : "history")
    const [gastos, setGastos] = useState<GastoEvent[]>(initialData || [])
    const [loading, setLoading] = useState(!initialData)
    const [editingGasto, setEditingGasto] = useState<GastoEvent | null>(null)
    const supabase = createClient()

    const fetchGastos = async () => {
        try {
            setLoading(true)
            let query = supabase
                .from('vista_actividad_maestra_god_mode')
                .select('*')
                .eq('tipo_evento', 'GASTO')

            if (tareaId) {
                query = query.eq('id_tarea', tareaId)
            }

            // Aplicar filtros de rol si no hay tareaId específica (Dashboard)
            if (!tareaId) {
                if (userRole === 'trabajador') {
                    query = query.eq('id_usuario', userId)
                } else if (userRole === 'supervisor') {
                    query = query.or(`id_usuario.eq.${userId},id_supervisor.eq.${userId}`)
                }
            }

            const { data, error } = await query.order('fecha', { ascending: false })

            if (error) throw error
            setGastos(data as GastoEvent[])
        } catch (error: any) {
            console.error("Error fetching gastos:", error)
            toast.error("Error al cargar el historial de gastos")
        } finally {
            setLoading(false)
        }
    }

    const handleSuccess = () => {
        fetchGastos()
        setEditingGasto(null)
        if (onSuccess) onSuccess()
        setActiveTab("history")
    }

    useEffect(() => {
        if (!initialData || activeTab === "history") {
            fetchGastos()
        }
    }, [tareaId, userId, userRole, activeTab])

    return (
        <div className="w-full max-w-[320px] sm:max-w-4xl mx-auto px-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex justify-center mb-4 sticky top-0 z-10 bg-background/80 backdrop-blur-md py-2">
                    <TabsList className="grid w-full grid-cols-2 rounded-full p-1 bg-muted/50 border border-border/20 shadow-sm">
                        <TabsTrigger value="registry" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                            <PlusCircle className="w-4 h-4 mr-2" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Nuevo</span>
                        </TabsTrigger>
                        <TabsTrigger value="history" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                            <History className="w-4 h-4 mr-2" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Historial</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'registry' ? (
                        <motion.div
                            key="registry"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="outline-none"
                        >
                            <ToolGastoRegistry
                                tareaId={tareaId}
                                userRole={userRole}
                                userId={userId}
                                onSuccess={handleSuccess}
                                editData={editingGasto}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="history"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="outline-none"
                        >
                            <ToolGastoHistory
                                initialData={gastos}
                                userRole={userRole}
                                tareaId={tareaId?.toString()}
                                userId={userId}
                                onEdit={(gasto) => {
                                    setEditingGasto(gasto)
                                    setActiveTab("registry")
                                }}
                                onDelete={(id) => {
                                    setGastos(prev => prev.filter(g => g.event_id !== id))
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </Tabs>
        </div>
    )
}
