"use client"

import React from "react"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import {
    Building2,
    ClipboardCheck,
    ExternalLink,
    FileImage,
    AlertTriangle,
    User,
    Download,
    Eye
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface ComprobanteCardProps {
    gasto: any
}

export function ComprobanteCard({ gasto }: ComprobanteCardProps) {
    const hasFoto = !!(gasto.comprobante_url || gasto.imagen_procesada_url)
    const imageUrl = gasto.imagen_procesada_url || gasto.comprobante_url

    return (
        <Card className="group overflow-hidden border-slate-200/60 transition-all hover:shadow-md hover:border-primary/20 bg-white/80 backdrop-blur-sm">
            {/* Visualización de Imagen (Si existe) */}
            <div className="relative h-40 w-full bg-slate-100 overflow-hidden flex items-center justify-center">
                {hasFoto ? (
                    <>
                        <img
                            src={imageUrl}
                            alt={gasto.descripcion || "Comprobante"}
                            className="object-cover w-full h-full transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="sm" variant="secondary" className="h-8" asChild>
                                <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                    Ver
                                </a>
                            </Button>
                            <Button size="sm" variant="secondary" className="h-8" asChild>
                                <a href={imageUrl} download={`comprobante-${gasto.id}`}>
                                    <Download className="mr-1 h-3.5 w-3.5" />
                                </a>
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                        <AlertTriangle className="h-8 w-8 text-red-400" />
                        <span className="text-xs font-medium text-red-500/80 uppercase tracking-wider">Falta Comprobante</span>
                    </div>
                )}

                {/* Badge de Rol - Flotante */}
                <div className="absolute top-2 left-2">
                    <Badge variant="outline" className="bg-white/90 backdrop-blur-sm shadow-sm border-slate-200 capitalize">
                        {gasto.rol_usuario || 'usuario'}
                    </Badge>
                </div>

                {/* Badge de Monto - Flotante */}
                <div className="absolute bottom-2 right-2">
                    <div className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded shadow-sm border border-slate-100 font-bold text-sm">
                        {formatCurrency(gasto.monto)}
                    </div>
                </div>
            </div>

            <CardContent className="p-4 space-y-3">
                {/* Edificio y Tarea */}
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-tight">
                        <Building2 className="h-3 w-3" />
                        {gasto.nombre_edificio || "Edificio Desconocido"}
                    </div>
                    <h3 className="text-sm font-bold line-clamp-1 text-slate-800">
                        {gasto.titulo_tarea || "Tarea sin título"}
                    </h3>
                </div>

                {/* Usuario y Fecha */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-1">
                        <User className="h-3 w-3 opacity-70" />
                        <span className="truncate max-w-[120px]">{gasto.email_usuario?.split('@')[0]}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span>{new Date(gasto.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="p-2 pt-0 gap-1.5">
                <Button variant="ghost" size="sm" className="w-full h-8 text-slate-500 hover:text-slate-900 text-xs gap-1.5" asChild>
                    <Link href={`/dashboard/tareas/${gasto.id_tarea}`}>
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Ir a Tarea
                        <ExternalLink className="h-3 w-3 opacity-30" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}
