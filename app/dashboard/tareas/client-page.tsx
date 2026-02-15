"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase-client" // Keep for Realtime if needed, but remove fetching
import { Button } from "@/components/ui/button"
import { TaskList } from "@/components/task-list"
import Link from "next/link"
import { Plus, Search, Filter, Calendar, X, ArrowLeft, Check, RefreshCw } from "lucide-react"
import Fuse from "fuse.js"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
// import { enrichRecordatoriosWithActivity } from ... // Moved to server


import { TaskFiltersBar } from "@/components/tasks/task-filters-bar"

type Props = {
    initialTareas: any[]
    initialUserDetails: any
    initialRecordatorios: any[]
    initialPresupuestosBase?: Record<string, any>
    initialCounts: { activas: number, aprobadas: number, enviadas: number, finalizadas: number, todas: number }
    crearPresupuestoMode: boolean
    catalogs?: {
        administradores: any[]
        edificios: any[]
        supervisores: any[]
        estados: any[]
    }
}

export default function TareasClientPage({
    initialTareas,
    initialUserDetails,
    initialRecordatorios,
    initialPresupuestosBase = {},
    initialCounts,
    crearPresupuestoMode,
    catalogs
}: Props) {
    const [tareas, setTareas] = useState<any[]>(initialTareas)

    // Update local state when prop changes (Server Side Filter result)
    useEffect(() => {
        setTareas(initialTareas)
    }, [initialTareas])

    const [userDetails] = useState<any>(initialUserDetails)
    const [recordatorios, setRecordatorios] = useState<any[]>(initialRecordatorios)
    const [presupuestosBase] = useState<Record<string, any>>(initialPresupuestosBase)

    const [selectedTareaId, setSelectedTareaId] = useState<string | null>(null)
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const currentView = searchParams.get('view') || 'activas'

    // Helper to update URL
    const createQueryString = (deltas: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString())
        for (const [key, value] of Object.entries(deltas)) {
            if (value === null || value === '_todos_' || value === '') {
                params.delete(key)
            } else {
                params.set(key, value)
            }
        }
        return params.toString()
    }

    const handleTabChange = (value: string) => {
        const query = createQueryString({ view: value })
        router.push(pathname + '?' + query)
    }

    // (Lógica de filtrado reemplazada por Server Side Filtering + TaskFiltersBar)

    // Mapeo de Supervisores para UI (Avatares)

    // Mapeo de Supervisores para UI (Avatares)
    // Usamos 'catalogs.supervisores' si existe
    const supervisoresMap = useMemo(() => {
        const map: Record<string, any> = {}
        if (catalogs?.supervisores) {
            catalogs.supervisores.forEach(s => {
                const email = (s.email || '').toLowerCase()
                if (email) map[email] = { nombre: s.nombre || s.email, color_perfil: '#000000' } // TODO: Color
            })
        }
        return map
    }, [catalogs])

    // ...

    // RENDER: Normal Mode
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold">tareas</h2>
                    <p className="text-muted-foreground">gestiona las tareas del sistema</p>
                </div>
                {(userDetails?.rol === "admin" || userDetails?.rol === "supervisor") && (
                    <div className="flex gap-2">
                        <Button asChild><Link href="/dashboard/tareas/nueva"><Plus className="mr-2 h-4 w-4" /> nueva tarea</Link></Button>
                    </div>
                )}
            </div>

            {/* Smart Cascading Filters Bar */}
            {catalogs && (
                <TaskFiltersBar
                    administradores={catalogs.administradores}
                    edificios={catalogs.edificios}
                    supervisores={catalogs.supervisores}
                    estados={catalogs.estados}
                    userRole={userDetails?.rol}
                />
            )}

            {/* Smart Tabs (v88.1) */}
            <Tabs
                value={currentView}
                onValueChange={handleTabChange}
                className="mt-10"
            >
                <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 border rounded-lg h-auto flex-wrap">
                    <TabsTrigger value="activas" className="px-4 py-2">activas [{initialCounts.activas}]</TabsTrigger>
                    <TabsTrigger value="aprobadas" className="px-4 py-2">aprobadas [{initialCounts.aprobadas}]</TabsTrigger>
                    <TabsTrigger value="enviadas" className="px-4 py-2">enviadas [{initialCounts.enviadas}]</TabsTrigger>
                    <TabsTrigger value="finalizadas" className="px-4 py-2">finalizadas [{initialCounts.finalizadas}]</TabsTrigger>
                    <TabsTrigger value="todas" className="px-4 py-2">todas [{initialCounts.todas}]</TabsTrigger>
                </TabsList>

                <div className="mt-4">
                    {tareas.length > 0 ? (
                        <TaskList tasks={tareas} userRole={userDetails?.rol} supervisoresMap={supervisoresMap} />
                    ) : (
                        <Card className="border-dashed border-2 py-10">
                            <CardContent className="flex flex-col items-center justify-center text-muted-foreground">
                                <Search className="h-10 w-10 mb-4 opacity-20" />
                                <p>no se encontraron tareas en esta vista</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </Tabs>
        </div>
    )
}
