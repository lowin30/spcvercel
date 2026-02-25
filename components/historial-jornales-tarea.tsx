"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase-client"
import { formatDateTime } from "@/lib/utils"
import { CalendarDays, Download, Users, Clock } from "lucide-react"
import { toast } from "sonner"

interface HistorialJornalesTareaProps {
  tareaId: number
  userRole?: string
  userId?: string
}

interface ParteTrabajo {
  id: number
  fecha: string
  tipo_jornada: 'dia_completo' | 'medio_dia'
  id_trabajador: string
  created_at: string
  usuarios: {
    email: string
    color_perfil: string
    configuracion_trabajadores: {
      salario_diario: number
    } | null
  }
}

interface ResumenTrabajador {
  trabajador_id: string
  trabajador_email: string
  trabajador_color: string
  total_dias: number
  dias_completos: number
  medios_dias: number
  salario_diario: number
  total_jornales: number
}

export function HistorialJornalesTarea({ tareaId, userRole = 'trabajador', userId }: HistorialJornalesTareaProps) {
  const [partes, setPartes] = useState<ParteTrabajo[]>([])
  const [loading, setLoading] = useState(true)
  const [resumenPorTrabajador, setResumenPorTrabajador] = useState<ResumenTrabajador[]>([])
  const supabase = createClient()

  const cargarJornales = async () => {
    try {
      // [MODO DIOS] Usar la Súper Vista Maestra para centralizar datos
      let query = supabase
        .from("vista_actividad_maestra_god_mode")
        .select("*")
        .eq("id_tarea", tareaId)
        .eq("tipo_evento", "JORNAL")
        .order("fecha", { ascending: false })

      // Filtrar por trabajador si es rol trabajador
      if (userRole === 'trabajador' && userId) {
        query = query.eq('id_usuario', userId)
      }

      const { data, error } = await query

      if (error) throw error

      // Mapear al tipo esperado por el componente
      const partesMapeados = (data || []).map((a: any) => ({
        id: a.event_id,
        fecha: a.fecha,
        tipo_jornada: a.detalle_tipo as 'dia_completo' | 'medio_dia',
        id_trabajador: a.id_usuario,
        created_at: a.fecha, // Usar fecha como aproximación si created_at no es crítico aquí
        usuarios: {
          email: a.usuario_nombre || 'N/A', // O email si la vista tiene email
          color_perfil: a.ui_metadata.color || '#CBD5E1',
          configuracion_trabajadores: {
            salario_diario: (a.monto / (a.detalle_tipo === 'medio_dia' ? 0.5 : 1))
          }
        }
      })) as ParteTrabajo[]

      setPartes(partesMapeados)

      // Calcular resumen por trabajador usando montos directos de la vista
      const resumen: Record<string, ResumenTrabajador> = {}

      partesMapeados.forEach((parte, index) => {
        const raw = data[index]
        const trabajadorId = parte.id_trabajador
        const monto = raw.monto

        if (!resumen[trabajadorId]) {
          resumen[trabajadorId] = {
            trabajador_id: trabajadorId,
            trabajador_email: parte.usuarios.email,
            trabajador_color: parte.usuarios.color_perfil,
            total_dias: 0,
            dias_completos: 0,
            medios_dias: 0,
            salario_diario: parte.usuarios.configuracion_trabajadores?.salario_diario || 0,
            total_jornales: 0
          }
        }

        if (parte.tipo_jornada === 'dia_completo') {
          resumen[trabajadorId].dias_completos++
          resumen[trabajadorId].total_dias += 1
        } else {
          resumen[trabajadorId].medios_dias++
          resumen[trabajadorId].total_dias += 0.5
        }
        resumen[trabajadorId].total_jornales += monto
      })

      setResumenPorTrabajador(Object.values(resumen))
    } catch (error: any) {
      console.error("Error cargando jornales (Modo Dios):", error)
      toast.error("❌ Error al cargar jornales")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarJornales()

    // Suscripción en tiempo real
    try {
      const channel = supabase.channel('jornales-tarea-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'partes_de_trabajo', filter: `id_tarea=eq.${tareaId}` },
          () => cargarJornales()
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'partes_de_trabajo', filter: `id_tarea=eq.${tareaId}` },
          () => cargarJornales()
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'partes_de_trabajo', filter: `id_tarea=eq.${tareaId}` },
          () => cargarJornales()
        )
        .subscribe()

      const interval = setInterval(() => {
        cargarJornales()
      }, 30000)

      return () => {
        clearInterval(interval)
        channel?.unsubscribe()
      }
    } catch (error) {
      console.error("Error con suscripción en tiempo real:", error)
      const interval = setInterval(() => {
        cargarJornales()
      }, 15000)

      return () => {
        clearInterval(interval)
      }
    }
  }, [tareaId, userId])

  const totalGeneralDias = partes.reduce((sum, parte) => {
    return sum + (parte.tipo_jornada === 'dia_completo' ? 1 : 0.5)
  }, 0)

  const totalGeneralJornales = partes.reduce((sum, parte) => {
    const salario = parte.usuarios.configuracion_trabajadores?.salario_diario || 0
    return sum + (parte.tipo_jornada === 'dia_completo' ? salario : salario * 0.5)
  }, 0)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" />
            Historial de Jornales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-pulse">Cargando jornales...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              Historial de Jornales ({partes.length})
            </CardTitle>
            {partes.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs mt-1">
                <Badge variant="outline">💰 Total: ${totalGeneralJornales.toLocaleString("es-CL")}</Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  📅 Días trabajados: {totalGeneralDias}
                </Badge>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  <Users className="h-3 w-3 mr-1" />
                  Trabajadores: {resumenPorTrabajador.length}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {partes.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CalendarDays className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No hay jornales registrados</p>
            <p className="text-xs">Los partes de trabajo aparecerán aquí una vez registrados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumen por trabajador (solo para admin/supervisor) */}
            {(userRole === 'admin' || userRole === 'supervisor') && resumenPorTrabajador.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Resumen por Trabajador
                </h4>
                <div className="grid gap-2">
                  {resumenPorTrabajador.map(resumen => (
                    <Card key={resumen.trabajador_id} className="bg-slate-50">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: resumen.trabajador_color }}
                            />
                            <span className="text-sm font-medium">
                              {resumen.trabajador_email.split('@')[0]}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline">
                              {resumen.total_dias} días
                            </Badge>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              {resumen.dias_completos} completos
                            </Badge>
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                              {resumen.medios_dias} medios
                            </Badge>
                            <Badge variant="outline" className="font-semibold">
                              ${resumen.total_jornales.toLocaleString("es-CL")}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Listado detallado de partes */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Detalle de Partes de Trabajo
              </h4>
              <div className="space-y-2">
                {partes.map((parte) => {
                  const salario = parte.usuarios.configuracion_trabajadores?.salario_diario || 0
                  const monto = parte.tipo_jornada === 'dia_completo' ? salario : salario * 0.5
                  const fecha = new Date(parte.fecha)
                  const fechaFormateada = fecha.toLocaleDateString('es-CL', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })

                  return (
                    <Card key={parte.id} className="border-l-4 border-l-purple-200">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: parte.usuarios.color_perfil }}
                            />
                            <span className="font-medium text-sm">{fechaFormateada}</span>
                            <Badge
                              variant={parte.tipo_jornada === 'dia_completo' ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {parte.tipo_jornada === 'dia_completo' ? '⏰ Día completo' : '🕐 Medio día'}
                            </Badge>
                            <span className="text-sm font-semibold text-green-700">
                              ${monto.toLocaleString("es-CL")}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span>{parte.usuarios.email.split('@')[0]}</span>
                          <span>•</span>
                          <span>Salario diario: ${salario.toLocaleString("es-CL")}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
