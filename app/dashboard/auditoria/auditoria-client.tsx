"use client"

import { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
    Users, 
    Building2, 
    FileSpreadsheet, 
    ShieldAlert, 
    TrendingUp, 
    TrendingDown, 
    Search, 
    ArrowRightLeft, 
    CheckCircle2, 
    AlertTriangle,
    Layers,
    DollarSign
} from "lucide-react"
import type { 
    BalanceTareaDTO, 
    BalanceSupervisorAgrupado, 
    BalanceAdministradorAgrupado, 
    AuditoriaForenseLogDTO 
} from "./loader"

interface AuditoriaClientProps {
    user: any
    initialBalances: BalanceTareaDTO[]
    initialSupervisores: BalanceSupervisorAgrupado[]
    initialAdministradores: BalanceAdministradorAgrupado[]
    initialLogs: AuditoriaForenseLogDTO[]
}

export default function AuditoriaClient({
    user,
    initialBalances,
    initialSupervisores,
    initialAdministradores,
    initialLogs
}: AuditoriaClientProps) {
    const [tabActiva, setTabActiva] = useState("supervisores")
    const [busqueda, setBusqueda] = useState("")

    // Estados para Comparador Cara a Cara (Supervisores)
    const [supAId, setSupAId] = useState<string>(initialSupervisores[0]?.id_supervisor || "")
    const [supBId, setSupBId] = useState<string>(initialSupervisores[1]?.id_supervisor || "")

    // Estados para Comparador Cara a Cara (Administradores)
    const [admAId, setAdmAId] = useState<string>(initialAdministradores[0]?.id_administrador?.toString() || "")
    const [admBId, setAdmBId] = useState<string>(initialAdministradores[1]?.id_administrador?.toString() || "")

    // Objetos seleccionados para cara a cara
    const supervisorA = useMemo(() => initialSupervisores.find(s => s.id_supervisor === supAId), [initialSupervisores, supAId])
    const supervisorB = useMemo(() => initialSupervisores.find(s => s.id_supervisor === supBId), [initialSupervisores, supBId])

    const adminA = useMemo(() => initialAdministradores.find(a => a.id_administrador.toString() === admAId), [initialAdministradores, admAId])
    const adminB = useMemo(() => initialAdministradores.find(a => a.id_administrador.toString() === admBId), [initialAdministradores, admBId])

    // Filtro de balances completos
    const balancesFiltrados = useMemo(() => {
        if (!busqueda.trim()) return initialBalances
        const q = busqueda.toLowerCase().trim()
        return initialBalances.filter(b => 
            b.titulo_tarea.toLowerCase().includes(q) ||
            b.codigo_tarea.toLowerCase().includes(q) ||
            b.nombre_edificio.toLowerCase().includes(q) ||
            b.nombre_administrador.toLowerCase().includes(q) ||
            b.nombre_supervisor?.toLowerCase().includes(q)
        )
    }, [initialBalances, busqueda])

    // Totales de Alto Nivel — fuente: initialAdministradores (sin duplicacion por join de facturas)
    const totalCobradoGeneral = useMemo(() => initialAdministradores.reduce((acc, a) => acc + a.total_cobrado, 0), [initialAdministradores])
    const totalGastadoGeneral = useMemo(() => initialAdministradores.reduce((acc, a) => acc + a.gastos_totales + a.ganancia_supervisor_total, 0), [initialAdministradores])
    const totalGananciaEmpresa = useMemo(() => initialAdministradores.reduce((acc, a) => acc + a.ganancia_liquida, 0), [initialAdministradores])

    return (
        <div className="space-y-6">
            {/* Header del modulo */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        auditoria forense y balances ejecutivos
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        panel de control financiero, balance integral y trazabilidad inmutable de operaciones
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 font-mono text-xs">
                        soberania admin
                    </Badge>
                </div>
            </div>

            {/* Tarjetas KPI de Resumen General */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase font-medium">total cobrado real</CardDescription>
                        <CardTitle className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            ${Math.round(totalCobradoGeneral).toLocaleString("es-AR")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">ingresos liquidados en cuenta</span>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase font-medium">gastos reales obras</CardDescription>
                        <CardTitle className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            ${Math.round(totalGastadoGeneral).toLocaleString("es-AR")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">materiales + jornales liquidados</span>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase font-medium text-emerald-800 dark:text-emerald-400">
                            ganancia liquida total
                        </CardDescription>
                        <CardTitle className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            ${Math.round(totalGananciaEmpresa).toLocaleString("es-AR")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-xs text-emerald-700 dark:text-emerald-500">margen neto spc</span>
                    </CardContent>
                </Card>
            </div>

            {/* Pestañas de Auditoria */}
            <Tabs value={tabActiva} onValueChange={setTabActiva} className="w-full">
                <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full bg-zinc-100 dark:bg-zinc-900 p-1">
                    <TabsTrigger value="supervisores" className="text-xs sm:text-sm flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>supervisores</span>
                    </TabsTrigger>
                    <TabsTrigger value="administradores" className="text-xs sm:text-sm flex items-center gap-1.5">
                        <Building2 className="h-4 w-4" />
                        <span>administradores</span>
                    </TabsTrigger>
                    <TabsTrigger value="trazabilidad" className="text-xs sm:text-sm flex items-center gap-1.5">
                        <Layers className="h-4 w-4" />
                        <span>pb a cobrado</span>
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="text-xs sm:text-sm flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4" />
                        <span>logs forenses</span>
                    </TabsTrigger>
                </TabsList>

                {/* 1. SECCION SUPERVISORES */}
                <TabsContent value="supervisores" className="space-y-6 mt-4">
                    {/* Comparador Cara a Cara */}
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <ArrowRightLeft className="h-4 w-4 text-emerald-600" />
                                comparador cara a cara de supervisores
                            </CardTitle>
                            <CardDescription className="text-xs">
                                contrasta el rendimiento, rentabilidad y desvios entre dos supervisores
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">supervisor a</label>
                                    <Select value={supAId} onValueChange={setSupAId}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="seleccionar supervisor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {initialSupervisores.map(s => (
                                                <SelectItem key={s.id_supervisor} value={s.id_supervisor}>
                                                    {s.nombre_supervisor} ({s.email_supervisor})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">supervisor b</label>
                                    <Select value={supBId} onValueChange={setSupBId}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="seleccionar supervisor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {initialSupervisores.map(s => (
                                                <SelectItem key={s.id_supervisor} value={s.id_supervisor}>
                                                    {s.nombre_supervisor} ({s.email_supervisor})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {supervisorA && supervisorB && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    {/* Tarjeta Supervisor A */}
                                    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-sm">{supervisorA.nombre_supervisor}</span>
                                            {supervisorA.es_propietario && (
                                                <Badge variant="secondary" className="text-[10px]">propietario</Badge>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <p className="text-zinc-500">ganancia spc</p>
                                                <p className="font-bold text-emerald-600 text-sm">
                                                    ${Math.round(supervisorA.ganancia_admin).toLocaleString("es-AR")}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">gastos reales</p>
                                                <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
                                                    ${Math.round(supervisorA.gastos_reales).toLocaleString("es-AR")}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">eficiencia pb</p>
                                                <p className={`font-semibold ${supervisorA.eficiencia_pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                    {supervisorA.eficiencia_pct}%
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">sobrecostos</p>
                                                <p className={`font-semibold ${supervisorA.sobrecostos_count > 0 ? "text-red-500" : "text-zinc-500"}`}>
                                                    {supervisorA.sobrecostos_count} (${Math.round(supervisorA.monto_sobrecostos).toLocaleString("es-AR")})
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tarjeta Supervisor B */}
                                    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-sm">{supervisorB.nombre_supervisor}</span>
                                            {supervisorB.es_propietario && (
                                                <Badge variant="secondary" className="text-[10px]">propietario</Badge>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <p className="text-zinc-500">ganancia spc</p>
                                                <p className="font-bold text-emerald-600 text-sm">
                                                    ${Math.round(supervisorB.ganancia_admin).toLocaleString("es-AR")}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">gastos reales</p>
                                                <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
                                                    ${Math.round(supervisorB.gastos_reales).toLocaleString("es-AR")}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">eficiencia pb</p>
                                                <p className={`font-semibold ${supervisorB.eficiencia_pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                    {supervisorB.eficiencia_pct}%
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">sobrecostos</p>
                                                <p className={`font-semibold ${supervisorB.sobrecostos_count > 0 ? "text-red-500" : "text-zinc-500"}`}>
                                                    {supervisorB.sobrecostos_count} (${Math.round(supervisorB.monto_sobrecostos).toLocaleString("es-AR")})
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tabla Ranking de Supervisores */}
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">ranking general de supervisores</CardTitle>
                            <CardDescription className="text-xs">ordenado por ganancia liquida dejada a la empresa</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-medium">
                                        <th className="p-3">supervisor</th>
                                        <th className="p-3 text-center">tareas liq.</th>
                                        <th className="p-3 text-right">presup. base</th>
                                        <th className="p-3 text-right">gastos reales</th>
                                        <th className="p-3 text-right">ganancia sup.</th>
                                        <th className="p-3 text-right font-bold text-emerald-600">ganancia spc</th>
                                        <th className="p-3 text-center">eficiencia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {initialSupervisores.map((sup, idx) => (
                                        <tr key={sup.id_supervisor} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                                            <td className="p-3">
                                                <div className="font-semibold">{sup.nombre_supervisor}</div>
                                                <div className="text-[10px] text-zinc-400 font-mono">{sup.email_supervisor}</div>
                                            </td>
                                            <td className="p-3 text-center">{sup.tareas_liquidadas} / {sup.tareas_totales}</td>
                                            <td className="p-3 text-right">${Math.round(sup.total_pb).toLocaleString("es-AR")}</td>
                                            <td className="p-3 text-right">${Math.round(sup.gastos_reales).toLocaleString("es-AR")}</td>
                                            <td className="p-3 text-right">${Math.round(sup.ganancia_supervisor).toLocaleString("es-AR")}</td>
                                            <td className="p-3 text-right font-bold text-emerald-600">
                                                ${Math.round(sup.ganancia_admin).toLocaleString("es-AR")}
                                            </td>
                                            <td className="p-3 text-center">
                                                <Badge variant="outline" className={sup.eficiencia_pct >= 0 ? "border-emerald-500 text-emerald-600" : "border-red-500 text-red-500"}>
                                                    {sup.eficiencia_pct}%
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {initialSupervisores.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-4 text-center text-zinc-400">no hay datos de liquidaciones de supervisores</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 2. SECCION ADMINISTRADORES */}
                <TabsContent value="administradores" className="space-y-6 mt-4">
                    {/* Comparador Cara a Cara */}
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <ArrowRightLeft className="h-4 w-4 text-emerald-600" />
                                comparador cara a cara de administradores
                            </CardTitle>
                            <CardDescription className="text-xs">
                                compara la rentabilidad neta, volumen facturado y efectividad de cobro
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">administrador a</label>
                                    <Select value={admAId} onValueChange={setAdmAId}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="seleccionar administrador" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {initialAdministradores.map(a => (
                                                <SelectItem key={a.id_administrador} value={a.id_administrador.toString()}>
                                                    {a.nombre_administrador}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">administrador b</label>
                                    <Select value={admBId} onValueChange={setAdmBId}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="seleccionar administrador" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {initialAdministradores.map(a => (
                                                <SelectItem key={a.id_administrador} value={a.id_administrador.toString()}>
                                                    {a.nombre_administrador}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {adminA && adminB && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    {/* Admin A */}
                                    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                                        <span className="font-bold text-sm">{adminA.nombre_administrador}</span>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <p className="text-zinc-500">ganancia liquida real</p>
                                                <p className="font-bold text-emerald-600 text-sm">
                                                    ${Math.round(adminA.ganancia_liquida).toLocaleString("es-AR")}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">total cobrado</p>
                                                <p className="font-semibold text-sm">
                                                    ${Math.round(adminA.total_cobrado).toLocaleString("es-AR")}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">saldo pendiente</p>
                                                <p className="font-semibold text-amber-600">
                                                    ${Math.round(adminA.saldo_adeudado).toLocaleString("es-AR")}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">tasa cobro</p>
                                                <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                                                    {adminA.ratio_cobranza_pct}%
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">facturas pendientes</p>
                                                <p className={`font-semibold ${adminA.facturas_pendientes_count > 0 ? "text-amber-600" : "text-zinc-400"}`}>
                                                    {adminA.facturas_pendientes_count}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Admin B */}
                                    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                                        <span className="font-bold text-sm">{adminB.nombre_administrador}</span>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <p className="text-zinc-500">ganancia liquida real</p>
                                                <p className="font-bold text-emerald-600 text-sm">
                                                    ${Math.round(adminB.ganancia_liquida).toLocaleString("es-AR")}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">total cobrado</p>
                                                <p className="font-semibold text-sm">
                                                    ${Math.round(adminB.total_cobrado).toLocaleString("es-AR")}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">saldo pendiente</p>
                                                <p className="font-semibold text-amber-600">
                                                    ${Math.round(adminB.saldo_adeudado).toLocaleString("es-AR")}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">tasa cobro</p>
                                                <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                                                    {adminB.ratio_cobranza_pct}%
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">facturas pendientes</p>
                                                <p className={`font-semibold ${adminB.facturas_pendientes_count > 0 ? "text-amber-600" : "text-zinc-400"}`}>
                                                    {adminB.facturas_pendientes_count}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tabla Ranking de Administradores */}
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">rentabilidad por administrador</CardTitle>
                            <CardDescription className="text-xs">ordenado por ganancia liquida en mano (cobros menos gastos directos)</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-medium">
                                        <th className="p-3">administrador</th>
                                        <th className="p-3 text-center">facturas</th>
                                        <th className="p-3 text-center">pend.</th>
                                        <th className="p-3 text-right">facturado</th>
                                        <th className="p-3 text-right">cobrado</th>
                                        <th className="p-3 text-right">deuda pendiente</th>
                                        <th className="p-3 text-right">gastos obras</th>
                                        <th className="p-3 text-right font-bold text-emerald-600">ganancia liquida</th>
                                        <th className="p-3 text-center">cobranza %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {initialAdministradores.map((adm) => (
                                        <tr key={adm.id_administrador} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                                            <td className="p-3 font-semibold">{adm.nombre_administrador}</td>
                                            <td className="p-3 text-center">{adm.total_obras}</td>
                                            <td className="p-3 text-center">
                                                {adm.facturas_pendientes_count > 0
                                                    ? <span className="text-amber-600 font-semibold">{adm.facturas_pendientes_count}</span>
                                                    : <span className="text-zinc-400">—</span>
                                                }
                                            </td>
                                            <td className="p-3 text-right">${Math.round(adm.total_facturado).toLocaleString("es-AR")}</td>
                                            <td className="p-3 text-right font-semibold">${Math.round(adm.total_cobrado).toLocaleString("es-AR")}</td>
                                            <td className="p-3 text-right text-amber-600">${Math.round(adm.saldo_adeudado).toLocaleString("es-AR")}</td>
                                            <td className="p-3 text-right">${Math.round(adm.gastos_totales).toLocaleString("es-AR")}</td>
                                            <td className="p-3 text-right font-bold text-emerald-600">
                                                ${Math.round(adm.ganancia_liquida).toLocaleString("es-AR")}
                                            </td>
                                            <td className="p-3 text-center">
                                                <Badge variant="outline" className={adm.ratio_cobranza_pct >= 80 ? "border-emerald-500 text-emerald-600" : "border-amber-500 text-amber-600"}>
                                                    {adm.ratio_cobranza_pct}%
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {initialAdministradores.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="p-4 text-center text-zinc-400">no hay registros de administradores</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 3. SECCION TRAZABILIDAD (PB -> PF -> FACTURADO -> COBRADO) */}
                <TabsContent value="trazabilidad" className="space-y-4 mt-4">
                    <div className="flex items-center gap-2 max-w-sm">
                        <Search className="h-4 w-4 text-zinc-400" />
                        <Input
                            placeholder="buscar tarea, edificio, administrador o supervisor..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="h-9 text-xs"
                        />
                    </div>

                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">matriz de conversion comercial de obras</CardTitle>
                            <CardDescription className="text-xs">
                                comparacion del costo base original (pb) vs presupuesto cotizado (pf) vs facturado final vs cobrado efectivo
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-medium">
                                        <th className="p-3">tarea / edificio</th>
                                        <th className="p-3">supervisor</th>
                                        <th className="p-3 text-right">presup. base (pb)</th>
                                        <th className="p-3 text-right">presup. final (pf)</th>
                                        <th className="p-3 text-right">spread pf-pb</th>
                                        <th className="p-3 text-right">facturado</th>
                                        <th className="p-3 text-right font-bold text-emerald-600">cobrado real</th>
                                        <th className="p-3 text-right">gastos reales</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {balancesFiltrados.slice(0, 50).map((b) => (
                                        <tr key={b.id_tarea} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                                            <td className="p-3">
                                                <div className="font-semibold text-zinc-900 dark:text-zinc-100">{b.titulo_tarea}</div>
                                                <div className="text-[10px] text-zinc-500">{b.nombre_edificio} ({b.nombre_administrador})</div>
                                            </td>
                                            <td className="p-3 text-zinc-600 dark:text-zinc-400">
                                                {b.nombre_supervisor}
                                            </td>
                                            <td className="p-3 text-right">${Math.round(b.total_pb).toLocaleString("es-AR")}</td>
                                            <td className="p-3 text-right font-medium">${Math.round(b.total_pf).toLocaleString("es-AR")}</td>
                                            <td className="p-3 text-right text-emerald-600 font-semibold">
                                                +${Math.round(b.margen_comercial_pf_pb).toLocaleString("es-AR")}
                                            </td>
                                            <td className="p-3 text-right">${Math.round(b.total_facturado_neto).toLocaleString("es-AR")}</td>
                                            <td className="p-3 text-right font-bold text-emerald-600">
                                                ${Math.round(b.total_cobrado_real).toLocaleString("es-AR")}
                                            </td>
                                            <td className="p-3 text-right text-zinc-500">
                                                ${Math.round(b.gastos_reales_liquidacion).toLocaleString("es-AR")}
                                            </td>
                                        </tr>
                                    ))}
                                    {balancesFiltrados.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-4 text-center text-zinc-400">no se encontraron registros de obras</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 4. SECCION LOGS FORENSES INMUTABLES */}
                <TabsContent value="logs" className="space-y-4 mt-4">
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4 text-amber-500" />
                                registro forense de mutaciones y eliminaciones
                            </CardTitle>
                            <CardDescription className="text-xs">
                                auditoria inmutable de base de datos capturada por triggers sobre facturas, pagos, liquidaciones y ajustes
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-medium">
                                        <th className="p-3">fecha / hora</th>
                                        <th className="p-3">tabla</th>
                                        <th className="p-3">registro</th>
                                        <th className="p-3 text-center">operacion</th>
                                        <th className="p-3">usuario</th>
                                        <th className="p-3">detalle forense</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {initialLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                                            <td className="p-3 text-zinc-500 font-mono text-[11px]">
                                                {new Date(log.created_at).toLocaleString("es-AR")}
                                            </td>
                                            <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-200">{log.tabla_afectada}</td>
                                            <td className="p-3 font-mono text-[11px]">{log.id_registro}</td>
                                            <td className="p-3 text-center">
                                                <Badge variant="outline" className={log.operacion === 'DELETE' ? "border-red-500 text-red-600 bg-red-50/50 dark:bg-red-950/20" : "border-amber-500 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20"}>
                                                    {log.operacion}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-zinc-600 dark:text-zinc-400">
                                                {log.usuario_email || 'sistema / backend'}
                                            </td>
                                            <td className="p-3 font-mono text-[10px] max-w-xs truncate text-zinc-400">
                                                {JSON.stringify(log.datos_anteriores)}
                                            </td>
                                        </tr>
                                    ))}
                                    {initialLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-4 text-center text-zinc-400">no hay mutaciones registradas aun en la tabla de auditoria</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
