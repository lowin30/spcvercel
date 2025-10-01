"use client"

import React from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import { EventInput } from '@fullcalendar/core'

// Definimos las props que este componente wrapper recibirá
interface PartesTrabajoCalendarWrapperProps {
  events: EventInput[]
  onDateClick: (arg: any) => void
  dayCellDidMount: (arg: any) => void
}

/**
 * Componente "tonto" y reutilizable que solo se encarga de renderizar FullCalendar.
 * Recibe los eventos y las funciones de callback como props.
 */
export function PartesTrabajoCalendarWrapper({
  events,
  onDateClick,
  dayCellDidMount
}: PartesTrabajoCalendarWrapperProps) {
  return (
    <div className="calendar-container p-4 bg-white rounded-lg shadow">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]} // Plugins para la vista de rejilla e interacción
        initialView="dayGridMonth" // Vista inicial mensual
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek' // Botones para cambiar de vista
        }}
        events={events} // Los eventos a mostrar, recibidos como prop
        locale={esLocale} // Configuración en español
        dateClick={onDateClick} // Callback para clic en una fecha, recibido como prop
        dayCellDidMount={dayCellDidMount} // Callback para modificar la celda del día, recibido como prop
        editable={false} // La lógica de edición se maneja en el popover, no arrastrando
        selectable={true}
        contentHeight="auto" // Altura automática para adaptarse al contenido
        weekends={true} // Mostrar fines de semana
        dayMaxEvents={true} // Muestra un "+X eventos" si no caben todos
      />
      {/* Estilos para mejorar la apariencia del calendario */}
      <style jsx global>{`
        .fc-daygrid-day.fc-day-today {
          background-color: #f0f9ff !important; /* Resaltar día actual */
        }
        .fc-event {
          cursor: pointer; /* Cursor de puntero en los eventos */
        }
        .fc .fc-button-primary {
          background-color: hsl(var(--primary));
          border-color: hsl(var(--primary));
        }
        .fc .fc-button-primary:hover {
          background-color: hsl(var(--primary) / 0.9);
        }
        .fc-day-past {
            background-color: #f7f7f7;
        }
        .fc-day-future {
            background-color: #ffffff;
        }
        .fc-day-disabled {
            background-color: #e0e0e0 !important;
            cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
