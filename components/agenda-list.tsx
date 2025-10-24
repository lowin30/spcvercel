"use client"

import Link from "next/link"
import { useMemo } from "react"
import { formatDate, getEstadoTareaColor, getPrioridadColor } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, AlertCircle } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"

// Interface optimizada: solo campos que vienen del servidor
interface Tarea {
  id: number
  code: string
  titulo: string
  descripcion: string | null
  prioridad: "baja" | "media" | "alta" | "urgente"
  id_estado_nuevo: number
  estado_tarea: string
  fecha_visita: string | null
  nombre_edificio: string
  trabajadores_emails?: string
}

interface AgendaListProps {
  tareas: Tarea[]
  userRole?: string
}

export function AgendaList({ tareas, userRole }: AgendaListProps) {
  // Detectar si es dispositivo móvil
  const isMobile = useMediaQuery("(max-width: 768px)")
  
  // Ordenar tareas: primero las que tienen fecha de visita, luego por prioridad
  // Optimización: useMemo para evitar re-ordenar en cada render
  const tareasOrdenadas = useMemo(() => {
    return [...tareas].sort((a, b) => {
    // Si ambas tienen fecha de visita, ordenar por fecha
    if (a.fecha_visita && b.fecha_visita) {
      return new Date(a.fecha_visita).getTime() - new Date(b.fecha_visita).getTime()
    }
    // Si solo una tiene fecha de visita, priorizarla
    if (a.fecha_visita && !b.fecha_visita) return -1
    if (!a.fecha_visita && b.fecha_visita) return 1

      // Si ninguna tiene fecha de visita, ordenar por prioridad
      const prioridadOrden = { baja: 4, media: 3, alta: 2, urgente: 1 }
      return prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad]
    })
  }, [tareas])

  if (tareasOrdenadas.length === 0) {
    return (
      <div className="text-center py-8 flex flex-col items-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No hay tareas programadas</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {tareasOrdenadas.map((tarea) => (
        <Link href={`/dashboard/tareas/${tarea.id}`} key={tarea.id}>
          <Card className="hover:bg-muted/50 transition-colors shadow-sm">
            <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0"> 
                  <div className="flex items-center gap-1 mb-1">
                    <div className={`w-2 h-2 rounded-full ${getPrioridadColor(tarea.prioridad)}`} />
                    <Badge variant="outline" className="text-xs py-0 px-1">{tarea.code}</Badge>
                  </div>
                  <h3 className="font-medium text-sm sm:text-base truncate">{tarea.titulo}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mt-1">
                    {tarea.descripcion || "Sin descripción"}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t">
                <div className="flex items-center">
                  <Badge variant="secondary" className="text-[10px]">
                    {tarea.estado_tarea || 'Sin estado'}
                  </Badge>
                </div>
                
                <div className="flex items-center text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1" />
                  <span className="truncate max-w-[100px] sm:max-w-[150px]">{tarea.nombre_edificio}</span>
                </div>
                
                {tarea.fecha_visita && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{formatDate(tarea.fecha_visita)}</span>
                  </div>
                )}
                
                {/* Mostrar trabajadores asignados */}
                {tarea.trabajadores_emails && (
                  <div className="flex items-center text-xs text-muted-foreground ml-auto">
                    <span className="truncate max-w-[80px] sm:max-w-[150px]">
                      {tarea.trabajadores_emails}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
