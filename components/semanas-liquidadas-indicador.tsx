"use client"

import { useEffect, useState } from 'react'
import { createClient } from "@/lib/supabase-client"
import { format, startOfWeek, endOfWeek, addDays, parseISO, isBefore } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Calendar } from 'lucide-react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

interface SemanasLiquidadasIndicadorProps {
  trabajadorId: string
}

interface Liquidacion {
  id: number
  id_trabajador: string
  semana_inicio: string
  semana_fin: string
  estado: string
  fecha_liquidacion: string
}

export function SemanasLiquidadasIndicador({ trabajadorId }: SemanasLiquidadasIndicadorProps) {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function cargarLiquidaciones() {
      if (!trabajadorId) return
      
      setIsLoading(true)
      try {
        // Cargar liquidaciones de las últimas 12 semanas
        const fechaLimite = new Date()
        fechaLimite.setDate(fechaLimite.getDate() - 84) // 12 semanas atrás
        
        const { data, error } = await supabase
          .from('liquidaciones_trabajadores')
          .select('*')
          .eq('id_trabajador', trabajadorId)
          .gte('semana_inicio', format(fechaLimite, 'yyyy-MM-dd'))
          .order('semana_inicio', { ascending: false })
        
        if (error) throw error
        setLiquidaciones(data || [])
      } catch (error) {
        console.error('Error al cargar liquidaciones:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    cargarLiquidaciones()
  }, [supabase, trabajadorId])
  
  // Generar array de las últimas 4 semanas
  const ultimasSemanas = []
  const hoy = new Date()
  
  for (let i = 0; i < 4; i++) {
    const inicio = startOfWeek(addDays(hoy, -7 * i), { locale: es })
    const fin = endOfWeek(inicio, { locale: es })
    
    // Verificar si esta semana está liquidada
    const estaLiquidada = liquidaciones.some(liq => {
      const inicioLiq = parseISO(liq.semana_inicio)
      const finLiq = parseISO(liq.semana_fin)
      return (
        isBefore(inicio, finLiq) && 
        isBefore(inicioLiq, fin)
      )
    })
    
    ultimasSemanas.push({
      inicio,
      fin,
      liquidada: estaLiquidada
    })
  }
  
  if (isLoading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /> Cargando semanas...</div>
  }
  
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium flex items-center gap-2">
        <Calendar className="h-4 w-4" /> 
        Estado de semanas
      </div>
      
      <div className="flex flex-wrap gap-2">
        {ultimasSemanas.map((semana, idx) => (
          <HoverCard key={idx}>
            <HoverCardTrigger asChild>
              <Badge 
                variant={semana.liquidada ? "secondary" : "outline"} 
                className={`cursor-help ${semana.liquidada ? 'line-through opacity-70' : ''}`}
              >
                {format(semana.inicio, 'dd/MM')} - {format(semana.fin, 'dd/MM')}
                {semana.liquidada ? 
                  <CheckCircle2 className="ml-1 h-3 w-3" /> : 
                  <AlertCircle className="ml-1 h-3 w-3" />
                }
              </Badge>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">
                  Semana del {format(semana.inicio, "d 'de' MMMM", { locale: es })} 
                  al {format(semana.fin, "d 'de' MMMM", { locale: es })}
                </h4>
                
                <p className="text-sm">
                  {semana.liquidada ? (
                    "Esta semana ya está liquidada. No se pueden registrar ni modificar partes de trabajo."
                  ) : (
                    "Semana abierta. Puedes registrar o modificar partes de trabajo."
                  )}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        ))}
      </div>
    </div>
  )
}
