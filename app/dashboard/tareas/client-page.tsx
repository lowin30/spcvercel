"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
    crearPresupuestoMode: boolean
    catalogs?: {
        administradores: any[]
        edificios: any[]
        supervisores: any[]
    }
}

export default function TareasClientPage({
    initialTareas,
    initialUserDetails,
    initialRecordatorios,
    initialPresupuestosBase = {},
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

    // ... (Keep existing helpers like getEstadoColor, handleSelectTareaForPresupuesto)

    // (Lógica de filtrado reemplazada por Server Side Filtering + TaskFiltersBar)

    // Helper para mantener consistencia con tabs
    const tareasParaTabs = tareas

    // Estados normalizados (Re-integrated for Tabs logic)
    const estadosTarea = [
        { id: 1, nombre: "Organizar", color: "gray", codigo: "organizar", descripcion: "Tarea en fase inicial de organización", orden: 1 },
        { id: 2, nombre: "Preguntar", color: "blue", codigo: "preguntar", descripcion: "Tarea en fase de consulta o investigación", orden: 2 },
        { id: 3, nombre: "Presupuestado", color: "purple", codigo: "presupuestado", descripcion: "Tarea con presupuesto creado", orden: 3 },
        { id: 4, nombre: "Enviado", color: "indigo", codigo: "enviado", descripcion: "Presupuesto enviado al cliente", orden: 4 },
        { id: 5, nombre: "Aprobado", color: "green", codigo: "aprobado", descripcion: "Presupuesto aprobado por el cliente", orden: 5 },
        { id: 6, nombre: "Facturado", color: "orange", codigo: "facturado", descripcion: "Tarea facturada", orden: 6 },
        { id: 7, nombre: "Terminado", color: "green", codigo: "terminado", descripcion: "Tarea completada", orden: 7 },
        { id: 8, nombre: "Reclamado", color: "red", codigo: "reclamado", descripcion: "Tarea con reclamo del cliente", orden: 8 },
        { id: 9, nombre: "Liquidada", color: "purple", codigo: "liquidada", descripcion: "Tarea completada y liquidada financieramente", orden: 9 },
        { id: 10, nombre: "Posible", color: "yellow", codigo: "posible", descripcion: "Son posibles trabajos a futuro", orden: 10 }
    ]

    // Tareas por estado (Categorización para Tabs)
    const tarefasPorEstadoFiltradas: Record<number, any[]> = useMemo(() => {
        const grouped: Record<number, any[]> = {}
        // Inicializar grupos
        estadosTarea.forEach(estado => {
            grouped[estado.id] = []
        })

        // Agrupar
        tareasParaTabs.forEach(t => {
            if (grouped[t.id_estado_nuevo]) {
                grouped[t.id_estado_nuevo].push(t)
            }
        })
        return grouped
    }, [tareasParaTabs])

    // Helper para "Otros"
    const tareasOtros = useMemo(() => {
        return tareasParaTabs.filter(t => ![1, 5].includes(t.id_estado_nuevo))
    }, [tareasParaTabs])

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
                    <h2 className="text-3xl font-bold">Tareas</h2>
                    <p className="text-muted-foreground">Gestiona las tareas del sistema</p>
                </div>
                {(userDetails?.rol === "admin" || userDetails?.rol === "supervisor") && (
                    <div className="flex gap-2">
                        <Button asChild><Link href="/dashboard/tareas/nueva"><Plus className="mr-2 h-4 w-4" /> Nueva Tarea</Link></Button>
                    </div>
                )}
            </div>

            {/* Smart Cascading Filters Bar */}
            {catalogs && (
                <TaskFiltersBar
                    administradores={catalogs.administradores}
                    edificios={catalogs.edificios}
                    supervisores={catalogs.supervisores}
                    userRole={userDetails?.rol}
                />
            )}

            {/* TABS */}
            <Tabs defaultValue="todas" className="mt-10">

                <TabsList className="bg-blue-100 p-2 border-2 border-blue-500">
                    <TabsTrigger value="todas">TODAS ({tareasParaTabs.length})</TabsTrigger>
                    <TabsTrigger value="1">ORGANIZAR ({tarefasPorEstadoFiltradas[1]?.length || 0})</TabsTrigger>
                    <TabsTrigger value="5">APROBADO ({tarefasPorEstadoFiltradas[5]?.length || 0})</TabsTrigger>
                    <TabsTrigger value="otros">OTROS ({tareasOtros.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="todas" className="mt-4">
                    <TaskList tasks={tareasParaTabs} userRole={userDetails?.rol} supervisoresMap={supervisoresMap} />
                </TabsContent>
                <TabsContent value="1" className="mt-4">
                    <TaskList tasks={tarefasPorEstadoFiltradas[1] || []} userRole={userDetails?.rol} supervisoresMap={supervisoresMap} />
                </TabsContent>
                {/* ... Other tabs ... */}
                <TabsContent value="otros" className="mt-4">
                    {/* Logic for 'otros' */}
                    <TaskList tasks={tareasOtros} userRole={userDetails?.rol} supervisoresMap={supervisoresMap} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
