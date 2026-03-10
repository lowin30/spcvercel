"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AgendaFilters } from "@/components/agenda-filters"
import { AgendaList } from "@/components/agenda-list"
import SpcCalendarGrid from "@/components/spc-calendar-grid"
import SpcDayDrawer from "@/components/spc-day-drawer"
import { AgendaData, AgendaEvento } from "@/lib/tools/partes/types"
import {
    CalendarRange,
    ListFilter,
    LayoutGrid,
    Users,
    Hammer,
    Clock,
    CheckCircle2
} from "lucide-react"

interface AgendaPageClientProps {
    userDetails: { id: string; email: string; rol: string }
    data: AgendaData
}

export default function AgendaPageClient({
    userDetails,
    data
}: AgendaPageClientProps) {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [eventsForSelectedDay, setEventsForSelectedDay] = useState<AgendaEvento[]>([])
    const [isMounted, setIsMounted] = useState(false)
    const [activeTab, setActiveTab] = useState("calendar")

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const handleDayClick = (date: Date, dayEvents: AgendaEvento[]) => {
        setSelectedDate(date)
        setEventsForSelectedDay(dayEvents)
        setIsDrawerOpen(true)
    }

    if (!isMounted) return null

    return (
        <div className="space-y-4 pb-20">
            {/* Header Platinum con KPIs */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-1">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-foreground sm:text-5xl">
                        Agenda <span className="text-violet-600">Platinum</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
                        Orquestación de recursos y planificación multi-día.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2">
                    <KPICard
                        label="Proyectos"
                        value={data.resumen.total_proyectados}
                        icon={Clock}
                        color="text-violet-500"
                        bg="bg-violet-500/10"
                    />
                    <KPICard
                        label="Confirmados"
                        value={data.resumen.total_confirmados}
                        icon={CheckCircle2}
                        color="text-green-500"
                        bg="bg-green-500/10"
                    />
                    <KPICard
                        label="Oficiales"
                        value={data.resumen.trabajadores_activos}
                        icon={Users}
                        color="text-blue-500"
                        bg="bg-blue-500/10"
                    />
                    <KPICard
                        label="Tareas"
                        value={data.resumen.tareas_con_actividad}
                        icon={Hammer}
                        color="text-amber-500"
                        bg="bg-amber-500/10"
                    />
                </div>
            </div>

            {/* Contenedor Principal de Agenda */}
            <div className="flex flex-col space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <TabsList className="grid w-fit grid-cols-2 bg-muted/30 p-1 rounded-full h-10 border border-border/50">
                            <TabsTrigger value="calendar" className="rounded-full px-3 sm:px-6 text-xs data-[state=active]:bg-violet-600 data-[state=active]:text-white">
                                <LayoutGrid className="w-3.5 h-3.5 mr-1" /> Calendario
                            </TabsTrigger>
                            <TabsTrigger value="list" className="rounded-full px-3 sm:px-6 text-xs data-[state=active]:bg-violet-600 data-[state=active]:text-white">
                                <ListFilter className="w-3.5 h-3.5 mr-1" /> Listado
                            </TabsTrigger>
                        </TabsList>

                        <AgendaFilters
                            edificios={data.catalogos.edificios}
                            usuarios={data.catalogos.usuarios}
                            userRole={userDetails.rol}
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        <TabsContent value="calendar" key="calendar-content" className="mt-0 focus-visible:outline-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.2 }}
                            >
                                <SpcCalendarGrid
                                    eventos={data.eventos}
                                    onDayClick={handleDayClick}
                                />
                            </motion.div>
                        </TabsContent>

                        <TabsContent value="list" key="list-content" className="mt-0 focus-visible:outline-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card className="border border-border/50 shadow-xl bg-background/50 backdrop-blur-sm overflow-hidden">
                                    <CardContent className="p-0 sm:p-6">
                                        <AgendaList
                                            tareas={adaptEventosToTareas(data.eventos)}
                                            userRole={userDetails.rol}
                                        />
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </TabsContent>
                    </AnimatePresence>
                </Tabs>
            </div>

            {/* Drawer de Detalle del Día */}
            <SpcDayDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                date={selectedDate}
                eventos={eventsForSelectedDay}
                catalogos={data.catalogos}
                userRole={userDetails.rol}
            />
        </div>
    )
}

function KPICard({ label, value, icon: Icon, color, bg }: { label: string, value: number, icon: any, color: string, bg: string }) {
    return (
        <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-card border border-border/50 shadow-sm flex items-center gap-2 sm:gap-3 transition-all hover:border-violet-500/30">
            <div className={`p-1.5 sm:p-2 rounded-lg ${bg} ${color}`}>
                <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <div>
                <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-xs sm:text-xl font-black">{value}</p>
            </div>
        </div>
    )
}

function adaptEventosToTareas(eventos: AgendaEvento[]): any[] {
    return eventos.map(e => ({
        // Usamos una combinación única para evitar colisiones de keys en la lista
        id: e.id,
        id_tarea: e.id_tarea,
        code: e.tipo === 'visita' ? 'VISITA' : (e.tipo === 'gasto' ? 'GASTO' : 'JOB'),
        titulo: e.titulo,
        descripcion: e.nombre_usuario ? `Trabajador: ${e.nombre_usuario}` : '',
        prioridad: e.prioridad || 'media',
        id_estado_nuevo: e.id_estado_tarea,
        estado_tarea: e.estado_tarea,
        fecha_visita: e.fecha,
        nombre_edificio: e.nombre_edificio,
        trabajadores_emails: e.nombre_usuario
    }))
}
