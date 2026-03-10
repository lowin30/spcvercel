"use client"

import React from "react"
import { GastoEvent, ToolGastoPlatinumProps } from "./types"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Receipt, Eye, ExternalLink, HardHat, Package, Edit, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase-client"

export function ToolGastoHistory({
    initialData,
    userRole,
    tareaId,
    userId,
    onEdit,
    onDelete
}: {
    initialData: GastoEvent[],
    userRole?: string,
    tareaId?: string,
    userId?: string,
    onEdit?: (gasto: GastoEvent) => void,
    onDelete?: (id: number) => void
}) {
    if (!initialData || initialData.length === 0) {
        return (
            <div className="text-center py-12 opacity-50 space-y-2">
                <Receipt className="w-12 h-12 mx-auto stroke-[1] text-muted-foreground" />
                <p className="text-sm font-medium">No hay gastos registrados aún</p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {initialData.map((gasto) => (
                <div
                    key={gasto.event_id}
                    className="group bg-card border border-border/40 rounded-2xl p-3 flex items-center justify-between gap-4 transition-all hover:border-violet-500/30 hover:shadow-sm"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            gasto.detalle_tipo === 'material' ? "bg-blue-500/10 text-blue-600" : "bg-orange-500/10 text-orange-600"
                        )}>
                            {gasto.detalle_tipo === 'material' ? <Package className="w-5 h-5" /> : <HardHat className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-black text-violet-600 uppercase tracking-tighter leading-none">
                                    {gasto.codigo_tarea}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-bold">
                                    {format(new Date(gasto.fecha), 'dd MMM', { locale: es })}
                                </span>
                            </div>
                            <h4 className="text-sm font-bold truncate leading-tight mb-1">{gasto.descripcion}</h4>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: gasto.ui_metadata.color_perfil }} />
                                <span className="text-[10px] text-muted-foreground font-medium truncate">{gasto.nombre_usuario.split(' ')[0]}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="text-right shrink-0">
                            <p className="text-base font-black tracking-tight">${gasto.monto.toLocaleString()}</p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                                {gasto.comprobante_url && (
                                    <a
                                        href={gasto.comprobante_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 rounded-md hover:bg-violet-500/10 text-violet-600 transition-colors"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                    </a>
                                )}
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full ml-1",
                                    gasto.liquidado ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                                )} />
                            </div>
                        </div>

                        {/* Acciones de Edición/Borrado con Lógica de Permisos SPC */}
                        {!gasto.liquidado && (userRole === 'admin' || (userRole === 'supervisor' && gasto.id_usuario === userId)) && (
                            <div className="flex items-center gap-1 border-l border-border/40 pl-2 ml-1">
                                <button
                                    onClick={() => onEdit?.(gasto)}
                                    className="p-2 rounded-xl hover:bg-blue-500/10 text-blue-600 transition-all active:scale-95"
                                    title="Editar gasto"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={async () => {
                                        if (confirm("¿Estás seguro de eliminar este gasto?")) {
                                            const supabase = createClient()
                                            const { error } = await supabase.from('gastos_tarea').delete().eq('id', gasto.event_id)
                                            if (error) {
                                                toast.error("Error al eliminar")
                                            } else {
                                                toast.success("Gasto eliminado")
                                                onDelete?.(gasto.event_id)
                                            }
                                        }
                                    }}
                                    className="p-2 rounded-xl hover:bg-red-500/10 text-red-600 transition-all active:scale-95"
                                    title="Eliminar gasto"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
