"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase-client"
import { CalendarDays, Clock, Building2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface HistorialJornalesGlobalProps {
  userId: string
  userRole?: string
  filterByTarea?: number
  showOnlyPending?: boolean
}

interface ParteTrabajoCompleto {
  id: number
  fecha: string
  tipo_jornada: 'dia_completo' | 'medio_dia'
  id_trabajador: string
  id_tarea: number
  liquidado: boolean
  id_liquidacion: number | null
  titulo_tarea: string
  code_tarea: string
  email_trabajador: string
  nombre_edificio: string
  created_at: string
  usuarios?: {
    configuracion_trabajadores: {
      salario_diario: number
    } | null
  }
}

interface ResumenPorTarea {
  id_tarea: number
  titulo_tarea: string
  code_tarea: string
  nombre_edificio: string
  total_dias: number
  dias_completos: number
  medios_dias: number
  salario_promedio: number
  total_jornales: number
  partes: ParteTrabajoCompleto[]
}

export function HistorialJornalesGlobal({
  userId,
  userRole = 'trabajador',
  filterByTarea,
  showOnlyPending = true
}: HistorialJornalesGlobalProps) {
  const [partes, setPartes] = useState<ParteTrabajoCompleto[]>([])
  const [loading, setLoading] = useState(true)
  const [resumenPorTarea, setResumenPorTarea] = useState<ResumenPorTarea[]>([])
  const [vistaAgrupada, setVistaAgrupada] = useState(true)
  const supabase = createClient()

  const cargarJornales = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from("vista_partes_trabajo_completa")
        .select("*")

      // Filtrar por liquidado si es necesario
      if (showOnlyPending) {
        query = query.eq("liquidado", false)
      }

      // Filtrar por tarea específica si se proporciona
      if (filterByTarea) {
        query = query.eq("id_tarea", filterByTarea)
      }

      // Filtrar por rol
      if (userRole === 'trabajador') {
        query = query.eq('id_trabajador', userId)
      } else if (userRole === 'supervisor') {
        // Obtener tareas supervisadas
        const { data: tareasSuper, error: tareasError } = await supabase
          .from('supervisores_tareas')
          .select('id_tarea')
          .eq('id_supervisor', userId)

        if (tareasError) throw tareasError

        const idsTareas = tareasSuper?.map(t => t.id_tarea) || []

        // Filtrar partes de tareas supervisadas O propios del supervisor
        if (idsTareas.length > 0) {
          query = query.or(`id_tarea.in.(${idsTareas.join(',')}),id_trabajador.eq.${userId}`)
        } else {
          // Si no supervisa nada, solo sus propios partes
          query = query.eq('id_trabajador', userId)
        }
      }
      // Admin no tiene filtros adicionales

      query = query.order("fecha", { ascending: false })

      const { data, error } = await query

      if (error) throw error

      // Obtener salarios para cada parte
      const partesConSalarios: ParteTrabajoCompleto[] = []
      
      for (const parte of (data as any[]) || []) {
        const { data: configData } = await supabase
          .from('configuracion_trabajadores')
          .select('salario_diario')
          .eq('id_trabajador', parte.id_trabajador)
          .single()

        partesConSalarios.push({
          ...parte,
          usuarios: {
            configuracion_trabajadores: configData
          }
        })
      }

      setPartes(partesConSalarios)

      // Calcular resumen por tarea
      const resumen: Record<number, ResumenPorTarea> = {}

      partesConSalarios.forEach(parte => {
        const salario = parte.usuarios?.configuracion_trabajadores?.salario_diario || 0
        const monto = parte.tipo_jornada === 'dia_completo' ? salario : salario * 0.5
        const dias = parte.tipo_jornada === 'dia_completo' ? 1 : 0.5

        if (!resumen[parte.id_tarea]) {
          resumen[parte.id_tarea] = {
            id_tarea: parte.id_tarea,
            titulo_tarea: parte.titulo_tarea,
            code_tarea: parte.code_tarea,
            nombre_edificio: parte.nombre_edificio,
            total_dias: 0,
            dias_completos: 0,
            medios_dias: 0,
            salario_promedio: salario,
            total_jornales: 0,
            partes: []
          }
        }

        resumen[parte.id_tarea].total_dias += dias
        if (parte.tipo_jornada === 'dia_completo') {
          resumen[parte.id_tarea].dias_completos++
        } else {
          resumen[parte.id_tarea].medios_dias++
        }
        resumen[parte.id_tarea].total_jornales += monto
        resumen[parte.id_tarea].partes.push(parte)
      })

      setResumenPorTarea(Object.values(resumen).sort((a, b) => b.total_jornales - a.total_jornales))

    } catch (error: any) {
      console.error("Error cargando jornales:", error)
      toast.error("❌ Error al cargar jornales")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarJornales()
  }, [userId, filterByTarea, showOnlyPending, userRole])

  const totalGeneralDias = partes.reduce((sum, parte) => {
    return sum + (parte.tipo_jornada === 'dia_completo' ? 1 : 0.5)
  }, 0)

  const totalGeneralJornales = partes.reduce((sum, parte) => {
    const salario = parte.usuarios?.configuracion_trabajadores?.salario_diario || 0
    return sum + (parte.tipo_jornada === 'dia_completo' ? salario : salario * 0.5)
  }, 0)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" />
            Mis Jornales {showOnlyPending && "(Pendientes)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2">Cargando jornales...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header con resumen y toggle */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Mis Jornales {showOnlyPending && "(Pendientes)"}
              </CardTitle>
              {partes.length > 0 && (
                <div className="flex flex-wrap gap-2 text-sm mt-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    💰 Total: ${totalGeneralJornales.toLocaleString("es-CL")}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    📅 {totalGeneralDias} días trabajados
                  </Badge>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    🏗️ {resumenPorTarea.length} tarea{resumenPorTarea.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>
            {partes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVistaAgrupada(!vistaAgrupada)}
              >
                {vistaAgrupada ? "Ver por Fecha" : "Agrupar por Tarea"}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {partes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <CalendarDays className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">
              {showOnlyPending 
                ? "No tienes jornales pendientes de liquidar"
                : "No hay jornales registrados"}
            </p>
          </CardContent>
        </Card>
      ) : vistaAgrupada ? (
        /* Vista agrupada por tarea */
        <div className="space-y-4">
          {resumenPorTarea.map(tarea => (
            <Card key={tarea.id_tarea}>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono">
                        {tarea.code_tarea}
                      </Badge>
                      <span className="font-semibold">{tarea.titulo_tarea}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {tarea.nombre_edificio}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {tarea.dias_completos} completos
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      {tarea.medios_dias} medios
                    </Badge>
                    <Badge className="bg-blue-600">
                      ${tarea.total_jornales.toLocaleString("es-CL")}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tarea.partes.map(parte => {
                    const salario = parte.usuarios?.configuracion_trabajadores?.salario_diario || 0
                    const monto = parte.tipo_jornada === 'dia_completo' ? salario : salario * 0.5
                    const fecha = new Date(parte.fecha)

                    return (
                      <div
                        key={parte.id}
                        className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-sm">
                            <div className="font-medium">
                              {fecha.toLocaleDateString('es-CL', { 
                                weekday: 'short',
                                day: '2-digit', 
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {parte.tipo_jornada === 'dia_completo' ? 'Día completo' : 'Medio día'}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-blue-700">
                          ${monto.toLocaleString("es-CL")}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Vista por fecha (lista simple) */
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              {partes.map(parte => {
                const salario = parte.usuarios?.configuracion_trabajadores?.salario_diario || 0
                const monto = parte.tipo_jornada === 'dia_completo' ? salario : salario * 0.5
                const fecha = new Date(parte.fecha)

                return (
                  <div
                    key={parte.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium text-sm">
                          {fecha.toLocaleDateString('es-CL', { 
                            weekday: 'short',
                            day: '2-digit', 
                            month: 'short'
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {parte.tipo_jornada === 'dia_completo' ? '⏰ Día completo' : '🕐 Medio día'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs">
                        {parte.code_tarea}
                      </Badge>
                      <span className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {parte.titulo_tarea}
                      </span>
                      <span className="text-sm font-semibold text-blue-700 ml-auto">
                        ${monto.toLocaleString("es-CL")}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
