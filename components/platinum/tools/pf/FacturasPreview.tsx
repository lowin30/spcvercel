"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ChevronDown, ChevronUp, Wallet, ReceiptText, Send, CreditCard, ExternalLink } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { formatDate } from "@/lib/date-utils"
import Link from "next/link"

interface FacturasPreviewProps {
    facturas: any[]
    facturasItems: Record<number, any[]>
}

export function FacturasPreview({ facturas, facturasItems }: FacturasPreviewProps) {
    return (
        <div className="space-y-3">
            {facturas.map((factura: any) => (
                <FacturaMiniCard
                    key={factura.id}
                    factura={factura}
                    items={facturasItems[factura.id] || []}
                />
            ))}
        </div>
    )
}

function FacturaMiniCard({ factura, items }: { factura: any; items: any[] }) {
    const [isExpanded, setIsExpanded] = useState(false)

    const estadoNombre = factura.estados_facturas?.nombre || 'Sin estado'
    const estadoColor = factura.estados_facturas?.color || '#888'

    const iconForStatus = () => {
        if (factura.pagada) return <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
        if (factura.enviada) return <Send className="h-3.5 w-3.5 text-blue-500" />
        return <ReceiptText className="h-3.5 w-3.5 text-amber-500" />
    }

    const saldo = factura.saldo_pendiente ?? factura.total
    const totalPagado = factura.total_pagado ?? 0
    const porcentajePagado = factura.total > 0 ? Math.round((totalPagado / factura.total) * 100) : 0

    return (
        <Card className="overflow-hidden border-muted-foreground/10 bg-card">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-left p-3.5 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors active:bg-muted/30"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                        {iconForStatus()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold truncate">
                            {factura.nombre || factura.code || `Factura #${factura.id}`}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                                style={{ backgroundColor: estadoColor, color: 'white' }}
                                className="border-0 text-[8px] h-4 font-bold"
                            >
                                {estadoNombre}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                                {formatDate(factura.created_at)}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-black tracking-tight">
                        {formatCurrency(factura.total)}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t px-3.5 py-3 space-y-3 animate-in slide-in-from-top-1 duration-200 bg-muted/5">
                    {/* Payment Progress */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                            <span>Pagado: {formatCurrency(totalPagado)}</span>
                            <span>Saldo: {formatCurrency(saldo)}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                                style={{ width: `${porcentajePagado}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-right text-muted-foreground font-mono">{porcentajePagado}%</p>
                    </div>

                    {/* AFIP Info */}
                    {factura.afip_numero && (
                        <div className="flex items-center gap-2 text-xs bg-muted/30 px-3 py-1.5 rounded-lg">
                            <span className="text-muted-foreground">AFIP:</span>
                            <span className="font-mono font-medium">{factura.afip_numero}</span>
                        </div>
                    )}

                    {/* Items */}
                    {items.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Ítems ({items.length})
                            </p>
                            {items.map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center text-xs py-1.5 border-b border-dashed border-muted-foreground/10 last:border-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {item.es_material ? (
                                            <span className="text-[8px] bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1 rounded font-bold">M</span>
                                        ) : (
                                            <span className="text-[8px] bg-muted text-muted-foreground px-1 rounded font-bold">S</span>
                                        )}
                                        <span className="truncate">{item.descripcion}</span>
                                    </div>
                                    <span className="font-bold flex-shrink-0 ml-2">{formatCurrency(item.subtotal_item || (item.cantidad * item.precio_unitario))}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Link to full detail */}
                    <Link
                        href={`/dashboard/facturas/${factura.id}`}
                        className="flex items-center justify-center gap-1.5 text-xs text-primary font-medium py-2 hover:underline"
                    >
                        <ExternalLink className="h-3 w-3" /> Ver detalle completo
                    </Link>
                </div>
            )}
        </Card>
    )
}
