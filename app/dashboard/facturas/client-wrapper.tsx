"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import { Plus, Search, Filter, AlertTriangle, X, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExportFacturasButton } from "@/components/export-facturas-button"
import { InvoiceList } from "@/components/invoice-list"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useDebouncedCallback } from "use-debounce"

interface FacturasClientWrapperProps {
    initialFacturas: any[]
    kpis: any
    filtros: {
        administradores: any[]
        edificios: any[]
        estados: any[]
    }
    userRole: string
}

export default function FacturasClientWrapper({ initialFacturas, kpis, filtros, userRole }: FacturasClientWrapperProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const currentSearch = searchParams.get('search') || ''
    const currentAdmin = searchParams.get('id_administrador') || ''
    const currentEdificio = searchParams.get('id_edificio') || ''
    const currentEstado = searchParams.get('id_estado') || ''

    const [vistaActual, setVistaActual] = useState<'borrador' | 'pendientes' | 'pagadas' | 'todas'>('borrador')
    const [isMounted, setIsMounted] = useState(false)

    // Recuperar el tab de localStorage al montar
    useEffect(() => {
        setIsMounted(true)
        const saved = localStorage.getItem('spc_filtros_facturas_tab')
        if (saved) {
            setVistaActual(saved as any)
        }
    }, [])

    // Guardar el tab en localStorage
    useEffect(() => {
        if (!isMounted) return
        localStorage.setItem('spc_filtros_facturas_tab', vistaActual)
    }, [vistaActual, isMounted])

    const createQueryString = useCallback(
        (deltas: Record<string, string | null>) => {
            const params = new URLSearchParams(searchParams.toString())
            for (const [key, value] of Object.entries(deltas)) {
                if (value === null || value === 'todos' || value === '') {
                    params.delete(key)
                } else {
                    params.set(key, value)
                }
            }
            return params.toString()
        },
        [searchParams]
    )

    const handleSearch = useDebouncedCallback((term: string) => {
        const query = createQueryString({ search: term })
        router.replace(pathname + '?' + query)
    }, 300)

    const updateFilter = (deltas: Record<string, string | null>) => {
        const query = createQueryString(deltas)
        router.push(pathname + '?' + query)
    }

    const safeFacturas = initialFacturas || []

    const filteredFacturas = useMemo(() => {
        return safeFacturas.filter(invoice => {
            // Tab Logic
            if (vistaActual === 'borrador') {
                if (invoice.id_estado_nuevo !== 1) return false;
            } else if (vistaActual === 'pendientes') {
                if ((invoice.saldo_pendiente ?? 0) <= 0) return false;
            } else if (vistaActual === 'pagadas') {
                if ((invoice.saldo_pendiente ?? 0) > 0) return false;
            }
            return true;
        })
    }, [safeFacturas, vistaActual]);

    // Totals
    const totalBorrador = safeFacturas.filter(f => f.id_estado_nuevo === 1).length
    const totalPendientes = safeFacturas.filter(f => (f.saldo_pendiente ?? 0) > 0).length
    const totalPagadas = safeFacturas.filter(f => (f.saldo_pendiente ?? 0) <= 0).length
    const totalFacturas = safeFacturas.length
    const saldoTotalPendiente = filteredFacturas.filter(f => (f.saldo_pendiente ?? 0) > 0).reduce((sum, f) => sum + (parseFloat(String(f.saldo_pendiente)) || 0), 0)

    // Export Data formatting
    const facturasExport = filteredFacturas.map(f => ({
        id: f.id,
        code: f.code,
        nombre: f.nombre,
        datos_afip: f.datos_afip,
        estado_nombre: f.estado_nombre,
        total: Number(f.total_base_factura || f.total || 0),
        saldo_pendiente: f.saldo_pendiente,
        total_ajustes: f.total_ajustes
    }))

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Facturas</h1>
                <div className="flex gap-2">
                    <ExportFacturasButton
                        facturas={facturasExport}
                        nombreAdministrador={filtros.administradores.find(a => String(a.id) === currentAdmin)?.nombre}
                    />
                    <Button asChild>
                        <Link href="/dashboard/presupuestos-base/nuevo">
                            <Plus className="mr-2 h-4 w-4" /> Nueva Factura
                        </Link>
                    </Button>
                </div>
            </div>

            {/* KPIs Admin */}
            {kpis && (
                <Card className="bg-amber-50 border-amber-200">
                    <CardHeader>
                        <CardTitle className="flex items-center text-amber-800">
                            <AlertTriangle className="h-4 w-4 mr-2 text-amber-600" /> Recordatorios de administración
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <KpiCard label="Falta crear PF" count={kpis.pbSinPf_count} items={kpis.pbSinPf || []} link="/dashboard/presupuestos-finales/nuevo?tipo=final" />
                            <KpiCard label="Falta crear PF (activas)" count={kpis.tareasActivasSinPf_count} items={kpis.tareasActivasSinPf || []} warning />
                            <KpiCard label="PF Enviado sin resp" count={kpis.pfEnviado_count} items={kpis.pfEnviado || []} critical />
                            <KpiCard label="PF Aprobado sin fac" count={kpis.pfSinFac_count} items={kpis.pfSinFac || []} link="/dashboard/facturas/nueva" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats Bar */}
            <Card className="bg-muted/50 border-primary/20">
                <CardContent className="py-3">
                    <div className="grid grid-cols-2 gap-3 text-center">
                        <div>
                            <p className="text-xl font-bold text-primary">{filteredFacturas.length}</p>
                            <p className="text-xs text-muted-foreground">Facturas mostradas</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-destructive">${saldoTotalPendiente.toLocaleString('es-AR')}</p>
                            <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={vistaActual} onValueChange={(v: any) => setVistaActual(v)}>
                <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4">
                    <TabsTrigger value="borrador" className="text-xs sm:text-sm">
                        Borrador <span className="ml-1 text-[10px] sm:text-xs bg-muted dark:bg-muted/50 rounded-full px-1.5 sm:px-2">{totalBorrador}</span>
                    </TabsTrigger>
                    <TabsTrigger value="pendientes" className="text-xs sm:text-sm">
                        Pendientes <span className="ml-1 text-[10px] sm:text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full px-1.5 sm:px-2">{totalPendientes}</span>
                    </TabsTrigger>
                    <TabsTrigger value="pagadas" className="text-xs sm:text-sm">
                        Pagadas <span className="ml-1 text-[10px] sm:text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full px-1.5 sm:px-2">{totalPagadas}</span>
                    </TabsTrigger>
                    <TabsTrigger value="todas" className="text-xs sm:text-sm">
                        Todas <span className="ml-1 text-[10px] sm:text-xs bg-muted dark:bg-muted/50 rounded-full px-1.5 sm:px-2">{totalFacturas}</span>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Filters */}
            <Card>
                <CardHeader><CardTitle className="text-sm flex items-center"><Filter className="w-4 h-4 mr-2" /> Filtros</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Buscar</label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar..."
                                    defaultValue={currentSearch}
                                    onChange={e => handleSearch(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Administrador</label>
                            <Select
                                value={currentAdmin || 'todos'}
                                onValueChange={v => {
                                    updateFilter({
                                        id_administrador: v === 'todos' ? null : v,
                                        id_edificio: null // Reseteamos el edificio
                                    })
                                }}
                            >
                                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos</SelectItem>
                                    {filtros.administradores.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.nombre}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Edificio</label>
                            <Select
                                value={currentEdificio || 'todos'}
                                onValueChange={v => updateFilter({ id_edificio: v === 'todos' ? null : v })}
                            >
                                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos</SelectItem>
                                    {filtros.edificios
                                        .filter(e => !currentAdmin || String(e.id_administrador) === currentAdmin)
                                        .map(e => <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Estado</label>
                            <Select
                                value={currentEstado || 'todos'}
                                onValueChange={v => updateFilter({ id_estado: v === 'todos' ? null : v })}
                            >
                                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos</SelectItem>
                                    {filtros.estados.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {(currentAdmin || currentEdificio || currentEstado || currentSearch) && (
                        <div className="flex justify-end mt-4 border-t pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(pathname)}
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Limpiar filtros
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* List */}
            <div className="rounded-md border">
                <InvoiceList invoices={filteredFacturas} />
            </div>
        </>
    )
}

// Mini Component for KPI
function KpiCard({ label, count = 0, items = [], link, warning, critical }: any) {
    const borderColor = critical ? 'border-l-red-500' : warning ? 'border-l-yellow-500' : 'border-l-blue-500'
    const textColor = critical ? 'text-red-700' : warning ? 'text-yellow-700' : 'text-blue-700'

    return (
        <div className={`border-l-4 ${borderColor} pl-3 py-1 bg-white rounded shadow-sm`}>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={`text-2xl font-bold ${textColor}`}>{count}</div>
            <div className="mt-2 space-y-1">
                {items.map((it: any) => (
                    <Link key={it.id_presupuesto_final || it.id_tarea} href={`/dashboard/tareas/${it.id_tarea}`} className="block text-[10px] hover:underline truncate">
                        {it.titulo_tarea || `Tarea #${it.id_tarea}`}
                    </Link>
                ))}
            </div>
            {link && <Button variant="outline" size="sm" asChild className="w-full mt-2 h-6 text-xs"><Link href={link}>Ver/Crear</Link></Button>}
        </div>
    )
}
