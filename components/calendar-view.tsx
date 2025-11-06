"use client"
import React, { useState, useMemo } from "react"
import { Calendar, dateFnsLocalizer } from "react-big-calendar"
const CalendarComponent = (props: any) => <Calendar {...props} />
import { format, isToday, parseISO, startOfWeek, addDays, getHours, getMinutes } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/use-media-query"
import { ChevronLeft, ChevronRight } from "lucide-react"
import "@/styles/calendar-modern.css"
import { CalendarLegend } from "@/components/calendar-legend"
import { CalendarDayTasksModal } from "@/components/calendar-day-tasks-modal"

const localizer = dateFnsLocalizer({
  format: (date: Date, formatStr: string) => format(date, formatStr, { locale: es }),
  parse: parseISO,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1, locale: es }),
  getDay: (date: Date) => date.getDay(),
  locales: { 'es': es }
})

const diasSemanaCortos = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

interface Tarea {
  id: number
  titulo: string
  prioridad: string
  id_estado_nuevo: number
  estado_tarea: string
  fecha_visita: string | null
}

interface EstadoTarea {
  id: number
  codigo: string
  nombre: string
  color: string
}

interface CalendarViewProps {
  tareas: Tarea[]
  estadosTareas?: EstadoTarea[]
  userRole?: string
  userId?: string
}

function CustomDateHeader({ date, isMobile }: { date: Date; isMobile: boolean }) {
  const esHoy = isToday(date)
  const esFindeSemana = date.getDay() === 0 || date.getDay() === 6
  const numeroDia = format(date, 'd', { locale: es })
  const diaSemanaLetra = diasSemanaCortos[date.getDay()]
  
  return (
    <div className={`text-center ${isMobile ? 'py-0.5 px-0' : 'py-1 px-1'} ${esHoy ? 'relative' : ''}`}>
      <div className={`uppercase text-gray-500 ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}>
        {diaSemanaLetra}
      </div>
      <div className={`
        font-medium 
        ${isMobile ? 'text-[10px]' : 'text-sm'}
        ${esHoy ? `rounded-full bg-primary/10 text-primary font-bold ${isMobile ? 'w-5 h-5' : 'w-7 h-7'} flex items-center justify-center mx-auto` : ''}
        ${esFindeSemana && !esHoy ? 'text-gray-400' : 'text-gray-900'}
      `}>
        {numeroDia}
      </div>
    </div>
  )
}

export default function CalendarView({ tareas, estadosTareas = [], userRole, userId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentView, setCurrentView] = useState<string>("month")
  
  const isMobile = useMediaQuery("(max-width: 640px)")
  
  // Funciones de color DINÁMICAS usando estadosTareas
  const getColorPorEstadoTarea = (estadoNombre: string) => {
    const estado = estadosTareas.find(e => e.nombre === estadoNombre)
    return estado?.color || '#E5E7EB' // Gris por defecto
  }

  const getBordePorEstadoTarea = (estadoNombre: string) => {
    const color = getColorPorEstadoTarea(estadoNombre)
    // Oscurecer el color para el borde (simple aproximación)
    return color === '#E5E7EB' ? '#9CA3AF' : color
  }
  
  const eventos = useMemo(() => {
    return tareas
      .filter(tarea => tarea.fecha_visita)
      .map(tarea => {
        const fechaDate = new Date(tarea.fecha_visita!)
        const colorFondo = getColorPorEstadoTarea(tarea.estado_tarea)
        const colorBorde = getBordePorEstadoTarea(tarea.estado_tarea)
        
        return {
          id: tarea.id,
          title: tarea.titulo,
          start: fechaDate,
          end: addDays(fechaDate, 0),
          resource: tarea,
          allDay: true,
          style: {
            backgroundColor: colorFondo,
            borderLeft: `4px solid ${colorBorde}`,
            color: '#111827'
          }
        }
      })
      .filter(Boolean)
  }, [tareas, userId])

  const EventComponent = ({ event }: { event: any }) => {
    return <span className="truncate">{event.title}</span>
  }

  const DateHeader = ({ date }: { date: Date }) => (
    <CustomDateHeader date={date} isMobile={isMobile} />
  )

  const handleSelectEvent = (event: any) => {
    window.location.href = `/dashboard/tareas/${event.id}`
  }

  const handleSelectSlot = (slotInfo: any) => {
    setSelectedDate(slotInfo.start)
    setIsModalOpen(true)
  }

  const getTareasPorDia = (date: Date): Tarea[] => {
    if (!date) return []
    const dateStr = format(date, 'yyyy-MM-dd')
    return tareas.filter(tarea => {
      if (!tarea.fecha_visita) return false
      const tareaDateStr = format(new Date(tarea.fecha_visita), 'yyyy-MM-dd')
      return tareaDateStr === dateStr
    })
  }

  const tareasDelDiaSeleccionado = selectedDate ? getTareasPorDia(selectedDate) : []

  const mensajesEspanol = {
    today: "Hoy",
    previous: "Anterior",
    next: "Siguiente",
    month: "Mensual",
    week: "Semanal", 
    day: "Diario",
    agenda: "Agenda",
    date: "Fecha",
    time: "Hora",
    event: "Tarea",
    allDay: "Todo el día",
    noEventsInRange: "No hay tareas programadas para estas fechas",
    showMore: (total: number) => `+${total} tarea${total !== 1 ? 's' : ''} más`
  }

  return (
    <div className="calendario-container bg-white rounded-lg p-4 shadow-sm">
      {/* Navegación simple */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setCurrentDate(addDays(currentDate, currentView === "month" ? -30 : -1))}
            className="h-9 w-9 rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 font-medium uppercase">
              {format(currentDate, 'MMMM', { locale: es })}
            </span>
            <span className="text-xl font-bold text-gray-900">
              {format(currentDate, 'yyyy', { locale: es })}
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="h-9 px-3 font-semibold text-blue-600 border-blue-200"
            >
              Hoy
            </Button>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setCurrentDate(addDays(currentDate, currentView === "month" ? 30 : 1))}
              className="h-9 w-9 rounded-full"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {!isMobile && <CalendarLegend estadosTareas={estadosTareas} />}

      <div className="overflow-hidden rounded-lg" style={{ 
        height: isMobile ? "calc(100vh - 180px)" : "calc(100vh - 320px)",
        minHeight: isMobile ? "400px" : "600px"
      }}>
        <CalendarComponent
          className="h-full rbc-calendar-spanish"
          localizer={localizer}
          events={eventos}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable={true}
          eventPropGetter={(event: any) => {
            const tarea = event.resource as Tarea
            const colorFondo = getColorPorEstadoTarea(tarea.estado_tarea)
            const colorBorde = getBordePorEstadoTarea(tarea.estado_tarea)
            
            return {
              style: {
                backgroundColor: colorFondo,
                borderLeft: `4px solid ${colorBorde}`,
                color: '#111827',
                padding: isMobile ? '2px 4px' : '3px 6px',
                borderRadius: isMobile ? '4px' : '6px',
                fontSize: isMobile ? '9px' : '12px',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }
            }
          }}
          date={currentDate}
          view={currentView}
          onNavigate={(newDate: Date) => setCurrentDate(newDate)}
          onView={(newView: string) => setCurrentView(newView)}
          views={isMobile ? { month: true } : { month: true, week: true, day: true, agenda: true }}
          popup={true}
          components={{
            event: EventComponent,
            month: { dateHeader: DateHeader },
            toolbar: () => null,
            week: { header: DateHeader },
            day: { header: DateHeader }
          }}
          formats={{
            dayHeaderFormat: (date: Date) => diasSemanaCortos[date.getDay()],
            monthHeaderFormat: (date: Date) => format(date, 'MMMM yyyy', { locale: es }),
            timeGutterFormat: (date: Date) => {
              const horas = getHours(date)
              const minutos = getMinutes(date)
              return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
            }
          }}
          messages={mensajesEspanol}
        />
      </div>

      <CalendarDayTasksModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={selectedDate}
        tareas={tareasDelDiaSeleccionado}
        getColorFondo={getColorPorEstadoTarea}
        getColorBorde={getBordePorEstadoTarea}
      />
    </div>
  )
}
