"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search, Plus, ListTodo, AlertTriangle, CheckCircle2, LayoutDashboard, FileClock, SendHorizontal, ThumbsUp, Wallet, Ban, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BudgetList } from "@/components/budget-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PresupuestosFinalesClientProps {
    initialData: any[]
    kpisData: any
    administradores: any[]
    userRol: string
    userDetails: any
}

export default function PresupuestosFinalesClient({
    initialData,
    kpisData,
    administradores,
    userRol,
    userDetails
}: PresupuestosFinalesClientProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [activeTab, setActiveTab] = useState("todos")
    const [adminFilter, setAdminFilter] = useState("todos")

    // Filtrado avanzado
    const filteredData = initialData.filter((p) => {
        const matchesSearch =
            p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.titulo_tarea?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.nombre_edificio?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesAdmin = adminFilter === "todos" || p.id_administrador === adminFilter

        if (!matchesSearch || !matchesAdmin) return false

        // Fitrado por tab (estado) - Usamos el código de la vista
        const estado = p.codigo_estado?.toLowerCase() || ""

        if (activeTab === "todos") return true
        if (activeTab === "borrador") return estado === "borrador"
        if (activeTab === "pendientes") return estado === "pendiente" || estado === ""
        if (activeTab === "enviado") return estado === "enviado"
        if (activeTab === "aceptado") return estado === "aceptado" || p.aprobado === true
        if (activeTab === "facturado") return estado === "facturado" || estado === "cobrado"
        if (activeTab === "rechazado") return estado === "rechazado" || p.rechazado === true

        return true
    })

    return (
        <div className="space-y-6">
            {/* Header Platinum Style */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-2">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg text-white flex-shrink-0">
                        <Wallet className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                            Gestión de Presupuestos
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <LayoutDashboard className="h-4 w-4" />
                            Control centralizado de presupuestos finales y facturación.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button asChild variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 transition-all shadow-sm">
                        <Link href="/dashboard/tareas">
                            <ListTodo className="h-4 w-4" />
                            📋 Desde Tarea
                        </Link>
                    </Button>
                    <Button asChild className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 border-none shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                        <Link href="/dashboard/presupuestos-finales/crear-rapido">
                            <Plus className="h-4 w-4" />
                            ⚡ Presupuesto Rápido
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Resumen Financiero Platinum */}
            {userRol === 'admin' && kpisData?.kpis && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
                    <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-200/50 dark:border-indigo-800/50 shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <Wallet className="h-12 w-12" />
                        </div>
                        <CardContent className="pt-6">
                            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Total Presupuestado</p>
                            <h3 className="text-2xl font-black mt-1">
                                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(kpisData.kpis.total_presupuestado || 0)}
                            </h3>
                            <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                <span>{kpisData.kpis.cantidad_total || 0} presupuestos finales</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-200/50 dark:border-amber-800/50 shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <FileClock className="h-12 w-12" />
                        </div>
                        <CardContent className="pt-6">
                            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Pendiente Envío</p>
                            <h3 className="text-2xl font-black mt-1">
                                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(kpisData.kpis.total_borrador || 0)}
                            </h3>
                            <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                <span>{kpisData.borradores || 0} borradores activos</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200/50 dark:border-blue-800/50 shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <SendHorizontal className="h-12 w-12" />
                        </div>
                        <CardContent className="pt-6">
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Enviado a Cliente</p>
                            <h3 className="text-2xl font-black mt-1">
                                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(kpisData.kpis.total_enviado || 0)}
                            </h3>
                            <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-3 w-3 text-blue-500" />
                                <span>{kpisData.enviados || 0} en revisión por cliente</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200/50 dark:border-green-800/50 shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <ThumbsUp className="h-12 w-12" />
                        </div>
                        <CardContent className="pt-6">
                            <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Aprobado / Facturable</p>
                            <h3 className="text-2xl font-black mt-1 text-green-700 dark:text-green-300">
                                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(kpisData.kpis.total_aprobado || 0)}
                            </h3>
                            <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                <span>{kpisData.aprobados || 0} listos para facturar</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-muted/30 p-4 rounded-xl">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por código, tarea o edificio..."
                        className="pl-10 bg-background border-none shadow-sm focus-visible:ring-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {userRol === 'admin' && (
                    <div className="w-full md:w-64">
                        <Select value={adminFilter} onValueChange={setAdminFilter}>
                            <SelectTrigger className="bg-background border-none shadow-sm">
                                <SelectValue placeholder="Filtrar por Administrador" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos los Administradores</SelectItem>
                                {administradores.map((adm) => (
                                    <SelectItem key={adm.id} value={adm.id}>
                                        {adm.display_name || adm.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Tabs y Listado */}
            <Tabs defaultValue="todos" className="w-full" onValueChange={setActiveTab}>
                <div className="overflow-x-auto pb-2 scrollbar-hide">
                    <TabsList className="inline-flex w-auto min-w-full md:min-w-0 bg-muted/50 p-1.5 rounded-xl border">
                        <TabsTrigger value="todos" className="px-5 rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <ListTodo className="h-3.5 w-3.5" />
                            Todos
                        </TabsTrigger>
                        <TabsTrigger value="borrador" className="px-5 rounded-lg gap-2 relative data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <FileClock className="h-3.5 w-3.5" />
                            Borrador
                            {kpisData?.borradores > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold animate-bounce mt-1">
                                    {kpisData.borradores}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="pendientes" className="px-5 rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Clock className="h-3.5 w-3.5" />
                            Pendientes
                        </TabsTrigger>
                        <TabsTrigger value="enviado" className="px-5 rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            <SendHorizontal className="h-3.5 w-3.5" />
                            Enviados
                        </TabsTrigger>
                        <TabsTrigger value="aceptado" className="px-5 rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold text-green-600 dark:text-green-400">
                            <ThumbsUp className="h-3.5 w-3.5" />
                            Aceptados
                        </TabsTrigger>
                        <TabsTrigger value="facturado" className="px-5 rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold text-blue-600 dark:text-blue-400">
                            <Wallet className="h-3.5 w-3.5" />
                            Facturados
                        </TabsTrigger>
                        <TabsTrigger value="rechazado" className="px-5 rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold text-red-500">
                            <Ban className="h-3.5 w-3.5" />
                            Rechazados
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value={activeTab} className="mt-6 border-none p-0 focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <BudgetList
                        budgets={filteredData.map(p => ({
                            ...p,
                            // Adaptación de nombres de campos para el componente BudgetList
                            materiales: p.materiales || 0,
                            mano_obra: p.mano_obra || 0,
                            tareas: {
                                id: p.id_tarea,
                                titulo: p.titulo_tarea,
                                code: p.code_tarea,
                                edificios: { nombre: p.nombre_edificio }
                            },
                            estados_presupuestos: {
                                id: p.id_estado,
                                nombre: p.nombre_estado,
                                color: p.color_estado,
                                codigo: p.codigo_estado
                            }
                        }))}
                        userRole={userRol}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
