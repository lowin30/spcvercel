"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BudgetList } from "@/components/budget-list"
import Link from "next/link"
import { Plus, Search, Loader2, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PresupuestosClientWrapperProps {
    initialPresupuestos: any[]
    administradores: any[]
    kpisData: {
        kpis: any | null
        pbSinPf: any[]
        pbSinAprobar: any[]
        pfAging: any[]
        pfBorrador: any[]
        pfEnviado: any[]
        pfAprobado: any[]
    } | null
    userRole: string
    userDetails: any
}

export default function PresupuestosClientWrapper({
    initialPresupuestos,
    administradores,
    kpisData,
    userRole,
    userDetails
}: PresupuestosClientWrapperProps) {
    // Inicializamos el estado con los datos del servidor (Defensive coding)
    const [todosLosPresupuestos] = useState<any[]>(initialPresupuestos || [])
    const [tabActual, setTabActual] = useState<string>('borrador')
    const [searchInput, setSearchInput] = useState<string>('')
    const [filtroAdmin, setFiltroAdmin] = useState<string>('todos')

    // Desempaquetamos los KPIs para mantener la lógica existente
    const kpisAdmin = kpisData?.kpis || null
    const detallePbFinalizadaSinPF = kpisData?.pbSinPf || []
    const detallePbSinAprobar = kpisData?.pbSinAprobar || []
    const detallePfEnviadoSinActividad = kpisData?.pfAging || []
    const detallePfBorradorAntiguo = kpisData?.pfBorrador || []
    const detallePfEnviadoSinAprobar = kpisData?.pfEnviado || []
    const detallePfAprobadoSinFactura = kpisData?.pfAprobado || []

    // BÚSQUEDA Y FILTRADO CLIENT-SIDE (sobre todosLosPresupuestos)
    const presupuestos = useMemo(() => {
        let result = todosLosPresupuestos;

        // Aplicar búsqueda
        if (searchInput.trim()) {
            const searchLower = searchInput.toLowerCase();
            result = result.filter((p: any) => {
                const edificioNombre = p.tareas?.edificios?.nombre || '';
                const tareaTitulo = p.tareas?.titulo || '';
                const estadoNombre = p.estados_presupuestos?.nombre || '';

                return (
                    (p.code && p.code.toLowerCase().includes(searchLower)) ||
                    edificioNombre.toLowerCase().includes(searchLower) ||
                    tareaTitulo.toLowerCase().includes(searchLower) ||
                    estadoNombre.toLowerCase().includes(searchLower)
                );
            });
        }

        if (filtroAdmin !== 'todos') {
            const adminIdNum = Number(filtroAdmin);
            result = result.filter((p: any) => (p.tareas?.edificios?.id_administrador === adminIdNum));
        }

        return result;
    }, [todosLosPresupuestos, searchInput, filtroAdmin])

    const aging20Count = useMemo(() => {
        const fromKpi = kpisAdmin?.pf_enviado_sin_actividad_20d_count
        if (typeof fromKpi === 'number') return fromKpi
        return detallePfEnviadoSinActividad.filter((it: any) => it.umbral === 'alerta_20d').length
    }, [kpisAdmin, detallePfEnviadoSinActividad])

    const aging30Count = useMemo(() => {
        const fromKpi = kpisAdmin?.pf_enviado_sin_actividad_30d_count
        if (typeof fromKpi === 'number') return fromKpi
        return detallePfEnviadoSinActividad.filter((it: any) => it.umbral === 'auto_cierre_30d').length
    }, [kpisAdmin, detallePfEnviadoSinActividad])

    // Filtrar presupuestos
    const filterByEstado = (codigo: string) => presupuestos?.filter(p => p.estados_presupuestos?.codigo === codigo) || [];

    const presupuestosBorrador = filterByEstado('borrador');
    const presupuestosEnviado = filterByEstado('enviado');
    const presupuestosAceptado = filterByEstado('aceptado');
    const presupuestosFacturado = filterByEstado('facturado');
    const presupuestosRechazado = filterByEstado('rechazado');

    // Presupuestos pendientes con ordenamiento prioritario: Borrador > Aceptado > Enviado
    const presupuestosPendientes = presupuestos
        .filter(p => {
            const codigo = p.estados_presupuestos?.codigo
            return codigo === 'borrador' || codigo === 'enviado' || codigo === 'aceptado'
        })
        .sort((a, b) => {
            // Orden de prioridad: Borrador (1) > Aceptado (2) > Enviado (3)
            const prioridad: Record<string, number> = { 'borrador': 1, 'aceptado': 2, 'enviado': 3 }
            const prioA = prioridad[a.estados_presupuestos?.codigo || ''] || 999
            const prioB = prioridad[b.estados_presupuestos?.codigo || ''] || 999
            return prioA - prioB
        })

    return (
        <div className="space-y-6 overflow-x-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight min-w-0">Presupuestos</h1>
                {userRole === "admin" && (
                    <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Button
                            asChild
                            size="lg"
                            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                            title="Crea presupuesto directamente. El sistema genera el presupuesto base automáticamente."
                        >
                            <Link href="/dashboard/presupuestos/nuevo?tipo=final" className="flex items-center justify-center gap-2">
                                <Plus className="h-4 w-4" />
                                <div className="flex flex-col items-start text-left">
                                    <span className="font-semibold text-sm">⚡ Presupuesto Rápido</span>
                                    <span className="text-xs opacity-90 font-normal">Sin presupuesto base previo</span>
                                </div>
                            </Link>
                        </Button>

                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="w-full sm:w-auto"
                            title="Flujo tradicional: selecciona una tarea con presupuesto base aprobado"
                        >
                            <Link href="/dashboard/tareas?crear_presupuesto=true" className="flex items-center justify-center gap-2">
                                <Plus className="h-4 w-4" />
                                <div className="flex flex-col items-start text-left">
                                    <span className="font-semibold text-sm">📋 Desde Tarea</span>
                                    <span className="text-xs opacity-70 font-normal">Con presupuesto base</span>
                                </div>
                            </Link>
                        </Button>
                    </div>
                )}
            </div>

            {/* Panel de recordatorios 4 NIVELES (solo admin) */}
            {userRole === 'admin' && kpisAdmin && (
                <Card className="bg-amber-50 border-amber-200">
                    <CardHeader>
                        <CardTitle className="flex items-center text-amber-800">
                            <AlertTriangle className="h-4 w-4 mr-2 text-amber-600" /> Recordatorios de administración
                        </CardTitle>
                        <p className="text-xs text-amber-700 mt-1">Sistema de seguimiento automático de PF - 4 niveles</p>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                            {/* NIVEL 1: Falta crear PF */}
                            <div className="border-l-4 border-blue-500 pl-3">
                                <div className="text-xs text-muted-foreground">📝 Falta crear PF</div>
                                <div className="text-2xl font-bold text-blue-700">{(kpisAdmin.pb_finalizada_sin_pf_count ?? 0) + (kpisAdmin.pb_sin_aprobar_count ?? 0)}</div>
                                <div className="mt-2 space-y-1.5">
                                    {[
                                        ...detallePbFinalizadaSinPF.map((it: any) => ({ ...it, __ap: 'aprobado' })),
                                        ...detallePbSinAprobar.map((it: any) => ({ ...it, __ap: 'sin_aprobar' })),
                                    ].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                                        .slice(0, 3)
                                        .map((it: any) => (
                                            <Link
                                                key={`${it.id_presupuesto_base}-${it.__ap}`}
                                                href={`/dashboard/tareas/${it.id_tarea}`}
                                                className="block text-xs text-primary hover:underline"
                                            >
                                                <div className="line-clamp-2 leading-snug">
                                                    {it.titulo_tarea || it.code_tarea || `Tarea #${it.id_tarea}`}
                                                </div>
                                            </Link>
                                        ))}
                                </div>
                                <Button asChild size="sm" className="mt-2 w-full" variant="outline">
                                    <Link href="/dashboard/presupuestos/nuevo?tipo=final">Crear PF</Link>
                                </Button>
                            </div>

                            {/* NIVEL 2: PF Borrador antiguo */}
                            <div className="border-l-4 border-yellow-500 pl-3">
                                <div className="text-xs text-muted-foreground">⏱️ PF Borrador antiguo</div>
                                <div className="text-2xl font-bold text-yellow-700">{detallePfBorradorAntiguo.length}</div>
                                <div className="mt-2 space-y-1.5">
                                    {detallePfBorradorAntiguo.slice(0, 3).map((it: any) => (
                                        <Link
                                            key={it.id_presupuesto_final}
                                            href={`/dashboard/tareas/${it.id_tarea}`}
                                            className="block text-xs text-primary hover:underline"
                                        >
                                            <div className="flex items-start justify-between gap-1">
                                                <span className="line-clamp-2 leading-snug flex-1">
                                                    {it.titulo_tarea || it.code_tarea || `Tarea #${it.id_tarea}`}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 whitespace-nowrap flex-shrink-0">
                                                    {it.dias_en_borrador}d
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                                <div className="mt-2 text-[10px] text-yellow-600">💡 Enviar al cliente</div>
                            </div>

                            {/* NIVEL 3: PF Enviado sin aprobar (CRÍTICO) */}
                            <div className="border-l-4 border-red-500 pl-3">
                                <div className="text-xs text-muted-foreground">🔴 PF Enviado sin respuesta</div>
                                <div className="text-2xl font-bold text-red-700">{detallePfEnviadoSinAprobar.length}</div>
                                <div className="mt-2 space-y-1.5">
                                    {detallePfEnviadoSinAprobar.slice(0, 3).map((it: any) => (
                                        <Link
                                            key={it.id_presupuesto_final}
                                            href={`/dashboard/tareas/${it.id_tarea}`}
                                            className="block text-xs text-primary hover:underline"
                                        >
                                            <div className="flex items-start justify-between gap-1">
                                                <span className="line-clamp-2 leading-snug flex-1">
                                                    {it.titulo_tarea || it.code_tarea || `Tarea #${it.id_tarea}`}
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${it.prioridad === 'critico'
                                                        ? 'bg-red-100 text-red-800'
                                                        : it.prioridad === 'urgente'
                                                            ? 'bg-orange-100 text-orange-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {it.dias_sin_respuesta}d
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                                <div className="mt-2 text-[10px] text-red-600">💡 Seguir o rechazar</div>
                            </div>

                            {/* NIVEL 4: PF Aprobado sin factura */}
                            <div className="border-l-4 border-green-500 pl-3">
                                <div className="text-xs text-muted-foreground">💰 PF Aprobado sin factura</div>
                                <div className="text-2xl font-bold text-green-700">{kpisData?.kpis?.pf_aprobado_sin_factura_count ?? 0}</div>
                                <div className="mt-2 space-y-1.5">
                                    {detallePfAprobadoSinFactura.slice(0, 3).map((it: any) => (
                                        <Link
                                            key={it.id_presupuesto_final}
                                            href={`/dashboard/tareas/${it.id_tarea}`}
                                            className="block text-xs text-primary hover:underline"
                                        >
                                            <div className="line-clamp-2 leading-snug">
                                                {it.titulo_tarea || it.code_tarea || `Tarea #${it.id_tarea}`}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                                <Button asChild size="sm" className="mt-2 w-full" variant="outline">
                                    <Link href="/dashboard/facturas/nueva">Crear Factura</Link>
                                </Button>
                            </div>

                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                    <Select value={filtroAdmin} onValueChange={setFiltroAdmin}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Administrador: Todos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Todos los administradores</SelectItem>
                            {administradores.map((a: any) => (
                                <SelectItem key={a.id} value={String(a.id)}>
                                    {a.nombre}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por código, edificio, tarea, estado..."
                        className="pl-8 w-full"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        title="Busca en: código, nombre del edificio, título de tarea, estado del presupuesto"
                    />
                </div>
            </div>

            <Tabs value={tabActual} onValueChange={setTabActual} className="w-full">
                <TabsList className="w-full h-auto min-h-10 grid grid-cols-2 gap-2 sm:flex sm:flex-nowrap sm:h-10">
                    <TabsTrigger value="borrador" className="w-full sm:w-auto text-center text-xs sm:text-sm font-semibold whitespace-normal break-words leading-tight px-2 sm:px-3">
                        📝 Borrador
                        <span className="ml-1.5 rounded-full bg-red-100 dark:bg-red-900 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
                            {presupuestosBorrador.length}
                        </span>
                    </TabsTrigger>
                    <TabsTrigger value="pendientes" className="w-full sm:w-auto text-center text-xs sm:text-sm whitespace-normal break-words leading-tight px-2 sm:px-3">
                        ⚡ Pendientes
                        <span className="ml-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                            {presupuestosPendientes.length}
                        </span>
                    </TabsTrigger>
                    <TabsTrigger value="todos" className="w-full sm:w-auto text-center text-xs sm:text-sm whitespace-normal break-words leading-tight px-2 sm:px-3">
                        📋 Todos
                        <span className="ml-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {presupuestos.length}
                        </span>
                    </TabsTrigger>
                    <TabsTrigger value="enviado" className="w-full sm:w-auto text-center text-xs sm:text-sm whitespace-normal break-words leading-tight px-2 sm:px-3">
                        📤 Enviado ({presupuestosEnviado.length})
                    </TabsTrigger>
                    <TabsTrigger value="aceptado" className="w-full sm:w-auto text-center text-xs sm:text-sm whitespace-normal break-words leading-tight px-2 sm:px-3">
                        ✅ Aceptado ({presupuestosAceptado.length})
                    </TabsTrigger>
                    <TabsTrigger value="facturado" className="w-full sm:w-auto text-center text-xs sm:text-sm whitespace-normal break-words leading-tight px-2 sm:px-3">
                        💰 Facturado ({presupuestosFacturado.length})
                    </TabsTrigger>
                    <TabsTrigger value="rechazado" className="w-full sm:w-auto text-center text-xs sm:text-sm whitespace-normal break-words leading-tight px-2 sm:px-3">
                        ❌ Rechazado ({presupuestosRechazado.length})
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="borrador">
                    <BudgetList budgets={presupuestosBorrador} userRole={userRole} />
                </TabsContent>
                <TabsContent value="pendientes">
                    <BudgetList budgets={presupuestosPendientes} userRole={userRole} />
                </TabsContent>
                <TabsContent value="todos">
                    <BudgetList budgets={presupuestos} userRole={userRole} />
                </TabsContent>
                <TabsContent value="enviado">
                    <BudgetList budgets={presupuestosEnviado} userRole={userRole} />
                </TabsContent>
                <TabsContent value="aceptado">
                    <BudgetList budgets={presupuestosAceptado} userRole={userRole} />
                </TabsContent>
                <TabsContent value="facturado">
                    <BudgetList budgets={presupuestosFacturado} userRole={userRole} />
                </TabsContent>
                <TabsContent value="rechazado">
                    <BudgetList budgets={presupuestosRechazado} userRole={userRole} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
