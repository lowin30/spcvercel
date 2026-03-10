"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPICard } from "@/components/platinum/kpi-card"
import { PageHeader } from "@/components/platinum/page-header"
import { ToolGastoPlatinum } from "@/components/platinum/tools/ToolGastoPlatinum"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Loader2, X, ArrowLeft, Building2, History, Wallet, Clock, AlertCircle, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { UserSessionData } from "@/lib/types"


interface Tarea {
    id: number
    titulo: string
    code: string
}

interface Liquidacion {
    gastos_reembolsados: number;
    created_at: string;
    total_pagar: number;
}

interface ParteTrabajoConSalario {
    id: number;
    fecha: string;
    tipo_jornada: 'dia_completo' | 'medio_dia';
    id_tarea: number;
    id_trabajador: string;
    liquidado: boolean;
    titulo_tarea: string;
    code_tarea: string;
    nombre_edificio: string;
    salario_diario: number;
}

interface ResumenPorTarea {
    id_tarea: number;
    titulo_tarea: string;
    code_tarea: string;
    gastos_monto: number;
    gastos_count: number;
    jornales_monto: number;
    jornales_dias: number;
    total_tarea: number;
}

interface GastoCompleto {
    id: number
    id_tarea: number
    titulo_tarea: string
    code_tarea: string
    monto: number
    fecha_gasto: string
    liquidado: boolean
    id_usuario: string
    [key: string]: any
}

interface GastosPageClientProps {
    userDetails: UserSessionData
    initialGastos: GastoCompleto[]
    initialJornales: ParteTrabajoConSalario[]
    initialLastLiquidation: Liquidacion | null
    initialTareas: Tarea[]
}

export default function GastosPageClient({
    userDetails,
    initialGastos,
    initialJornales,
    initialLastLiquidation,
    initialTareas,
}: GastosPageClientProps) {
    const router = useRouter()

    // ... (logic remains similar, focusing on the UI revamp)
    const { weekStats, pendingStats } = useMemo(() => {
        const hoy = new Date()
        const inicioSemana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - hoy.getDay() + (hoy.getDay() === 0 ? -6 : 1))
        inicioSemana.setHours(0, 0, 0, 0)

        const gastosDeLaSemana = initialGastos.filter(g => new Date(g.fecha_gasto) >= inicioSemana)
        const gastosPendientesAnteriores = initialGastos.filter(g => new Date(g.fecha_gasto) < inicioSemana)

        return {
            weekStats: { total: gastosDeLaSemana.reduce((sum, g) => sum + g.monto, 0), count: gastosDeLaSemana.length },
            pendingStats: { total: gastosPendientesAnteriores.reduce((sum, g) => sum + g.monto, 0), count: gastosPendientesAnteriores.length }
        }
    }, [initialGastos])

    const { totalJornales, totalDias } = useMemo(() => {
        const monto = initialJornales.reduce((sum, p) => sum + (p.tipo_jornada === 'dia_completo' ? p.salario_diario : p.salario_diario * 0.5), 0)
        const dias = initialJornales.reduce((sum, p) => sum + (p.tipo_jornada === 'dia_completo' ? 1 : 0.5), 0)
        return { totalJornales: monto, totalDias: dias }
    }, [initialJornales])

    const desglosePorTarea = useMemo(() => {
        const tareaMap: Record<number, ResumenPorTarea> = {}
        initialGastos.forEach(g => {
            if (!tareaMap[g.id_tarea]) tareaMap[g.id_tarea] = { id_tarea: g.id_tarea, titulo_tarea: g.titulo_tarea, code_tarea: g.code_tarea, gastos_monto: 0, gastos_count: 0, jornales_monto: 0, jornales_dias: 0, total_tarea: 0 }
            tareaMap[g.id_tarea].gastos_monto += g.monto
            tareaMap[g.id_tarea].gastos_count++
        })
        initialJornales.forEach(p => {
            if (!tareaMap[p.id_tarea]) tareaMap[p.id_tarea] = { id_tarea: p.id_tarea, titulo_tarea: p.titulo_tarea, code_tarea: p.code_tarea, gastos_monto: 0, gastos_count: 0, jornales_monto: 0, jornales_dias: 0, total_tarea: 0 }
            const m = p.tipo_jornada === 'dia_completo' ? p.salario_diario : p.salario_diario * 0.5
            const d = p.tipo_jornada === 'dia_completo' ? 1 : 0.5
            tareaMap[p.id_tarea].jornales_monto += m
            tareaMap[p.id_tarea].jornales_dias += d
        })
        return Object.values(tareaMap).map(t => ({ ...t, total_tarea: t.gastos_monto + t.jornales_monto })).sort((a, b) => b.total_tarea - a.total_tarea)
    }, [initialGastos, initialJornales])

    return (
        <div className="space-y-4 pb-20">
            {/* Header Platinum */}
            <PageHeader
                title="Mis"
                highlight="Gastos"
                subtitle="Seguimiento de comprobantes, jornales y liquidaciones pendientes."
            />

            {/* Dashboard KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                <KPICard
                    label="Semana Actual"
                    value={`$${weekStats.total.toLocaleString()}`}
                    icon={Wallet}
                    color="text-green-500"
                    bg="bg-green-500/10"
                    description={`${weekStats.count} gastos`}
                />
                <KPICard
                    label="Pendientes"
                    value={`$${pendingStats.total.toLocaleString()}`}
                    icon={AlertCircle}
                    color="text-amber-500"
                    bg="bg-amber-500/10"
                    description={`${pendingStats.count} anteriores`}
                />
                <KPICard
                    label="Jornales"
                    value={`$${totalJornales.toLocaleString()}`}
                    icon={Clock}
                    color="text-violet-500"
                    bg="bg-violet-500/10"
                    description="Previstos"
                />
                <KPICard
                    label="Días Laborados"
                    value={totalDias}
                    icon={CalendarIcon}
                    color="text-blue-500"
                    bg="bg-blue-500/10"
                    description="Total periodo"
                />
            </div>

            {/* LA TOOL PLATINUM UNIVERSAL */}
            <div className="bg-background/50 backdrop-blur-sm rounded-3xl border border-border/50 shadow-xl overflow-hidden p-2 sm:p-6">
                <ToolGastoPlatinum
                    userId={userDetails.id}
                    userRole={userDetails.rol as any}
                    initialData={initialGastos as any}
                />
            </div>

            {/* Desglose por Proyecto (Mantenemos como insight adicional) */}
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-4">Resumen de Proyectos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {desglosePorTarea.map((item) => (
                        <div key={item.id_tarea} className="flex flex-col p-4 rounded-2xl bg-card border border-border/40 hover:border-violet-500/30 transition-all gap-3 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-violet-600/70">{item.code_tarea}</p>
                                    <h4 className="text-sm font-bold truncate leading-tight">{item.titulo_tarea}</h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-foreground">${item.total_tarea.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

