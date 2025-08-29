"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import CalendarWrapper from "@/components/calendar-wrapper"
import { AgendaFilters } from "@/components/agenda-filters"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AgendaList } from "@/components/agenda-list"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase-client"

export default function AgendaPage() {
  const [tareas, setTareas] = useState<any[]>([])
  const [edificios, setEdificios] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const searchParamsObj = useSearchParams()

  // Efecto para manejar la detección de cliente
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const supabase = createClient()
        
        // Verificar sesión de usuario
        const sessionResponse = await supabase.auth.getSession()
        const session = sessionResponse.data.session
        
        if (!session) {
          router.push("/login")
          return
        }
        
        // Obtener detalles del usuario
        const userResponse = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", session.user.id)
          .single()
          
        const userData = userResponse.data
        const userError = userResponse.error
          
        if (userError) {
          console.error("Error al obtener detalles del usuario:", userError)
          setError("Error al obtener detalles del usuario")
          setLoading(false)
          return
        }
        
        setUserDetails(userData)
        
        // Obtener parámetros de filtro directamente del objeto searchParams
        const edificioId = searchParamsObj.get("edificio")
        const estadoTarea = searchParamsObj.get("estado")
        const fechaDesde = searchParamsObj.get("desde")
        const fechaHasta = searchParamsObj.get("hasta")
        const asignadoId = searchParamsObj.get("asignado")

        // Construir la consulta base usando la vista tareas_completa que ya incluye todas las relaciones
        let baseQuery = supabase
          .from("vista_tareas_completa")
          .select(`*`)
          .order("fecha_visita", { ascending: true, nullsLast: true })

        // Debug para verificar el rol y el ID
        console.log("[Agenda] Rol de usuario:", userData?.rol);
        console.log("[Agenda] ID de usuario:", session.user.id);
        
        // Para evitar problemas de tipado, vamos a construir la consulta paso a paso
        let queryBuilder = baseQuery

        // Aplicar filtros según el rol y parámetros
        if (userData?.rol?.toLowerCase().trim() === "trabajador") {
          console.log("[Agenda] Aplicando filtro de trabajador usando vista_asignaciones_tareas_trabajadores")
          // Trabajadores solo ven tareas donde están asignados usando la vista optimizada
          const trabajadorTareasResponse = await supabase
            .from('vista_asignaciones_tareas_trabajadores')
            .select('id_tarea')
            .eq('id_trabajador', session.user.id)
          
          const tareasAsignadas = trabajadorTareasResponse.data?.map((t: any) => t.id_tarea) || []
          console.log("[Agenda] IDs de tareas asignadas:", tareasAsignadas)
          
          if (tareasAsignadas.length > 0) {
            // Si tiene tareas asignadas, filtramos por esos IDs
            queryBuilder = queryBuilder.in("id", tareasAsignadas)
          } else {
            // Si no tiene tareas asignadas, devolvemos un array vacío
            queryBuilder = queryBuilder.eq("id", -1) // ID imposible para que no retorne resultados
          }
        } else if (userData?.rol?.toLowerCase().trim() === "supervisor") {
          console.log("[Agenda] Aplicando filtro de supervisor usando vista_asignaciones_tareas_supervisores")
          // Supervisores solo ven tareas donde están asignados usando la vista optimizada
          const supervisorTareasResponse = await supabase
            .from('vista_asignaciones_tareas_supervisores')
            .select('id_tarea')
            .eq('id_supervisor', session.user.id)
          
          const tareasAsignadas = supervisorTareasResponse.data?.map((t: any) => t.id_tarea) || []
          console.log("[Agenda] IDs de tareas asignadas al supervisor:", tareasAsignadas)
          
          // Aplicamos filtro base de tareas asignadas al supervisor
          if (tareasAsignadas.length > 0) {
            queryBuilder = queryBuilder.in("id", tareasAsignadas)
            
            // Filtro adicional por usuario asignado si se especifica
            if (asignadoId) {
              // Obtenemos primero las tareas asignadas a ese trabajador usando la vista optimizada
              const trabajadorTareasResponse = await supabase
                .from('vista_asignaciones_tareas_trabajadores')
                .select('id_tarea')
                .eq('id_trabajador', asignadoId)
              
              const tareasAsignadasTrabajador = trabajadorTareasResponse.data?.map((t: any) => t.id_tarea) || []
              
              if (tareasAsignadasTrabajador.length > 0) {
                // Intersección: tareas que son del supervisor Y del trabajador seleccionado
                queryBuilder = queryBuilder.in("id", tareasAsignadasTrabajador)
              } else {
                // Si el trabajador no tiene tareas asignadas, no debe ver nada
                queryBuilder = queryBuilder.eq("id", -1)
              }
            }
          } else {
            // Si el supervisor no tiene tareas asignadas, no debe ver nada
            queryBuilder = queryBuilder.eq("id", -1)
          }
        } else {
          console.log("[Agenda] Aplicando filtro de admin o rol desconocido")
          // Admins ven todas pero pueden filtrar por usuario asignado
          if (asignadoId) {
            queryBuilder = queryBuilder.eq("id_asignado", asignadoId)
          }
        }

        // Filtrar por edificio
        if (edificioId) {
          queryBuilder = queryBuilder.eq("id_edificio", edificioId)
        }

        // Filtrar por estado
        if (estadoTarea) {
          queryBuilder = queryBuilder.eq("id_estado_nuevo", estadoTarea)
        }

        // Filtrar por rango de fechas
        if (fechaDesde) {
          queryBuilder = queryBuilder.gte("fecha_visita", fechaDesde)
        }

        if (fechaHasta) {
          queryBuilder = queryBuilder.lte("fecha_visita", `${fechaHasta}T23:59:59`)
        }

        // Ejecutar la consulta
        const tareasResponse = await queryBuilder
        setTareas(tareasResponse.data || [])

        // Obtener edificios para el filtro
        const edificiosResponse = await supabase.from("edificios").select("id, nombre").order("nombre")
        setEdificios(edificiosResponse.data || [])

        // Obtener usuarios para el filtro (solo para supervisores y admins)
        if (userData?.rol !== "trabajador") {
          const usuariosResponse = await supabase
            .from("usuarios")
            .select("id, email, rol")
            .in("rol", ["trabajador", "supervisor"])
            .order("email")
          setUsuarios(usuariosResponse.data || [])
        }

        setLoading(false)
      } catch (err) {
        console.error("Error al cargar datos:", err)
        setError("Error al cargar datos")
        setLoading(false)
      }
    }
    
    loadData()
  }, [searchParamsObj]) // Dependemos de searchParams para recargar al cambiar los filtros
  
  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando agenda...</span>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container py-6">
        <div className="bg-red-50 p-4 rounded-md mb-4">
          <h2 className="text-red-800 text-lg font-medium">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }
  
  // Código eliminado para mover isMounted al principio del componente

  // Si no está montado aún (servidor), mostrar un esqueleto
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

      <AgendaFilters edificios={edificios || []} usuarios={usuarios} userRole={userDetails?.rol} />

      <Tabs defaultValue="lista" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-2">
          <TabsTrigger value="lista" className="text-sm">Vista Lista</TabsTrigger>
          <TabsTrigger value="calendario" className="text-sm">Calendario</TabsTrigger>
        </TabsList>
        <TabsContent value="lista" className="mt-2">
          <Card className="shadow-sm">
            <CardHeader className="px-3 py-2 sm:p-4">
              <CardTitle className="text-base sm:text-lg">Tareas Programadas</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-4">
              <AgendaList tareas={tareas || []} userRole={userDetails?.rol} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="calendario" className="mt-2">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="px-3 py-2 sm:p-4">
              <CardTitle className="text-base sm:text-lg">Calendario de Tareas</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-4">
              {/* Envolver el calendario en un try-catch para evitar que rompa toda la página */}
              {(() => {
                try {
                  return (
                    <CalendarWrapper 
                      tareas={tareas || []} 
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
                      
                      {/* Vista alternativa móvil: Lista simple de próximas tareas */}
                      <div className="mt-4 space-y-2">
                        <h3 className="text-base font-medium">Próximas tareas</h3>
                        {tareas && tareas.length > 0 ? (
                          <div className="divide-y">
                            {tareas
                              .filter(t => t.fecha_visita)
                              .sort((a, b) => {
                                const fechaA = new Date(a.fecha_visita as string).getTime()
                                const fechaB = new Date(b.fecha_visita as string).getTime()
                                return fechaA - fechaB
                              })
                              .slice(0, 10) // Solo mostrar las 10 próximas
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
                                      <span>{tarea.edificios?.nombre}</span>
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
