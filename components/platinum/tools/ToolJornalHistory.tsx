"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Trash2, Edit3, Calendar, Sun, Moon, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { JornalEvent } from "./types_jornal"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { eliminarParte } from "@/lib/tools/partes/actions"
import { toast } from "sonner"

interface ToolJornalHistoryProps {
    initialData: JornalEvent[]
    userRole: string
    onEdit?: (jornal: JornalEvent) => void
    onDelete?: (id: number) => void
}

export function ToolJornalHistory({ initialData, userRole, onEdit, onDelete }: ToolJornalHistoryProps) {
    const [deletingId, setDeletingId] = useState<number | null>(null)

    const handleDelete = async (id: number) => {
        try {
            setDeletingId(id)
            const res = await eliminarParte(id)
            if (res.ok) {
                toast.success("Registro eliminado")
                if (onDelete) onDelete(id)
            } else {
                toast.error(res.error || "No se pudo eliminar")
            }
        } finally {
            setDeletingId(null)
        }
    }

    if (initialData.length === 0) {
        return (
            <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 bg-muted/30 rounded-full flex items-center justify-center mx-auto opacity-20">
                    <Clock className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Sin registros recientes</p>
            </div>
        )
    }

    return (
        <div className="space-y-3 px-1">
            <AnimatePresence initial={false}>
                {initialData.map((j) => {
                    const fechaObj = new Date(j.fecha + 'T12:00:00')
                    const esConfirmado = j.estado === 'confirmado'

                    return (
                        <motion.div
                            key={j.event_id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card/40 backdrop-blur-sm border border-border/30 rounded-2xl p-3 flex items-center gap-3 group hover:border-primary/30 transition-all shadow-sm"
                        >
                            {/* Icono de Estado/Tipo */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${j.detalle_tipo === 'dia_completo'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-amber-500/10 text-amber-600'
                                }`}>
                                {j.detalle_tipo === 'dia_completo' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </div>

                            {/* Info Principal */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">
                                        {format(fechaObj, 'EEE d MMM', { locale: es })}
                                    </span>
                                    {esConfirmado ? (
                                        <BadgeStatus icon={<CheckCircle2 className="w-2.5 h-2.5" />} text="OK" color="text-emerald-500" />
                                    ) : (
                                        <BadgeStatus icon={<AlertCircle className="w-2.5 h-2.5" />} text="PLAN" color="text-blue-500" />
                                    )}
                                </div>
                                <h4 className="text-xs font-bold truncate leading-tight">{j.titulo_tarea}</h4>
                                <p className="text-[10px] text-muted-foreground truncate opacity-70">
                                    {j.nombre_usuario} · {j.nombre_edificio}
                                </p>
                            </div>

                            {/* Acciones Rápidas */}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5"
                                    onClick={() => onEdit?.(j)}
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={deletingId === Number(j.event_id)}
                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                                    onClick={() => handleDelete(Number(j.event_id))}
                                >
                                    {deletingId === Number(j.event_id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </Button>
                            </div>
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </div>
    )
}

function BadgeStatus({ icon, text, color }: { icon: React.ReactNode, text: string, color: string }) {
    return (
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted/40 ${color} font-black text-[8px] border border-current/10`}>
            {icon}
            <span>{text}</span>
        </div>
    )
}
