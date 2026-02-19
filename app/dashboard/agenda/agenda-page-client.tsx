"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import CalendarWrapper from "@/components/calendar-wrapper"
import { AgendaFilters } from "@/components/agenda-filters"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AgendaList } from "@/components/agenda-list"
import { Button } from "@/components/ui/button"

interface AgendaPageClientProps {
    userDetails: { id: string; email: string; rol: string }
    initialTareas: any[]
    initialTareasCalendar: any[]
    initialEdificios: any[]
    initialEstadosTareas: any[]
    initialUsuarios: any[]
}

export default function AgendaPageClient({
    userDetails,
    initialTareas,
    initialTareasCalendar,
    initialEdificios,
    initialEstadosTareas,
    initialUsuarios,
}: AgendaPageClientProps) {
    const [calendarFilter, setCalendarFilter] = useState<'ambos' | 'trabajo' | 'visitas'>('ambos')
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return (
            <div className="space-y-6 p-4">
                <div className="h-8 w-40 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-4 w-60 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-[400px] bg-gray-200 animate-pulse rounded mt-4"></div>
            </div>
        )
    }

    return (
        <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Agenda</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">Planificación y seguimiento de tareas</p>
                </div>
            </div>

            <AgendaFilters edificios={initialEdificios || []} usuarios={initialUsuarios} userRole={userDetails?.rol} />

            <Tabs defaultValue="calendario" className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-2">
                    <TabsTrigger value="calendario" className="text-sm">Calendario</TabsTrigger>
                    <TabsTrigger value="lista" className="text-sm">Vista Lista</TabsTrigger>
                </TabsList>
                <TabsContent value="lista" className="mt-2">
                    <Card className="shadow-sm">
                        <CardHeader className="px-3 py-2 sm:p-4">
                            <CardTitle className="text-base sm:text-lg text-foreground">
                                Tareas Programadas {initialTareas.length > 0 && <span className="text-sm font-normal text-muted-foreground">({initialTareas.length})</span>}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 sm:p-4">
                            <AgendaList tareas={initialTareas || []} userRole={userDetails?.rol} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="calendario" className="mt-2">
                    <Card className="shadow-sm overflow-hidden">
                        <CardHeader className="px-3 py-2 sm:p-4">
                            <div className="flex items-center justify-between gap-2">
                                <CardTitle className="text-base sm:text-lg text-foreground">
                                    Calendario de Tareas {initialTareas.length > 0 && <span className="text-sm font-normal text-muted-foreground">({initialTareas.length})</span>}
                                </CardTitle>
                                <div className="flex items-center gap-1">
                                    <Button variant={calendarFilter === 'trabajo' ? 'default' : 'outline'} size="sm" onClick={() => setCalendarFilter('trabajo')}>Trabajo</Button>
                                    <Button variant={calendarFilter === 'visitas' ? 'default' : 'outline'} size="sm" onClick={() => setCalendarFilter('visitas')}>Visitas</Button>
                                    <Button variant={calendarFilter === 'ambos' ? 'default' : 'outline'} size="sm" onClick={() => setCalendarFilter('ambos')}>Ambos</Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 sm:p-4">
                            {(() => {
                                try {
                                    const baseCal = (initialTareasCalendar && initialTareasCalendar.length > 0) ? initialTareasCalendar : (initialTareas || [])
                                    const filteredCal = calendarFilter === 'ambos'
                                        ? baseCal
                                        : baseCal.filter((t: any) => t?.tipo === (calendarFilter === 'trabajo' ? 'trabajo' : 'visita'))
                                    return (
                                        <CalendarWrapper
                                            tareas={filteredCal}
                                            estadosTareas={initialEstadosTareas || []}
                                            userRole={userDetails?.rol}
                                            userId={userDetails?.id}
                                        />
                                    )
                                } catch (error) {
                                    console.error('Error rendering calendar view:', error)
                                    return (
                                        <div className="p-4 text-center">
                                            <p className="text-red-500 mb-2">Error al cargar el calendario</p>
                                            <p className="text-muted-foreground mb-4 text-sm">Estamos trabajando para solucionar este problema</p>

                                            <div className="mt-4 space-y-2">
                                                <h3 className="text-base font-medium">Próximas tareas</h3>
                                                {initialTareas && initialTareas.length > 0 ? (
                                                    <div className="divide-y">
                                                        {initialTareas
                                                            .filter(t => t.fecha_visita)
                                                            .sort((a, b) => {
                                                                const fechaA = new Date(a.fecha_visita as string).getTime()
                                                                const fechaB = new Date(b.fecha_visita as string).getTime()
                                                                return fechaA - fechaB
                                                            })
                                                            .slice(0, 10)
                                                            .map(tarea => {
                                                                const fechaVisita = new Date(tarea.fecha_visita as string)
                                                                const esMiTarea = tarea.id_asignado === userDetails?.id
                                                                return (
                                                                    <div
                                                                        key={tarea.id}
                                                                        className={`p-2 ${esMiTarea ? 'border-l-4 border-primary' : ''}`}
                                                                    >
                                                                        <p className="font-medium">{tarea.titulo}</p>
                                                                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                                            <span>{fechaVisita.toLocaleDateString('es-ES')}</span>
                                                                            <span>{tarea.nombre_edificio}</span>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })
                                                        }
                                                    </div>
                                                ) : (
                                                    <p className="text-muted-foreground text-sm">No hay tareas programadas</p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                }
                            })()}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
