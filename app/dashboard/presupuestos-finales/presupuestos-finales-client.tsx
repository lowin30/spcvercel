"use client"

import { useState, useCallback, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search, Plus, ListTodo, AlertTriangle, CheckCircle2, LayoutDashboard, FileClock, SendHorizontal, ThumbsUp, Wallet, Ban, Clock, Filter, Building2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BudgetList } from "@/components/budget-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getEdificios } from "./actions"

interface PresupuestosFinalesClientProps {
    initialData: any[]
    kpisData: any
    administradores: any[]
    estadosLookup: { id: number, nombre: string, color: string, codigo: string }[]
    tabCounts: { activas: number, borrador: number, enviado: number, aceptado: number, facturado: number, todos: number }
    userRol: string
    userDetails: any
}

export default function PresupuestosFinalesClient({
    initialData,
    kpisData,
    administradores,
    estadosLookup,
    tabCounts,
    userRol,
    userDetails
}: PresupuestosFinalesClientProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // URL State management
    const createQueryString = useCallback(
        (params: Record<string, string | null>) => {
            const newSearchParams = new URLSearchParams(searchParams.toString())
            for (const [key, value] of Object.entries(params)) {
                if (value === null || value === 'todos') {
                    newSearchParams.delete(key)
                } else {
                    newSearchParams.set(key, value)
                }
            }
            return newSearchParams.toString()
        },
        [searchParams]
    )

    const updateFilters = (newParams: Record<string, string | null>) => {
        router.push(`${pathname}?${createQueryString(newParams)}`)
    }

    const searchTerm = searchParams.get('query') || ""
    const activeTab = searchParams.get('tab') || "activas"
    const adminFilter = searchParams.get('adminId') || "todos"
    const edificioFilter = searchParams.get('edificioId') || "todos"

    // Cascaded Edificios state
    const [edificios, setEdificios] = useState<any[]>([])
    const [isLoadingEdificios, setIsLoadingEdificios] = useState(false)

    useEffect(() => {
        const fetchEdificios = async () => {
            setIsLoadingEdificios(true)
            try {
                const data = await getEdificios(adminFilter)
                setEdificios(data)
            } finally {
                setIsLoadingEdificios(false)
            }
        }
        fetchEdificios()
    }, [adminFilter])

    // Data provided by Server (initialData) is already filtered by DB
    // Map view columns to the shape BudgetList expects, using estadosLookup for color/codigo
    const budgets = initialData.map(p => {
        const estadoRef = estadosLookup.find(e => e.id === p.id_estado)
        return {
            ...p,
            materiales: p.materiales || 0,
            mano_obra: p.mano_obra || 0,
            tareas: {
                id: p.id_tarea,
                titulo: p.titulo_tarea,
                code: p.code_tarea,
                edificios: { nombre: p.nombre_edificio }
            },
            estados_presupuestos: estadoRef ? {
                id: estadoRef.id,
                nombre: estadoRef.nombre,
                color: estadoRef.color,
                codigo: estadoRef.codigo
            } : null,
            nombre_administrador: p.nombre_administrador || 'Sin administrador'
        }
    })

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header Platinum Style - Optimized for Mobile */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg text-white flex-shrink-0">
                        <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Presupuestos Finales</h1>
                        <p className="text-xs text-muted-foreground hidden sm:block">Control centralizado y facturación inteligente.</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none gap-2">
                        <Link href="/dashboard/tareas"><ListTodo className="h-4 w-4" /> Tareas</Link>
                    </Button>
                    <Button asChild size="sm" className="flex-1 sm:flex-none gap-2 bg-indigo-600 hover:bg-indigo-700">
                        <Link href="/dashboard/presupuestos-finales/crear-rapido"><Plus className="h-4 w-4" /> Nuevo</Link>
                    </Button>
                </div>
            </div>

            {/* Smart KPIs: Operational Bottlenecks - Mobile Friendly One-Line */}
            {userRol === 'admin' && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiStrip
                        label="Por ser PF"
                        count={kpisData?.pbSinPf?.length || 0}
                        color="amber"
                        icon={<FileClock className="h-4 w-4" />}
                        description="Bases finalizadas sin PF"
                    />
                    <KpiStrip
                        label="Enviados"
                        count={kpisData?.pfEnviado?.length || 0}
                        color="blue"
                        icon={<SendHorizontal className="h-4 w-4" />}
                        description="En revisión por cliente"
                    />
                    <KpiStrip
                        label="Por Facturar"
                        count={kpisData?.pfAprobado?.length || 0}
                        color="green"
                        icon={<ThumbsUp className="h-4 w-4" />}
                        description="Listos para facturación"
                    />
                    <KpiStrip
                        label="Borradores"
                        count={kpisData?.pfBorrador?.length || 0}
                        color="purple"
                        icon={<Clock className="h-4 w-4" />}
                        description="Ediciones pendientes"
                    />
                </div>
            )}

            {/* Filtros Inteligentes - Platinum Glassmorphism */}
            <Card className="border-none shadow-xl bg-white/60 dark:bg-black/40 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
                <CardContent className="p-4 md:p-6 space-y-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Buscador de Alta Fidelidad */}
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Buscar por código, tarea o edificio..."
                                className="pl-11 h-12 bg-white/80 dark:bg-black/40 border-slate-200 dark:border-slate-800 focus-visible:ring-offset-0 focus-visible:ring-indigo-500/30 transition-all rounded-xl shadow-inner-sm"
                                value={searchTerm}
                                onChange={(e) => updateFilters({ query: e.target.value })}
                            />
                        </div>

                        {/* Filtros Cascada (Admin -> Edificio) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:min-w-[320px]">
                            <Select value={adminFilter} onValueChange={(val) => updateFilters({ adminId: val, edificioId: 'todos' })}>
                                <SelectTrigger className="h-12 border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-black/40 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm">
                                    <div className="flex items-center gap-2.5 truncate">
                                        <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                            <User className="h-3.5 w-3.5 text-slate-500" />
                                        </div>
                                        <SelectValue placeholder="Administrador" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                                    <SelectItem value="todos">Todos los Admins</SelectItem>
                                    {administradores.map((adm) => (
                                        <SelectItem key={adm.id} value={String(adm.id)}>{adm.nombre}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={edificioFilter} onValueChange={(val) => updateFilters({ edificioId: val })} disabled={isLoadingEdificios}>
                                <SelectTrigger className="h-12 border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-black/40 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm">
                                    <div className="flex items-center gap-2.5 truncate">
                                        <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                            <Building2 className="h-3.5 w-3.5 text-slate-500" />
                                        </div>
                                        <SelectValue placeholder="Edificio" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                                    <SelectItem value="todos">Todos los Edificios</SelectItem>
                                    {edificios.map((ed) => (
                                        <SelectItem key={ed.id} value={String(ed.id)}>{ed.nombre}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs y Listado */}
            <Tabs value={activeTab} className="w-full" onValueChange={(val) => updateFilters({ tab: val })}>
                <div className="overflow-x-auto pb-2 scrollbar-hide flex-1">
                    <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 h-auto gap-0">
                        <TabItem value="activas" label="Activas" icon={<AlertTriangle className="h-4 w-4" />} count={tabCounts.activas} />
                        <TabItem value="borrador" label="Borrador" icon={<FileClock className="h-4 w-4" />} count={tabCounts.borrador} />
                        <TabItem value="enviado" label="Enviados" icon={<SendHorizontal className="h-4 w-4" />} count={tabCounts.enviado} />
                        <TabItem value="aceptado" label="Aceptados" icon={<ThumbsUp className="h-4 w-4" />} count={tabCounts.aceptado} />
                        <TabItem value="facturado" label="Facturados" icon={<Wallet className="h-4 w-4" />} count={tabCounts.facturado} />
                        <TabItem value="todos" label="Todas" icon={<LayoutDashboard className="h-4 w-4" />} count={tabCounts.todos} />
                    </TabsList>
                </div>

                <TabsContent value={activeTab} className="mt-4 border-none p-0 focus-visible:ring-0">
                    <BudgetList
                        budgets={budgets}
                        userRole={userRol}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function KpiStrip({ label, count, color, icon, description }: any) {
    const colors: any = {
        amber: "bg-amber-50/50 text-amber-700 border-amber-200/50 hover:bg-amber-100/60 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.1)]",
        blue: "bg-blue-50/50 text-blue-700 border-blue-200/50 hover:bg-blue-100/60 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.1)]",
        green: "bg-green-50/50 text-green-700 border-green-200/50 hover:bg-green-100/60 shadow-[0_4px_20px_-4px_rgba(34,197,94,0.1)]",
        purple: "bg-purple-50/50 text-purple-700 border-purple-200/50 hover:bg-purple-100/60 shadow-[0_4px_20px_-4px_rgba(168,85,247,0.1)]",
    }

    const iconColors: any = {
        amber: "bg-amber-100 text-amber-600",
        blue: "bg-blue-100 text-blue-600",
        green: "bg-green-100 text-green-600",
        purple: "bg-purple-100 text-purple-600",
    }

    return (
        <div className={`flex flex-col p-4 rounded-2xl border ${colors[color]} backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] group cursor-default`}>
            <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl ${iconColors[color]} transition-transform duration-500 group-hover:rotate-12`}>
                    {icon}
                </div>
                <span className="text-2xl font-black tracking-tighter">{count}</span>
            </div>
            <div>
                <span className="text-xs font-bold uppercase tracking-wider block">{label}</span>
                {description && <span className="text-[10px] opacity-70 block mt-0.5">{description}</span>}
            </div>
        </div>
    )
}

function TabItem({ value, label, icon, count }: any) {
    return (
        <TabsTrigger
            value={value}
            className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-2 py-2.5 gap-1.5 text-muted-foreground data-[state=active]:shadow-sm transition-all text-xs sm:text-sm"
        >
            {icon}
            <span className="font-medium hidden sm:inline">{label}</span>
            <span className="font-medium sm:hidden">{label.substring(0, 4)}</span>
            {count !== undefined && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${count > 0 ? 'bg-primary/10' : 'bg-muted/50 text-muted-foreground'}`}>
                    {count}
                </span>
            )}
        </TabsTrigger>
    )
}
