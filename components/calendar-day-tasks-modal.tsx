"use client"
import React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Tarea {
  id: number
  titulo: string
  prioridad: string
  id_estado_nuevo: number
  estado_tarea: string
  fecha_visita: string | null
}

interface CalendarDayTasksModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date | null
  tareas: Tarea[]
  getColorFondo: (estado: string) => string
  getColorBorde: (estado: string) => string
}

export function CalendarDayTasksModal({
  isOpen,
  onClose,
  date,
  tareas,
  getColorFondo,
  getColorBorde
}: CalendarDayTasksModalProps) {
  if (!isOpen || !date) return null

  const fechaFormateada = format(date, "EEEE d 'de' MMMM, yyyy", { locale: es })

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-card rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] flex flex-col mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground capitalize">
              {fechaFormateada}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {tareas.length} {tareas.length === 1 ? 'tarea' : 'tareas'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4">
          {tareas.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground text-5xl mb-3">📅</div>
              <p className="text-muted-foreground font-medium">No hay tareas para este día</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tareas.map((tarea) => {
                const colorFondo = getColorFondo(tarea.estado_tarea)
                const colorBorde = getColorBorde(tarea.estado_tarea)
                
                return (
                  <div
                    key={tarea.id}
                    className="group cursor-pointer rounded-lg border-2 transition-all hover:shadow-md"
                    style={{ 
                      borderColor: colorBorde,
                      backgroundColor: `${colorFondo}15`
                    }}
                    onClick={() => {
                      window.location.href = `/dashboard/tareas/${tarea.id}`
                    }}
                  >
                    <div className="p-3">
                      {/* Estado Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span 
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: colorFondo,
                            color: 'var(--foreground)'
                          }}
                        >
                          {tarea.estado_tarea}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          #{tarea.id}
                        </span>
                      </div>

                      {/* Título */}
                      <h4 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
                        {tarea.titulo}
                      </h4>

                      {/* Prioridad */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Prioridad:</span>
                        <span 
                          className={`text-xs font-medium ${
                            tarea.prioridad === 'Alta' || tarea.prioridad === 'Urgente'
                              ? 'text-red-600'
                              : tarea.prioridad === 'Media'
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}
                        >
                          {tarea.prioridad}
                        </span>
                      </div>
                    </div>

                    {/* Hover effect */}
                    <div 
                      className="h-0.5 w-0 group-hover:w-full transition-all duration-300"
                      style={{ backgroundColor: colorBorde }}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/50">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
