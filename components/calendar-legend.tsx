import React from 'react'

interface EstadoTarea {
  id: number
  codigo: string
  nombre: string
  color: string
}

interface CalendarLegendProps {
  estadosTareas: EstadoTarea[]
}

export function CalendarLegend({ estadosTareas }: CalendarLegendProps) {
  if (estadosTareas.length === 0) return null
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
      <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
        Estados de Tareas
      </h4>
      <div className="flex flex-wrap gap-2">
        {estadosTareas.map((estado) => (
          <div 
            key={estado.id}
            className="flex items-center gap-1.5 text-xs"
          >
            <div 
              className="w-3 h-3 rounded-full shadow-sm"
              style={{ backgroundColor: estado.color }}
            />
            <span className="text-gray-700 font-medium">{estado.nombre}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
