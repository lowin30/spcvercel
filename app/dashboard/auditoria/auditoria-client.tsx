"use client"

import { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { generarAuditoriaPDF } from "@/lib/pdf-auditoria-generator"
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
    DollarSign,
    Filter,
    X,
    Building,
    FileDown,
    Loader2,
} from "lucide-react"
import type { 
    BalanceTareaDTO, 
    BalanceSupervisorAgrupado, 
    BalanceAdministradorAgrupado, 
    AuditoriaForenseLogDTO,
    BalanceGlobalDTO
} from "./loader"

interface AuditoriaClientProps {
    user: any
    initialBalances: BalanceTareaDTO[]
    initialSupervisores: BalanceSupervisorAgrupado[]
    initialAdministradores: BalanceAdministradorAgrupado[]
    initialLogs: AuditoriaForenseLogDTO[]
    totalesGlobales?: BalanceGlobalDTO
}

export default function AuditoriaClient({
    user,
    initialBalances,
    initialSupervisores,
    initialAdministradores,
    initialLogs,
    totalesGlobales
}: AuditoriaClientProps) {
    const [tabActiva, setTabActiva] = useState("supervisores")
    const [busqueda, setBusqueda] = useState("")
    const [isExporting, setIsExporting] = useState(false)

    // Estados de Filtros Inteligentes
    const [mesDesde, setMesDesde] = useState<string>("todos")
    const [mesHasta, setMesHasta] = useState<string>("todos")
    const [filtroEdificio, setFiltroEdificio] = useState<string>("todos")
    const [filtroAdmin, setFiltroAdmin] = useState<string>("todos")
    const [filtroSupervisor, setFiltroSupervisor] = useState<string>("todos")

    // Opciones para desplegables derivadas de la data
    const mesesOpciones = useMemo(() => {
        const set = new Set<string>()
        initialBalances.forEach(b => {
            const fechaRef = b.fecha_ultimo_cobro || b.fecha_tarea
            if (fechaRef && fechaRef.length >= 7) {
                set.add(fechaRef.substring(0, 7))
            }
        })
        return Array.from(set).sort().reverse()
    }, [initialBalances])

    const edificiosOpciones = useMemo(() => {
        const set = new Set<string>()
        initialBalances.forEach(b => {
            if (b.nombre_edificio) set.add(b.nombre_edificio)
        })
        return Array.from(set).sort()
    }, [initialBalances])

    const adminsOpciones = useMemo(() => {
        const set = new Set<string>()
        initialBalances.forEach(b => {
            if (b.nombre_administrador) set.add(b.nombre_administrador)
        })
        return Array.from(set).sort()
    }, [initialBalances])

    const supervisoresOpciones = useMemo(() => {
        const set = new Set<string>()
        initialBalances.forEach(b => {
            if (b.nombre_supervisor && b.nombre_supervisor !== 'no asignado') {
                set.add(b.nombre_supervisor)
            }
        })
        return Array.from(set).sort()
    }, [initialBalances])

    const hayFiltroActivo = mesDesde !== "todos" || mesHasta !== "todos" || filtroEdificio !== "todos" || filtroAdmin !== "todos" || filtroSupervisor !== "todos" || busqueda.trim() !== ""

    const limpiarFiltros = () => {
        setMesDesde("todos")
        setMesHasta("todos")
        setFiltroEdificio("todos")
        setFiltroAdmin("todos")
        setFiltroSupervisor("todos")
        setBusqueda("")
    }

    const aplicarPresetMes = (preset: 'ultimos-2' | 'ultimos-4' | 'ene-jun-2026' | 'este-ano' | 'todo') => {
        if (preset === 'todo') {
            setMesDesde("todos")
            setMesHasta("todos")
            return
        }
        if (preset === 'ultimos-2') {
            const hasta = mesesOpciones[0] || "todos"
            const desde = mesesOpciones[1] || hasta
            setMesDesde(desde)
            setMesHasta(hasta)
            return
        }
        if (preset === 'ultimos-4') {
            const hasta = mesesOpciones[0] || "todos"
            const desde = mesesOpciones[3] || mesesOpciones[mesesOpciones.length - 1] || hasta
            setMesDesde(desde)
            setMesHasta(hasta)
            return
        }
        if (preset === 'ene-jun-2026') {
            setMesDesde("2026-01")
            setMesHasta("2026-06")
            return
        }
        if (preset === 'este-ano') {
            setMesDesde("2026-01")
            setMesHasta("2026-12")
            return
        }
    }

    // Filtro multinivel de balances completos
    const balancesFiltrados = useMemo(() => {
        return initialBalances.filter(b => {
            if (busqueda.trim()) {
                const q = busqueda.toLowerCase().trim()
                const matchTxt = b.titulo_tarea.toLowerCase().includes(q) ||
                    b.codigo_tarea.toLowerCase().includes(q) ||
                    b.nombre_edificio.toLowerCase().includes(q) ||
                    b.nombre_administrador.toLowerCase().includes(q) ||
                    (b.nombre_supervisor?.toLowerCase().includes(q) ?? false)
                if (!matchTxt) return false
            }
            if (mesDesde !== "todos" || mesHasta !== "todos") {
                const fechaRef = b.fecha_ultimo_cobro || b.fecha_tarea
                if (!fechaRef || fechaRef.length < 7) return false
                const mesRef = fechaRef.substring(0, 7)
                if (mesDesde !== "todos" && mesRef < mesDesde) return false
                if (mesHasta !== "todos" && mesRef > mesHasta) return false
            }
            if (filtroEdificio !== "todos") {
                if (b.nombre_edificio !== filtroEdificio) return false
            }
            if (filtroAdmin !== "todos") {
                if (b.nombre_administrador !== filtroAdmin) return false
            }
            if (filtroSupervisor !== "todos") {
                if (b.nombre_supervisor !== filtroSupervisor) return false
            }
            return true
        })
    }, [initialBalances, busqueda, mesDesde, mesHasta, filtroEdificio, filtroAdmin, filtroSupervisor])

    // Reagregacion por edificio reactiva al filtro (matriz simbiotica real)
    const edificiosAgrupados = useMemo(() => {
        const map = new Map<string, {
            nombre_edificio: string
            nombre_administrador: string
            tareas_totales: number
            total_facturado: number
            total_ajustes: number
            gastos_totales: number
            ganancia_supervisor: number
            ganancia_neta_spc: number
            ganancia_combinada: number
            margen_spc_pct: number
            margen_supervisor_pct: number
        }>()

        balancesFiltrados.forEach(b => {
            const key = b.nombre_edificio || 'sin edificio'
            if (!map.has(key)) {
                map.set(key, {
                    nombre_edificio: key,
                    nombre_administrador: b.nombre_administrador || 'sin admin',
                    tareas_totales: 0,
                    total_facturado: 0,
                    total_ajustes: 0,
                    gastos_totales: 0,
                    ganancia_supervisor: 0,
                    ganancia_neta_spc: 0,
                    ganancia_combinada: 0,
                    margen_spc_pct: 0,
                    margen_supervisor_pct: 0
                })
            }
            const item = map.get(key)!
            item.tareas_totales += 1
            item.total_facturado += b.total_factura_base
            item.total_ajustes += b.total_ajustes_aprobados
            item.gastos_totales += b.gastos_reales_liquidacion
            item.ganancia_supervisor += b.ganancia_supervisor
            item.ganancia_neta_spc += b.ganancia_neta_total_spc
        })

        return Array.from(map.values()).map(e => {
            const combinada = e.ganancia_neta_spc + e.ganancia_supervisor
            const margenSpc = e.total_facturado > 0 ? Math.round((e.ganancia_neta_spc / e.total_facturado) * 100) : 0
            const margenSup = e.total_facturado > 0 ? Math.round((e.ganancia_supervisor / e.total_facturado) * 100) : 0
            return {
                ...e,
                ganancia_combinada: combinada,
                margen_spc_pct: margenSpc,
                margen_supervisor_pct: margenSup
            }
        }).sort((a, b) => b.ganancia_neta_spc - a.ganancia_neta_spc)
    }, [balancesFiltrados])

    // Supervisores dinamicos reactivos a los filtros
    const supervisoresDinamicos = useMemo(() => {
        if (!hayFiltroActivo) return initialSupervisores

        const supMap = new Map<string, BalanceSupervisorAgrupado>()
        initialSupervisores.forEach(s => {
            supMap.set(s.id_supervisor, {
                ...s,
                tareas_totales: 0,
                tareas_liquidadas: 0,
                total_pb: 0,
                gastos_reales: 0,
                gastos_pendientes: s.gastos_pendientes,
                ganancia_supervisor: 0,
                ganancia_admin: 0,
                total_cobrado_cliente: 0,
                ganancia_real_spc: 0,
                eficiencia_pct: 0
            })
        })

        balancesFiltrados.forEach(b => {
            if (!b.id_supervisor || !supMap.has(b.id_supervisor)) return
            const sup = supMap.get(b.id_supervisor)!
            sup.tareas_totales += 1
            if (b.id_liquidacion) {
                sup.tareas_liquidadas += 1
            }
            sup.total_pb += b.total_pb
            sup.gastos_reales += b.gastos_reales_liquidacion
            sup.ganancia_supervisor += b.ganancia_supervisor
            sup.ganancia_admin += b.ganancia_admin
            sup.total_cobrado_cliente += b.total_cobrado_real
        })

        return Array.from(supMap.values())
            .filter(s => s.tareas_totales > 0 || s.tareas_liquidadas > 0)
            .map(s => {
                const eficiencia = s.total_pb > 0 
                    ? Math.round(((s.total_pb - s.gastos_reales) / s.total_pb) * 100)
                    : 0
                const gananciaReal = Math.round(s.total_cobrado_cliente - s.gastos_reales - s.ganancia_supervisor)
                return {
                    ...s,
                    ganancia_real_spc: gananciaReal,
                    eficiencia_pct: eficiencia
                }
            })
            .sort((a, b) => b.ganancia_real_spc - a.ganancia_real_spc)
    }, [hayFiltroActivo, initialSupervisores, balancesFiltrados])

    // Administradores dinamicos reactivos a los filtros
    const administradoresDinamicos = useMemo(() => {
        if (!hayFiltroActivo) return initialAdministradores

        const admMap = new Map<number, BalanceAdministradorAgrupado>()
        initialAdministradores.forEach(a => {
            admMap.set(a.id_administrador, {
                ...a,
                total_obras: 0,
                tareas_totales: 0,
                tareas_cobradas_100: 0,
                facturas_pendientes_count: 0,
                total_pb: 0,
                total_pf: 0,
                total_facturado: 0,
                total_cobrado: 0,
                saldo_adeudado: 0,
                gastos_totales: 0,
                ganancia_supervisor_total: 0,
                costo_total_obras: 0,
                ganancia_liquida: 0,
                aporte_spc_pct: 0,
                margen_neto_pct: 0,
                ratio_cobranza_pct: 0
            })
        })

        balancesFiltrados.forEach(b => {
            if (!b.id_administrador || !admMap.has(b.id_administrador)) return
            const adm = admMap.get(b.id_administrador)!
            adm.tareas_totales += 1
            adm.total_obras += 1
            if (b.total_cobrado_real > 0 && b.saldo_pendiente_factura === 0) {
                adm.tareas_cobradas_100 += 1
            }
            if (b.saldo_pendiente_factura > 0) {
                adm.facturas_pendientes_count += 1
            }
            adm.total_pb += b.total_pb
            adm.total_pf += b.total_pf
            adm.total_facturado += b.total_facturado_neto
            adm.total_cobrado += b.total_cobrado_real
            adm.saldo_adeudado += b.saldo_pendiente_factura
            adm.gastos_totales += b.gastos_reales_liquidacion
            adm.ganancia_supervisor_total += b.ganancia_supervisor
        })

        const totalGananciaFiltrada = Array.from(admMap.values()).reduce((acc, a) => {
            const g = a.total_cobrado - a.gastos_totales - a.ganancia_supervisor_total
            return acc + (g > 0 ? g : 0)
        }, 0)

        return Array.from(admMap.values())
            .filter(a => a.tareas_totales > 0 || a.total_cobrado > 0 || a.total_facturado > 0)
            .map(a => {
                const ratio = a.total_facturado > 0 
                    ? Math.round((a.total_cobrado / a.total_facturado) * 100)
                    : 0
                const costoTotal = a.gastos_totales + a.ganancia_supervisor_total
                const gananciaLiquida = a.total_cobrado - costoTotal
                const aportePct = totalGananciaFiltrada > 0 && gananciaLiquida > 0
                    ? Math.round((gananciaLiquida / totalGananciaFiltrada) * 100)
                    : 0
                const margenNeto = a.total_cobrado > 0
                    ? Math.round((gananciaLiquida / a.total_cobrado) * 100)
                    : 0

                return {
                    ...a,
                    costo_total_obras: costoTotal,
                    ganancia_liquida: gananciaLiquida,
                    aporte_spc_pct: aportePct,
                    margen_neto_pct: margenNeto,
                    ratio_cobranza_pct: ratio
                }
            })
            .sort((a, b) => b.ganancia_liquida - a.ganancia_liquida)
    }, [hayFiltroActivo, initialAdministradores, balancesFiltrados])

    // Estados para Comparador Cara a Cara (Supervisores)
    const [supAId, setSupAId] = useState<string>(initialSupervisores[0]?.id_supervisor || "")
    const [supBId, setSupBId] = useState<string>(initialSupervisores[1]?.id_supervisor || "")

    // Estados para Comparador Cara a Cara (Administradores)
    const [admAId, setAdmAId] = useState<string>(initialAdministradores[0]?.id_administrador?.toString() || "")
    const [admBId, setAdmBId] = useState<string>(initialAdministradores[1]?.id_administrador?.toString() || "")

    // Objetos seleccionados para cara a cara vinculados a listas dinamicas
    const supervisorA = useMemo(() => supervisoresDinamicos.find(s => s.id_supervisor === supAId) || supervisoresDinamicos[0], [supervisoresDinamicos, supAId])
    const supervisorB = useMemo(() => supervisoresDinamicos.find(s => s.id_supervisor === supBId) || supervisoresDinamicos[1], [supervisoresDinamicos, supBId])

    const adminA = useMemo(() => administradoresDinamicos.find(a => a.id_administrador.toString() === admAId) || administradoresDinamicos[0], [administradoresDinamicos, admAId])
    const adminB = useMemo(() => administradoresDinamicos.find(a => a.id_administrador.toString() === admBId) || administradoresDinamicos[1], [administradoresDinamicos, admBId])

    // Totales de Alto Nivel — Reactivos al filtro activo con las metricas reales
    const totalFacturadoGeneral = useMemo(() => {
        if (hayFiltroActivo) {
            return balancesFiltrados.reduce((acc, b) => acc + b.total_factura_base, 0)
        }
        return totalesGlobales?.total_facturado ?? balancesFiltrados.reduce((acc, b) => acc + b.total_factura_base, 0)
    }, [hayFiltroActivo, balancesFiltrados, totalesGlobales])

    const totalAjustesGeneral = useMemo(() => {
        if (hayFiltroActivo) {
            return balancesFiltrados.reduce((acc, b) => acc + b.total_ajustes_aprobados, 0)
        }
        return totalesGlobales?.total_ajustes ?? balancesFiltrados.reduce((acc, b) => acc + b.total_ajustes_aprobados, 0)
    }, [hayFiltroActivo, balancesFiltrados, totalesGlobales])

    const totalGastadoGeneral = useMemo(() => {
        if (hayFiltroActivo) {
            return balancesFiltrados.reduce((acc, b) => acc + b.gastos_reales_liquidacion, 0)
        }
        return totalesGlobales?.total_gastado ?? balancesFiltrados.reduce((acc, b) => acc + b.gastos_reales_liquidacion, 0)
    }, [hayFiltroActivo, balancesFiltrados, totalesGlobales])

    const totalGananciaSupervisoresGeneral = useMemo(() => {
        if (hayFiltroActivo) {
            return balancesFiltrados.reduce((acc, b) => acc + b.ganancia_supervisor, 0)
        }
        return totalesGlobales?.total_ganancia_supervisores ?? balancesFiltrados.reduce((acc, b) => acc + b.ganancia_supervisor, 0)
    }, [hayFiltroActivo, balancesFiltrados, totalesGlobales])

    const totalGananciaEmpresa = useMemo(() => {
        if (hayFiltroActivo) {
            return balancesFiltrados.reduce((acc, b) => acc + b.ganancia_neta_total_spc, 0)
        }
        return totalesGlobales?.total_ganancia_spc ?? balancesFiltrados.reduce((acc, b) => acc + b.ganancia_neta_total_spc, 0)
    }, [hayFiltroActivo, balancesFiltrados, totalesGlobales])

    const totalCobradoGeneral = useMemo(() => {
        return balancesFiltrados.reduce((acc, b) => acc + b.total_cobrado_real, 0)
    }, [balancesFiltrados])

    const handleExportPDF = async () => {
        setIsExporting(true)
        try {
            const blob = await generarAuditoriaPDF({
                balances: balancesFiltrados,
                supervisores: supervisoresDinamicos,
                administradores: administradoresDinamicos,
                edificios: edificiosAgrupados,
                totalCobrado: totalCobradoGeneral,
                totalGastado: totalGastadoGeneral,
                totalGanancia: totalGananciaEmpresa,
                totalFacturado: totalFacturadoGeneral,
                totalAjustes: totalAjustesGeneral,
                totalGananciaSupervisores: totalGananciaSupervisoresGeneral,
                filtrosActivos: {
                    mesDesde,
                    mesHasta,
                    filtroEdificio,
                    filtroAdmin,
                    filtroSupervisor,
                    busqueda,
                },
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `auditoria-spc-${new Date().toISOString().slice(0, 10)}.pdf`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error("error al generar pdf de auditoria:", err)
        } finally {
            setIsExporting(false)
        }
    }

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
                <Button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 h-9 px-4 text-xs font-semibold bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                >
                    {isExporting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <FileDown className="h-3.5 w-3.5" />
                    )}
                    {isExporting ? "generando pdf..." : "exportar auditoria pdf"}
                </Button>
            </div>

            {/* Panel de Filtros Inteligentes Unificados */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-3">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            <Filter className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>filtros inteligentes de auditoria</span>
                            {hayFiltroActivo && (
                                <Badge variant="secondary" className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-0">
                                    filtro activo ({balancesFiltrados.length} obras)
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-zinc-400 font-medium mr-1 hidden sm:inline">atajos:</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => aplicarPresetMes('ultimos-2')}
                                className="h-6 px-2 text-[10px] bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                            >
                                ultimos 2m
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => aplicarPresetMes('ultimos-4')}
                                className="h-6 px-2 text-[10px] bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                            >
                                ultimos 4m
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => aplicarPresetMes('ene-jun-2026')}
                                className="h-6 px-2 text-[10px] bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                            >
                                ene - jun 2026
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => aplicarPresetMes('este-ano')}
                                className="h-6 px-2 text-[10px] bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                            >
                                todo 2026
                            </Button>
                            {hayFiltroActivo && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={limpiarFiltros}
                                    className="h-6 px-2 text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
                                >
                                    <X className="h-3 w-3" />
                                    <span>limpiar</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                        {/* 1. Desde mes */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-zinc-500 uppercase">desde mes</label>
                            <Select value={mesDesde} onValueChange={setMesDesde}>
                                <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                                    <SelectValue placeholder="inicio" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">inicio histórico</SelectItem>
                                    {mesesOpciones.map(m => (
                                        <SelectItem key={m} value={m}>
                                            {m}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 2. Hasta mes */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-zinc-500 uppercase">hasta mes</label>
                            <Select value={mesHasta} onValueChange={setMesHasta}>
                                <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                                    <SelectValue placeholder="fin" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">hasta el final</SelectItem>
                                    {mesesOpciones.map(m => (
                                        <SelectItem key={m} value={m}>
                                            {m}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 2. Edificio */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-zinc-500 uppercase">edificio</label>
                            <Select value={filtroEdificio} onValueChange={setFiltroEdificio}>
                                <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                                    <SelectValue placeholder="todos los edificios" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">todos los edificios ({edificiosOpciones.length})</SelectItem>
                                    {edificiosOpciones.map(e => (
                                        <SelectItem key={e} value={e}>
                                            {e}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 3. Administrador */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-zinc-500 uppercase">administrador</label>
                            <Select value={filtroAdmin} onValueChange={setFiltroAdmin}>
                                <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                                    <SelectValue placeholder="todos los admins" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">todos los admins ({adminsOpciones.length})</SelectItem>
                                    {adminsOpciones.map(a => (
                                        <SelectItem key={a} value={a}>
                                            {a}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 4. Supervisor */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-zinc-500 uppercase">supervisor</label>
                            <Select value={filtroSupervisor} onValueChange={setFiltroSupervisor}>
                                <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                                    <SelectValue placeholder="todos los supervisores" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">todos los supervisores ({supervisoresOpciones.length})</SelectItem>
                                    {supervisoresOpciones.map(s => (
                                        <SelectItem key={s} value={s}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 5. Buscador rapido */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-zinc-500 uppercase">busqueda libre</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
                                <Input
                                    placeholder="buscar tarea o edif..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="h-8 pl-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Tarjetas KPI de Resumen General — Metricas Reales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                    <CardHeader className="pb-1 pt-3 px-3">
                        <CardDescription className="text-[10px] uppercase font-semibold text-zinc-500">facturacion total obras</CardDescription>
                        <CardTitle className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                            ${Math.round(totalFacturadoGeneral).toLocaleString("es-AR")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-3 pt-0">
                        <span className="text-[10px] text-zinc-400">volumen facturado a consorcios</span>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                    <CardHeader className="pb-1 pt-3 px-3">
                        <CardDescription className="text-[10px] uppercase font-semibold text-zinc-500">gastos + ajustes 10%</CardDescription>
                        <CardTitle className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                            ${Math.round(totalGastadoGeneral + totalAjustesGeneral).toLocaleString("es-AR")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-3 pt-0">
                        <span className="text-[10px] text-zinc-400">
                            mat: ${Math.round(totalGastadoGeneral).toLocaleString("es-AR")} | aj: ${Math.round(totalAjustesGeneral).toLocaleString("es-AR")}
                        </span>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                    <CardHeader className="pb-1 pt-3 px-3">
                        <CardDescription className="text-[10px] uppercase font-semibold text-zinc-500">ganancia supervisores</CardDescription>
                        <CardTitle className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                            ${Math.round(totalGananciaSupervisoresGeneral).toLocaleString("es-AR")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-3 pt-0">
                        <span className="text-[10px] text-zinc-400">honorarios netos liquidados</span>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                    <CardHeader className="pb-1 pt-3 px-3">
                        <CardDescription className="text-[10px] uppercase font-semibold text-emerald-800 dark:text-emerald-400">
                            ganancia neta spc
                        </CardDescription>
                        <CardTitle className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            ${Math.round(totalGananciaEmpresa).toLocaleString("es-AR")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 px-3 pt-0">
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-500">
                            margen: {totalFacturadoGeneral > 0 ? Math.round((totalGananciaEmpresa / totalFacturadoGeneral) * 100) : 0}% sobre facturacion
                        </span>
                    </CardContent>
                </Card>
            </div>

            {/* Pestañas de Auditoria */}
            <Tabs value={tabActiva} onValueChange={setTabActiva} className="w-full">
                <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full bg-zinc-100 dark:bg-zinc-900 p-1">
                    <TabsTrigger value="supervisores" className="text-xs sm:text-sm flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>supervisores</span>
                    </TabsTrigger>
                    <TabsTrigger value="administradores" className="text-xs sm:text-sm flex items-center gap-1.5">
                        <Building2 className="h-4 w-4" />
                        <span>administradores</span>
                    </TabsTrigger>
                    <TabsTrigger value="edificios" className="text-xs sm:text-sm flex items-center gap-1.5">
                        <Building className="h-4 w-4" />
                        <span>edificios</span>
                    </TabsTrigger>
                    <TabsTrigger value="trazabilidad" className="text-xs sm:text-sm flex items-center gap-1.5">
                        <Layers className="h-4 w-4" />
                        <span>eficiencia por tarea</span>
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
                                            {supervisoresDinamicos.map(s => (
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
                                            {supervisoresDinamicos.map(s => (
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
                                                <p className="text-zinc-500">ganancia real spc</p>
                                                <p className="font-bold text-emerald-600 text-sm">
                                                    ${Math.round(supervisorA.ganancia_real_spc).toLocaleString("es-AR")}
                                                </p>
                                                <p className="text-[10px] text-zinc-400">pb: ${Math.round(supervisorA.ganancia_admin).toLocaleString("es-AR")}</p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">cobrado clientes</p>
                                                <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
                                                    ${Math.round(supervisorA.total_cobrado_cliente).toLocaleString("es-AR")}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">gastos reales</p>
                                                <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
                                                    ${Math.round(supervisorA.gastos_reales).toLocaleString("es-AR")}
                                                </p>
                                                {supervisorA.gastos_pendientes > 0 && (
                                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                                        pend: ${Math.round(supervisorA.gastos_pendientes).toLocaleString("es-AR")}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">eficiencia pb</p>
                                                <p className={`font-semibold ${supervisorA.eficiencia_pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                    {supervisorA.eficiencia_pct}%
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
                                                <p className="text-zinc-500">ganancia real spc</p>
                                                <p className="font-bold text-emerald-600 text-sm">
                                                    ${Math.round(supervisorB.ganancia_real_spc).toLocaleString("es-AR")}
                                                </p>
                                                <p className="text-[10px] text-zinc-400">pb: ${Math.round(supervisorB.ganancia_admin).toLocaleString("es-AR")}</p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">cobrado clientes</p>
                                                <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
                                                    ${Math.round(supervisorB.total_cobrado_cliente).toLocaleString("es-AR")}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">gastos reales</p>
                                                <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
                                                    ${Math.round(supervisorB.gastos_reales).toLocaleString("es-AR")}
                                                </p>
                                                {supervisorB.gastos_pendientes > 0 && (
                                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                                        pend: ${Math.round(supervisorB.gastos_pendientes).toLocaleString("es-AR")}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">eficiencia pb</p>
                                                <p className={`font-semibold ${supervisorB.eficiencia_pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                    {supervisorB.eficiencia_pct}%
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
                            <CardDescription className="text-xs">ordenado por ganancia liquida total dejada a la empresa</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-medium">
                                        <th className="p-3">supervisor</th>
                                        <th className="p-3 text-center">tareas liq.</th>
                                        <th className="p-3 text-right">presup. base</th>
                                        <th className="p-3 text-right">gastos reales</th>
                                        <th className="p-3 text-right text-amber-600 dark:text-amber-400">gastos pend.</th>
                                        <th className="p-3 text-right">ganancia sup.</th>
                                        <th className="p-3 text-right">cobrado cliente</th>
                                        <th className="p-3 text-right font-bold text-emerald-600">ganancia real spc</th>
                                        <th className="p-3 text-center">eficiencia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {supervisoresDinamicos.map((sup, idx) => (
                                        <tr key={sup.id_supervisor} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                                            <td className="p-3">
                                                <div className="font-semibold">{sup.nombre_supervisor}</div>
                                                <div className="text-[10px] text-zinc-400 font-mono">{sup.email_supervisor}</div>
                                            </td>
                                            <td className="p-3 text-center">{sup.tareas_liquidadas} / {sup.tareas_totales}</td>
                                            <td className="p-3 text-right">${Math.round(sup.total_pb).toLocaleString("es-AR")}</td>
                                            <td className="p-3 text-right">${Math.round(sup.gastos_reales).toLocaleString("es-AR")}</td>
                                            <td className="p-3 text-right">
                                                {sup.gastos_pendientes > 0 ? (
                                                    <span className="font-medium text-amber-600 dark:text-amber-400">
                                                        ${Math.round(sup.gastos_pendientes).toLocaleString("es-AR")}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400">$0</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">${Math.round(sup.ganancia_supervisor).toLocaleString("es-AR")}</td>
                                            <td className="p-3 text-right font-medium text-zinc-700 dark:text-zinc-300">
                                                ${Math.round(sup.total_cobrado_cliente).toLocaleString("es-AR")}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="font-bold text-emerald-600">
                                                    ${Math.round(sup.ganancia_real_spc).toLocaleString("es-AR")}
                                                </div>
                                                <div className="text-[10px] text-zinc-400">
                                                    pb: ${Math.round(sup.ganancia_admin).toLocaleString("es-AR")}
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <Badge variant="outline" className={sup.eficiencia_pct >= 0 ? "border-emerald-500 text-emerald-600" : "border-red-500 text-red-500"}>
                                                    {sup.eficiencia_pct}%
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {supervisoresDinamicos.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="p-4 text-center text-zinc-400">no hay datos de liquidaciones de supervisores para los filtros seleccionados</td>
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
                                            {administradoresDinamicos.map(a => (
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
                                            {administradoresDinamicos.map(a => (
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
                                                <p className="text-zinc-500">aporte a spc</p>
                                                <p className="font-bold text-emerald-600 text-sm">
                                                    {adminA.aporte_spc_pct}%
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
                                                <p className="text-zinc-500">costo obras total</p>
                                                <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                                                    ${Math.round(adminA.costo_total_obras).toLocaleString("es-AR")}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">tareas cerradas</p>
                                                <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                                                    {adminA.tareas_cobradas_100} / {adminA.tareas_totales}
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
                                                <p className="text-zinc-500">aporte a spc</p>
                                                <p className="font-bold text-emerald-600 text-sm">
                                                    {adminB.aporte_spc_pct}%
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
                                                <p className="text-zinc-500">costo obras total</p>
                                                <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                                                    ${Math.round(adminB.costo_total_obras).toLocaleString("es-AR")}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-zinc-500">tareas cerradas</p>
                                                <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                                                    {adminB.tareas_cobradas_100} / {adminB.tareas_totales}
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
                            <CardDescription className="text-xs">ordenado por ganancia liquida en mano (cobros menos costos totales de obra)</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-medium">
                                        <th className="p-3">administrador</th>
                                        <th className="p-3 text-center">tareas cerradas</th>
                                        <th className="p-3 text-right">facturado</th>
                                        <th className="p-3 text-right">cobrado</th>
                                        <th className="p-3 text-right">deuda pendiente</th>
                                        <th className="p-3 text-right">costo obras</th>
                                        <th className="p-3 text-right font-bold text-emerald-600">ganancia liquida</th>
                                        <th className="p-3 text-center font-bold text-emerald-600">aporte spc %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {administradoresDinamicos.map((adm) => (
                                        <tr key={adm.id_administrador} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                                            <td className="p-3 font-semibold">{adm.nombre_administrador}</td>
                                            <td className="p-3 text-center">
                                                <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                                                    {adm.tareas_cobradas_100} / {adm.tareas_totales}
                                                </div>
                                                <div className="text-[10px] text-zinc-400">
                                                    {adm.total_obras} facturas
                                                </div>
                                            </td>
                                            <td className="p-3 text-right">${Math.round(adm.total_facturado).toLocaleString("es-AR")}</td>
                                            <td className="p-3 text-right font-semibold">${Math.round(adm.total_cobrado).toLocaleString("es-AR")}</td>
                                            <td className="p-3 text-right text-amber-600">
                                                {adm.saldo_adeudado > 0 ? (
                                                    `$${Math.round(adm.saldo_adeudado).toLocaleString("es-AR")}`
                                                ) : (
                                                    <span className="text-zinc-400">$0</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="font-medium text-zinc-800 dark:text-zinc-200">
                                                    ${Math.round(adm.costo_total_obras).toLocaleString("es-AR")}
                                                </div>
                                                <div className="text-[10px] text-zinc-400">
                                                    mat: ${Math.round(adm.gastos_totales).toLocaleString("es-AR")} / sup: ${Math.round(adm.ganancia_supervisor_total).toLocaleString("es-AR")}
                                                </div>
                                            </td>
                                            <td className="p-3 text-right font-bold text-emerald-600">
                                                ${Math.round(adm.ganancia_liquida).toLocaleString("es-AR")}
                                            </td>
                                            <td className="p-3 text-center">
                                                <Badge variant="outline" className={adm.aporte_spc_pct > 0 ? "border-emerald-500 text-emerald-600 font-bold" : "border-zinc-400 text-zinc-400"}>
                                                    {adm.aporte_spc_pct}%
                                                </Badge>
                                                <div className="text-[10px] text-zinc-400 mt-0.5">
                                                    margen: {adm.margen_neto_pct}%
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {administradoresDinamicos.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-4 text-center text-zinc-400">no hay registros de administradores para los filtros seleccionados</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 3. SECCION EDIFICIOS (RANKING Y RENTABILIDAD POR EDIFICIO) */}
                <TabsContent value="edificios" className="space-y-4 mt-4">
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Building className="h-4 w-4 text-emerald-600" />
                                rentabilidad simbiotica por edificio (spc vs supervisor)
                            </CardTitle>
                            <CardDescription className="text-xs">
                                ranking de consorcios con medicion de doble beneficio: dinero limpio para el supervisor y para spc
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-medium">
                                        <th className="p-3">edificio</th>
                                        <th className="p-3">administrador</th>
                                        <th className="p-3 text-center">obras</th>
                                        <th className="p-3 text-right">facturado</th>
                                        <th className="p-3 text-right">ajustes 10%</th>
                                        <th className="p-3 text-right">materiales</th>
                                        <th className="p-3 text-right font-bold text-blue-600">ganancia sup.</th>
                                        <th className="p-3 text-right font-bold text-emerald-600">ganancia neta spc</th>
                                        <th className="p-3 text-center">% margen spc</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {edificiosAgrupados.map((e) => (
                                        <tr key={e.nombre_edificio} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                                            <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">
                                                {e.nombre_edificio}
                                            </td>
                                            <td className="p-3 text-zinc-600 dark:text-zinc-400">
                                                {e.nombre_administrador}
                                            </td>
                                            <td className="p-3 text-center font-mono font-medium">
                                                {e.tareas_totales}
                                            </td>
                                            <td className="p-3 text-right font-medium">
                                                ${Math.round(e.total_facturado).toLocaleString("es-AR")}
                                            </td>
                                            <td className="p-3 text-right text-amber-600">
                                                ${Math.round(e.total_ajustes).toLocaleString("es-AR")}
                                            </td>
                                            <td className="p-3 text-right text-zinc-500">
                                                ${Math.round(e.gastos_totales).toLocaleString("es-AR")}
                                            </td>
                                            <td className="p-3 text-right font-bold text-blue-600">
                                                ${Math.round(e.ganancia_supervisor).toLocaleString("es-AR")}
                                            </td>
                                            <td className="p-3 text-right font-bold text-emerald-600">
                                                ${Math.round(e.ganancia_neta_spc).toLocaleString("es-AR")}
                                            </td>
                                            <td className="p-3 text-center">
                                                <Badge variant="outline" className={e.margen_spc_pct >= 50 ? "border-emerald-500 text-emerald-600 font-bold" : "border-zinc-400 text-zinc-400"}>
                                                    {e.margen_spc_pct}%
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {edificiosAgrupados.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="p-4 text-center text-zinc-400">no hay registros de edificios para los filtros seleccionados</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 4. SECCION EFICIENCIA POR TAREA */}
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
                            <CardTitle className="text-base font-semibold">auditoria de eficiencia por tarea (spc vs supervisor)</CardTitle>
                            <CardDescription className="text-xs">
                                balance real obra por obra: presupuesto base vs gastos, ganancia neta supervisor (50%), ajustes 10% y ganancia neta spc
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-medium">
                                        <th className="p-3">tarea / edificio</th>
                                        <th className="p-3">supervisor</th>
                                        <th className="p-3 text-right">pb</th>
                                        <th className="p-3 text-right">materiales</th>
                                        <th className="p-3 text-right font-bold text-blue-600">gan. sup.</th>
                                        <th className="p-3 text-right">facturado</th>
                                        <th className="p-3 text-right text-amber-600">ajustes 10%</th>
                                        <th className="p-3 text-right font-bold text-emerald-600">ganancia neta spc</th>
                                        <th className="p-3 text-center">% margen spc</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {(() => {
                                        const obras = balancesFiltrados
                                            .filter(b => b.total_factura_base > 0 || b.total_pb > 0)
                                            .sort((a, b) => b.ganancia_neta_total_spc - a.ganancia_neta_total_spc)
                                            .slice(0, 100)
                                        if (obras.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan={9} className="p-4 text-center text-zinc-400">no se encontraron obras para los filtros seleccionados</td>
                                                </tr>
                                            )
                                        }
                                        return obras.map((b) => {
                                            const pctMargen = b.total_factura_base > 0
                                                ? Math.round((b.ganancia_neta_total_spc / b.total_factura_base) * 100)
                                                : 0
                                            const colorGanancia = pctMargen >= 50 ? "text-emerald-600" : pctMargen >= 30 ? "text-amber-500" : "text-red-500"
                                            return (
                                                <tr key={b.id_tarea} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                                                    <td className="p-3">
                                                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{b.titulo_tarea}</div>
                                                        <div className="text-[10px] text-zinc-500">{b.nombre_edificio} ({b.nombre_administrador})</div>
                                                    </td>
                                                    <td className="p-3 text-zinc-600 dark:text-zinc-400">{b.nombre_supervisor}</td>
                                                    <td className="p-3 text-right">${Math.round(b.total_pb).toLocaleString("es-AR")}</td>
                                                    <td className="p-3 text-right text-zinc-500">
                                                        ${Math.round(b.gastos_reales_liquidacion).toLocaleString("es-AR")}
                                                    </td>
                                                    <td className="p-3 text-right font-bold text-blue-600">
                                                        ${Math.round(b.ganancia_supervisor).toLocaleString("es-AR")}
                                                    </td>
                                                    <td className="p-3 text-right font-medium">
                                                        ${Math.round(b.total_factura_base).toLocaleString("es-AR")}
                                                    </td>
                                                    <td className="p-3 text-right text-amber-600">
                                                        ${Math.round(b.total_ajustes_aprobados).toLocaleString("es-AR")}
                                                    </td>
                                                    <td className="p-3 text-right font-bold text-emerald-600">
                                                        ${Math.round(b.ganancia_neta_total_spc).toLocaleString("es-AR")}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className={`font-bold ${colorGanancia}`}>{pctMargen}%</span>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    })()}
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
