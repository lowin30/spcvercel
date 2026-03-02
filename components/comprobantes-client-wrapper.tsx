"use client"

import React, { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SuperFiltroInteligente } from "@/components/super-filtro-inteligente"
import { ComprobanteCard } from "@/components/comprobante-card"
import { AlertCircle, FileStack, ShieldAlert, Image as ImageIcon } from "lucide-react"

interface Comprobante {
    id: number
    id_tarea: number
    id_usuario: string
    rol_usuario: string
    tipo_gasto: string
    monto: number
    descripcion: string
    comprobante_url: string
    fecha_gasto: string
    created_at: string
    metodo_registro: string
    imagen_procesada_url: string
    titulo_tarea: string
    code_tarea: string
    email_usuario: string
    nombre_edificio: string
}

interface Stats {
    total: number
    sinFoto: number
    montoRiesgo: number
}

interface ComprobantesClientWrapperProps {
    initialData: any[]
    stats: Stats
}

export function ComprobantesClientWrapper({ initialData, stats }: ComprobantesClientWrapperProps) {
    const [search, setSearch] = useState("")
    const [filterFoto, setFilterFoto] = useState<"todos" | "con" | "sin">("todos")
    const [filterRol, setFilterRol] = useState<"todos" | "supervisor" | "trabajador">("todos")
    const [filterMonto, setFilterMonto] = useState<number>(0)

    const filteredData = useMemo(() => {
        return initialData.filter((item: Comprobante) => {
            // 1. Buscador Universal
            const matchesSearch =
                item.nombre_edificio?.toLowerCase().includes(search.toLowerCase()) ||
                item.titulo_tarea?.toLowerCase().includes(search.toLowerCase()) ||
                item.email_usuario?.toLowerCase().includes(search.toLowerCase()) ||
                item.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
                item.code_tarea?.toLowerCase().includes(search.toLowerCase())

            // 2. Filtro Foto
            const hasFoto = !!(item.comprobante_url || item.imagen_procesada_url)
            const matchesFoto =
                filterFoto === "todos" ||
                (filterFoto === "con" && hasFoto) ||
                (filterFoto === "sin" && !hasFoto)

            // 3. Filtro Rol (Auditado por vista_comprobantes_admin_v4)
            const matchesRol =
                filterRol === "todos" ||
                (filterRol === "supervisor" && item.rol_usuario === "supervisor") ||
                (filterRol === "trabajador" && item.rol_usuario === "trabajador")

            // 4. Filtro Monto
            const matchesMonto = !filterMonto || item.monto >= filterMonto

            return matchesSearch && matchesFoto && matchesRol && matchesMonto
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }, [initialData, search, filterFoto, filterRol, filterMonto])

    const currentMontoRiesgo = useMemo(() => {
        return filteredData
            .filter(g => !g.comprobante_url && !g.imagen_procesada_url)
            .reduce((sum, g) => sum + (g.monto || 0), 0)
    }, [filteredData])

    return (
        <div className="space-y-6">
            {/* KPIs Superiores Platinum */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                        <FileStack className="w-12 h-12" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gastos Analizados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredData.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.total} total en los últimos 3 meses
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 text-red-500 group-hover:scale-110 transition-transform">
                        <ShieldAlert className="w-12 h-12" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monto en Riesgo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(currentMontoRiesgo)}</div>
                        <p className="text-xs text-red-500 font-medium mt-1">
                            Faltan {filteredData.filter(g => !g.comprobante_url && !g.imagen_procesada_url).length} comprobantes
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 text-green-500 group-hover:scale-110 transition-transform">
                        <ImageIcon className="w-12 h-12" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Eficiencia Digital</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {filteredData.length > 0 ? Math.round((filteredData.filter(g => g.comprobante_url || g.imagen_procesada_url).length / filteredData.length) * 100) : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Con respaldo digital verificado
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Súper Filtro Inteligente */}
            <SuperFiltroInteligente
                onSearch={setSearch}
                onFilterFoto={setFilterFoto}
                onFilterRol={setFilterRol}
                onFilterMonto={setFilterMonto}
            />

            {/* Listado Responsivo estilo Wallet */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredData.length > 0 ? (
                    filteredData.map((gasto) => (
                        <ComprobanteCard key={gasto.id} gasto={gasto} />
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center">
                        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-600">No se encontraron comprobantes</h3>
                        <p className="text-slate-400">Prueba ajustando los filtros inteligentes.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
