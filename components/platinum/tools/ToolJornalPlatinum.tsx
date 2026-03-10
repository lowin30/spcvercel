"use client"

import React, { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { History, PlusCircle, Zap } from "lucide-react"
import { ToolJornalPlatinumProps, JornalEvent } from "./types_jornal"
import { createClient } from "@/lib/supabase-client"
import { toast } from "sonner"
import { ToolJornalRegistry } from "./ToolJornalRegistry"
import { ToolJornalHistory } from "./ToolJornalHistory"
import { motion, AnimatePresence } from "framer-motion"

export function ToolJornalPlatinum({
    tareaId,
    trabajadorId,
    initialData,
    userRole = 'trabajador',
    userId,
    tareas = [],
    onSuccess
}: ToolJornalPlatinumProps) {
    const [activeTab, setActiveTab] = useState<string>("registry")
    const [jornales, setJornales] = useState<JornalEvent[]>(initialData || [])
    const [loading, setLoading] = useState(!initialData)
    const [editingJornal, setEditingJornal] = useState<JornalEvent | null>(null)
    const supabase = createClient()

    const fetchJornales = async () => {
        try {
            setLoading(true)
            let query = supabase
                .from('vista_actividad_maestra_god_mode')
                .select('*')
                .eq('tipo_evento', 'JORNAL')

            if (tareaId) {
                query = query.eq('id_tarea', tareaId)
            }

            if (trabajadorId) {
                query = query.eq('id_usuario', trabajadorId)
            } else if (userRole === 'trabajador') {
                query = query.eq('id_usuario', userId)
            }

            const { data, error } = await query.order('fecha', { ascending: false }).limit(20)

            if (error) throw error
            setJornales(data as JornalEvent[])
        } catch (error: any) {
            console.error("Error fetching jornales:", error)
            toast.error("Error al cargar el historial")
        } finally {
            setLoading(false)
        }
    }

    const handleSuccess = () => {
        fetchJornales()
        setEditingJornal(null)
        if (onSuccess) onSuccess()
        // Opcionalmente cambiar a historial tras éxito
        // setActiveTab("history")
    }

    useEffect(() => {
        if (!initialData || activeTab === "history") {
            fetchJornales()
        }
    }, [tareaId, trabajadorId, userId, userRole, activeTab])

    return (
        <div className="w-full max-w-[320px] sm:max-w-4xl mx-auto px-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex justify-center mb-4 sticky top-0 z-10 bg-background/80 backdrop-blur-md py-2 px-1">
                    <TabsList className="grid w-full grid-cols-2 rounded-full p-1 bg-muted/50 border border-border/20 shadow-sm">
                        <TabsTrigger value="registry" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all py-2">
                            <Zap className="w-4 h-4 mr-2 text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Registro</span>
                        </TabsTrigger>
                        <TabsTrigger value="history" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all py-2">
                            <History className="w-4 h-4 mr-2 text-blue-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Pasados</span>
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
                            <ToolJornalRegistry
                                tareaId={tareaId}
                                trabajadorId={trabajadorId}
                                userRole={userRole}
                                userId={userId || ''}
                                tareas={tareas}
                                registeredJornales={jornales}
                                onSuccess={handleSuccess}
                                editData={editingJornal}
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
                            <ToolJornalHistory
                                initialData={jornales}
                                userRole={userRole}
                                onEdit={(j) => {
                                    setEditingJornal(j)
                                    setActiveTab("registry")
                                }}
                                onDelete={(id) => {
                                    setJornales(prev => prev.filter(j => Number(j.event_id) !== id))
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </Tabs>
        </div>
    )
}
