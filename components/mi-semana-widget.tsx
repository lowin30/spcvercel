"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase-client"
import { Clock } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface MiSemanaWidgetProps {
  trabajadorId: string
  salarioDiario?: number
}

interface DiaRegistro {
  fecha: string
  tipo_jornada: 'dia_completo' | 'medio_dia'
  id_tarea: number
}

export function MiSemanaWidget({ trabajadorId, salarioDiario = 0 }: MiSemanaWidgetProps) {
  const [registrosSemana, setRegistrosSemana] = useState<DiaRegistro[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargarRegistrosSemana() {
      const supabase = createClient()
      if (!supabase) return
      
      try {
        const hoy = new Date()
        const diaSemana = hoy.getDay() // 0 = domingo, 1 = lunes, etc.
        const inicioSemana = new Date(hoy)
        
        // Calcular inicio de semana (lunes)
        const diff = diaSemana === 0 ? -6 : 1 - diaSemana
        inicioSemana.setDate(hoy.getDate() + diff)
        inicioSemana.setHours(0, 0, 0, 0)

        const finSemana = new Date(inicioSemana)
        finSemana.setDate(inicioSemana.getDate() + 6)
        finSemana.setHours(23, 59, 59, 999)

        const { data, error } = await supabase
          .from('partes_de_trabajo')
          .select('fecha, tipo_jornada, id_tarea')
          .eq('id_trabajador', trabajadorId)
          .gte('fecha', inicioSemana.toISOString().split('T')[0])
          .lte('fecha', finSemana.toISOString().split('T')[0])
          .order('fecha', { ascending: true })

        if (error) throw error
        setRegistrosSemana(data || [])
      } catch (error) {
        console.error('Error al cargar registros de la semana:', error)
      } finally {
        setLoading(false)
      }
    }

    if (trabajadorId) {
      cargarRegistrosSemana()
    }
  }, [trabajadorId])

  // Generar array de 7 días (Lun-Dom)
  const getDiasSemana = () => {
    const hoy = new Date()
    const diaSemana = hoy.getDay()
    const inicioSemana = new Date(hoy)
    
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana
    inicioSemana.setDate(hoy.getDate() + diff)

    const dias = []
    const nombres = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    
    for (let i = 0; i < 7; i++) {
      const dia = new Date(inicioSemana)
      dia.setDate(inicioSemana.getDate() + i)
      const fechaStr = dia.toISOString().split('T')[0]
      
      const registro = registrosSemana.find(r => r.fecha === fechaStr)
      
      dias.push({
        nombre: nombres[i],
        fecha: dia,
        registrado: !!registro,
        tipoJornada: registro?.tipo_jornada,
        esHoy: dia.toDateString() === new Date().toDateString()
      })
    }
    
    return dias
  }

  const diasSemana = getDiasSemana()

  // Calcular estadísticas
  const diasCompletos = registrosSemana.filter(r => r.tipo_jornada === 'dia_completo').length
  const mediosDias = registrosSemana.filter(r => r.tipo_jornada === 'medio_dia').length
  const jornadasTotales = diasCompletos + (mediosDias * 0.5)
  const estimadoSemanal = (diasCompletos * salarioDiario) + (mediosDias * salarioDiario / 2)
  const progreso = (jornadasTotales / 5) * 100 // 5 días como semana completa

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Cargando...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi Semana Laboral</CardTitle>
        <CardDescription>
          {diasSemana[0].fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} - {' '}
          {diasSemana[6].fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Barra de progreso semanal */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progreso semanal</span>
              <span className="font-semibold">{jornadasTotales.toFixed(1)} / 5 días</span>
            </div>
            <Progress value={Math.min(progreso, 100)} className="h-2" />
          </div>
          
          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1">
            {diasSemana.map((dia, index) => (
              <div 
                key={index}
                className={cn(
                  "text-center p-2 rounded border transition-colors",
                  dia.registrado 
                    ? "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700" 
                    : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700",
                  dia.esHoy && "ring-2 ring-blue-500"
                )}
              >
                <p className="text-xs font-medium">{dia.nombre}</p>
                <p className="text-lg font-bold mt-1">
                  {dia.registrado 
                    ? (dia.tipoJornada === 'dia_completo' ? '✓' : '½')
                    : '-'
                  }
                </p>
              </div>
            ))}
          </div>
          
          {/* Resumen */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Estimado a cobrar esta semana
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              ${estimadoSemanal.toLocaleString('es-AR')}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
              {diasCompletos} días completos + {mediosDias} medios días
            </p>
          </div>
          
          {/* Botón de acción */}
          <Button asChild className="w-full">
            <Link href="/dashboard/trabajadores/registro-dias">
              <Clock className="h-4 w-4 mr-2" />
              Registrar Día de Hoy
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
