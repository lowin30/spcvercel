"use client"
import React, { useState, useEffect } from "react"
// Importamos react-big-calendar con una estrategia que evita la advertencia de JSX transform
// Importante: No modificar esta importación ya que puede causar problemas con el calendario
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar"
// Envolvemos el componente Calendar en un componente propio para evitar la advertencia de JSX transform
const CalendarComponent = (props: any) => <Calendar {...props} />
import { format, isToday, parseISO, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, startOfDay, getHours, getMinutes } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getPrioridadColor, getEstadoTareaColor } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User } from "lucide-react"
import "react-big-calendar/lib/css/react-big-calendar.css"
import "@/styles/calendar-mobile.css" // Importamos estilos personalizados para móvil

// Configuración del localizador para el calendario
const localizer = dateFnsLocalizer({
  format,
  parse: parseISO,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay: (date: Date) => date.getDay(),
  locales: { 'es': es }
})

// Nombres de días en español para usar en formatos
const diasSemanaCompletos = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const diasSemanaCortos = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

interface Tarea {
  id: number
  code: string
  titulo: string
  descripcion: string | null
  estado: string
  prioridad: string
  fecha_visita: string | null
  created_at: string
  id_asignado: string | null
  edificios: {
    nombre: string
  }
  usuarios: {
    email: string
    color_perfil?: string
  } | null
}

interface CalendarViewProps {
  tareas: Tarea[]
  userRole?: string
  userId?: string
}

export default function CalendarView({ tareas, userRole, userId }: CalendarViewProps) {
  // Estado para controlar la fecha y vista actual del calendario
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [currentView, setCurrentView] = useState<string>("month")
  
  // Detectores para diferentes tamaños de pantalla
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(min-width: 641px) and (max-width: 1023px)")
  
  // Ajustar vista predeterminada según el dispositivo
  useEffect(() => {
    if (isMobile) {
      // En móvil siempre usar agenda para mejor visualización
      setCurrentView("agenda")
    } else if (isTablet && currentView === "month") {
      // En tablet, la vista de semana es mejor que la mensual
      setCurrentView("week")
    } else if (!isMobile && !isTablet && currentView === "agenda") {
      // En escritorio, cambiar de agenda a mensual
      setCurrentView("month")
    }
    // Solo queremos que se ejecute cuando cambia el tamaño de pantalla
  }, [isMobile, isTablet])
  
  // Convertir tareas a eventos del calendario con validación robusta
  const eventos = tareas
    .filter((tarea) => {
      // Filtrar tareas que tengan fecha de visita y título
      return tarea && tarea.fecha_visita && typeof tarea.titulo === 'string';
    })
    .map((tarea) => {
      try {
        // Convertir a fecha y validar
        const fechaVisitaStr = String(tarea.fecha_visita);
        const fechaVisita = new Date(fechaVisitaStr);
        
        // Comprobar que la fecha es válida
        if (isNaN(fechaVisita.getTime())) {
          console.warn('Fecha inválida para tarea:', tarea.id);
          return null;
        }
        
        const esMiTarea = tarea.id_asignado === userId;
        const titulo = tarea.titulo || 'Sin título'; // Fallback por seguridad
      
        return {
          id: tarea.id,
          title: titulo,
          start: fechaVisita,
          end: new Date(fechaVisita.getTime() + 2 * 60 * 60 * 1000), // 2 horas por defecto
          resource: tarea,
          esMiTarea: esMiTarea
        };
      } catch (err) {
        console.error('Error procesando evento del calendario:', err);
        return null;
      }
    })
    .filter(Boolean) // Eliminar elementos nulos

  // Componente personalizado para el evento
  const EventComponent = ({ event }: any) => {
    const tarea = event.resource as Tarea
    const esHoy = isToday(event.start)
    const esMiTarea = event.esMiTarea
    
    return (
      <div 
        className={`flex flex-col h-full overflow-hidden p-2 border-l-4 rounded shadow-sm transition-all hover:shadow-md
          ${getEstadoTareaColor(tarea.estado)}
          ${esHoy ? 'ring-2 ring-primary ring-offset-1' : ''}
          ${esMiTarea ? 'border border-primary bg-primary/5' : ''}
        `}
        style={{borderLeftColor: getPrioridadColor(tarea.prioridad).replace('bg-', '').startsWith('bg-') ? 
          'var(--primary)' : 
          tarea.prioridad === 'alta' ? '#ef4444' : 
          tarea.prioridad === 'media' ? '#f59e0b' : 
          tarea.prioridad === 'baja' ? '#22c55e' : 
          '#cbd5e1'}}
      >
        <div className="flex justify-between items-start gap-1">
          <span className="font-medium text-xs line-clamp-2 text-gray-900">
            {esMiTarea && (
              <span className="inline-block w-2 h-2 rounded-full bg-primary mr-1" aria-label="Asignada a ti" />
            )}
            {event.title}
          </span>
          {tarea.edificios?.nombre && (
            <Badge variant="outline" className="text-[10px] h-4 whitespace-nowrap">
              {tarea.edificios.nombre}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between mt-1 text-xs">
          <Badge variant="secondary" className={`${getEstadoTareaColor(tarea.estado)} text-[10px] h-4 text-white font-medium`}>
            {tarea.estado}
          </Badge>
          <div className="flex items-center text-[10px] text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            {format(event.start, 'HH:mm', { locale: es })}
          </div>
        </div>
      </div>
    )
  }

  // Manejar clic en un evento
  const handleSelectEvent = (event: any) => {
    window.location.href = `/dashboard/tareas/${event.id}`
  }

  // Funciones de navegación inteligentes según la vista actual
  const goToPrevious = () => {
    if (currentView === "month") {
      const newDate = subMonths(currentDate, 1)
      setCurrentDate(newDate)
    } else if (currentView === "week") {
      const newDate = addDays(currentDate, -7)
      setCurrentDate(newDate)
    } else if (currentView === "day") {
      const newDate = addDays(currentDate, -1)
      setCurrentDate(newDate)
    } else {
      // Para vista agenda u otras, mover una semana atrás
      const newDate = addDays(currentDate, -7)
      setCurrentDate(newDate)
    }
  }
  
  const goToNext = () => {
    if (currentView === "month") {
      const newDate = addMonths(currentDate, 1)
      setCurrentDate(newDate)
    } else if (currentView === "week") {
      const newDate = addDays(currentDate, 7)
      setCurrentDate(newDate)
    } else if (currentView === "day") {
      const newDate = addDays(currentDate, 1)
      setCurrentDate(newDate)
    } else {
      // Para vista agenda u otras, mover una semana adelante
      const newDate = addDays(currentDate, 7)
      setCurrentDate(newDate)
    }
  }
  
  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Cambiar vistas manualmente
  const changeView = (viewName: string) => {
    setCurrentView(viewName)
  }

  // Componente de barra de navegación personalizada mejorada
  const CustomNavigationBar = () => {
    // Formato del mes y año actual
    const formattedDate = format(currentDate, 'MMMM yyyy', { locale: es })
    
    // Información de la semana si estamos en vista semanal
    const semanaInfo = currentView === "week" ? (
      <span className="text-sm text-gray-500 ml-2">
        (Semana {format(startOfWeek(currentDate, {locale: es}), 'd')} - {format(endOfWeek(currentDate, {locale: es}), 'd')})
      </span>
    ) : null

    return (
      <div className="calendario-navegacion select-none mb-6 space-y-4">
        {/* Cabecera con título y fecha actual */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-baseline">
            <h3 className="text-xl font-semibold capitalize text-slate-800">{formattedDate}</h3>
            {semanaInfo}
          </div>
          
          {/* Controles de navegación y vista */}
          <div className="flex flex-wrap gap-2">
            {/* Envolvemos todos los tooltips en un TooltipProvider */}
            <TooltipProvider>
              {/* Selector de vista */}
              <div className="flex rounded-md overflow-hidden border">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => changeView("month")}
                      className={`rounded-none border-r px-3 ${currentView === "month" ? 'bg-primary text-white' : ''}`}
                    >
                      <span className="sr-only">Vista Mensual</span>
                      <span className="hidden sm:inline">Mensual</span>
                      <span className="sm:hidden">Mes</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Vista mensual</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => changeView("week")}
                      className={`rounded-none border-r px-3 ${currentView === "week" ? 'bg-primary text-white' : ''}`}
                    >
                      <span className="sr-only">Vista Semanal</span>
                      <span className="hidden sm:inline">Semanal</span>
                      <span className="sm:hidden">Sem</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Vista semanal</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => changeView("day")}
                      className={`rounded-none border-r px-3 ${currentView === "day" ? 'bg-primary text-white' : ''}`}
                    >
                      <span className="sr-only">Vista Diaria</span>
                      <span>Día</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Vista diaria</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => changeView("agenda")}
                      className={`rounded-none px-3 ${currentView === "agenda" ? 'bg-primary text-white' : ''}`}
                    >
                      <span className="sr-only">Vista Agenda</span>
                      <span>Agenda</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Vista agenda</TooltipContent>
                </Tooltip>
              </div>

              {/* Controles de navegación */}
              <div className="flex rounded-md overflow-hidden border">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={goToPrevious}
                      className="rounded-none border-r px-3"
                      aria-label="Anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{currentView === "month" ? "Mes anterior" : 
                                  currentView === "week" ? "Semana anterior" : 
                                  currentView === "day" ? "Día anterior" : "Anterior"}</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={goToToday}
                      className="rounded-none border-r px-3"
                      aria-label="Hoy"
                    >
                      <span>Hoy</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ir a hoy</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={goToNext}
                      className="rounded-none px-3"
                      aria-label="Siguiente"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{currentView === "month" ? "Mes siguiente" : 
                                  currentView === "week" ? "Semana siguiente" : 
                                  currentView === "day" ? "Día siguiente" : "Siguiente"}</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>
    )
  }
  
  // Componente para encabezados de fecha
  const CustomDateHeader = ({ date }: { date: Date }) => {
    const esHoy = isToday(date)
    const esFindeSemana = date.getDay() === 0 || date.getDay() === 6
    const numeroDia = format(date, 'd', { locale: es })
    
    // Formato abreviado para días de la semana (L M M J V S D)
    const diaSemanaLetra = diasSemanaCortos[date.getDay()]
    
    return (
      <div 
        className={`text-center py-1 px-1 ${esHoy ? 'relative' : ''}`}
      >
        {/* Día de la semana */}
        <div className="text-[10px] uppercase text-gray-500">
          {diaSemanaLetra}
        </div>
        
        {/* Número de día */}
        <div className={`
          text-sm font-medium 
          ${esHoy ? 'rounded-full bg-primary/10 text-primary font-bold w-7 h-7 flex items-center justify-center mx-auto' : ''}
          ${esFindeSemana && !esHoy ? 'text-gray-400' : 'text-gray-900'}
        `}>
          {numeroDia}
        </div>
      </div>
    )
  }

  // Mensajes personalizados en español
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
      {/* Mensaje informativo según rol */}
      {userRole && (
        <div className="mb-4 text-sm">
          {userRole === "trabajador" ? (
            <div className="bg-blue-50 p-2 rounded border border-blue-100 text-blue-700">
              <p className="flex items-center"><User className="h-4 w-4 mr-1" /> Mostrando solo tus tareas asignadas. Tus tareas tienen un <span className="mx-1 inline-block w-2 h-2 rounded-full bg-primary" /> y borde azul.</p>
            </div>
          ) : userRole === "supervisor" ? (
            <div className="bg-amber-50 p-2 rounded border border-amber-100 text-amber-700">
              <p>Puedes ver todas las tareas. Las asignadas a ti tienen un <span className="mx-1 inline-block w-2 h-2 rounded-full bg-primary" /> y borde azul.</p>
            </div>
          ) : (
            <div className="bg-emerald-50 p-2 rounded border border-emerald-100 text-emerald-700">
              <p>Como administrador, puedes ver todas las tareas de todos los usuarios.</p>
            </div>
          )}
        </div>
      )}
      
      {/* Barra de navegación personalizada */}
      <CustomNavigationBar />

      {/* Contenedor del calendario con altura adaptativa y mejor responsive */}
      <div className="overflow-hidden rounded-lg" style={{ 
        height: isMobile ? "70vh" : isTablet ? "65vh" : "calc(100vh - 320px)",
        minHeight: "500px"
      }}>
        {/* 
          Usamos casting a any para evitar errores de tipo con react-big-calendar
          Esta biblioteca tiene problemas con los tipos de TypeScript
        */}
        <CalendarComponent
          className="h-full rbc-calendar-spanish"
          localizer={localizer}
          events={eventos}
          onSelectEvent={handleSelectEvent}
          date={currentDate}
          view={currentView}
          onNavigate={(newDate: Date) => setCurrentDate(newDate)}
          onView={(newView: string) => setCurrentView(newView)}
          views={{ month: true, week: true, day: true, agenda: true }}
          components={{
            event: EventComponent,
            month: {
              dateHeader: CustomDateHeader,
            },
            toolbar: () => null, // Ocultamos la barra de herramientas integrada
            // Personalizar los nombres de los días en todas las vistas
            week: {
              header: CustomDateHeader
            },
            day: {
              header: CustomDateHeader
            }
          }}
          formats={{
            // Formato para días de la semana en todas las vistas
            dayHeaderFormat: (date: Date) => diasSemanaCortos[date.getDay()],
            dayFormat: (date: Date) => diasSemanaCompletos[date.getDay()],
            monthHeaderFormat: (date: Date) => format(date, 'MMMM yyyy', { locale: es }),
            dayRangeHeaderFormat: ({ start, end }: { start: Date, end: Date }) => {
              return `${format(start, 'd', { locale: es })} - ${format(end, 'd MMM yyyy', { locale: es })}`
            },
            agendaHeaderFormat: ({ start, end }: { start: Date, end: Date }) => {
              return `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM yyyy', { locale: es })}`
            },
            // Formato de 24 horas para todos los horarios
            timeGutterFormat: (date: Date) => {
              const horas = getHours(date);
              const minutos = getMinutes(date);
              return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
            },
            eventTimeRangeFormat: ({ start, end }: { start: Date, end: Date }) => {
              return `${format(start, 'HH:mm', { locale: es })} - ${format(end, 'HH:mm', { locale: es })}`
            },
            agendaTimeRangeFormat: ({ start, end }: { start: Date, end: Date }) => {
              return `${format(start, 'HH:mm', { locale: es })} - ${format(end, 'HH:mm', { locale: es })}`
            },
            agendaTimeFormat: (date: Date) => {
              return format(date, 'HH:mm', { locale: es })
            }
          }}
          messages={mensajesEspanol}
        />
        
        {/* Estilos CSS para mejorar la presentación, especialmente en la vista agenda */}
        <style jsx global>{`
          /* Estilos para evitar scroll horizontal en móvil */
          .calendario-container .rbc-calendar {
            width: 100%;
            max-width: 100vw;
          }
          
          /* Estilos para la vista mensual */
          .calendario-container .rbc-month-view {
            flex: 1;
          }
          
          /* Ocultar contenido desbordado en celdas */
          .calendario-container .rbc-event {
            overflow: hidden;
          }
          
          /* Ajustar tamaño de texto en eventos */
          .calendario-container .rbc-event-content {
            font-size: 0.8rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          /* Mejorar vista agenda */
          .calendario-container .rbc-agenda-view table.rbc-agenda-table {
            width: 100%;
            border-spacing: 0;
            border-collapse: collapse;
          }
          
          .calendario-container .rbc-agenda-view table.rbc-agenda-table th,
          .calendario-container .rbc-agenda-view table.rbc-agenda-table td {
            padding: 8px;
            border-bottom: 1px solid #eaeaea;
          }
          
          .calendario-container .rbc-agenda-view table.rbc-agenda-table th {
            font-weight: 600;
            text-align: left;
            background-color: #f9fafb;
          }
          
          /* Ajustar columna de tiempo en agenda para que sea más compacta */
          .calendario-container .rbc-agenda-time-cell {
            width: 80px;
            white-space: nowrap;
            font-variant-numeric: tabular-nums;
          }
          
          /* Ajustar columna de fecha en agenda */
          .calendario-container .rbc-agenda-date-cell {
            width: 120px;
            font-weight: 500;
          }
          
          /* Asegurar que los nombres de días sean mayúsculas en todas las vistas */
          .calendario-container .rbc-header {
            text-transform: uppercase;
            font-weight: 600;
            font-size: 0.75rem;
            height: auto;
            min-height: 40px;
            padding-top: 8px;
            padding-bottom: 8px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          
          /* Ajuste específico para vista semanal */
          .calendario-container .rbc-time-view .rbc-header {
            border-bottom: 1px solid #ddd;
            padding: 4px 3px;
            height: auto;
            min-height: 50px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          
          /* Dar más espacio al día de la semana y al número */
          .calendario-container .rbc-header span {
            display: block;
            line-height: 1.2;
            margin-bottom: 2px;
          }
          
          /* Mejoras para la vista de agenda */
          .calendario-container .rbc-agenda-view {
            margin-top: 10px;
          }
          
          .calendario-container .rbc-agenda-event-cell {
            padding-right: 8px;
            max-width: 50vw;
          }
          
          .calendario-container .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
            padding: 10px 8px;
          }
          
          @media (max-width: 640px) {
            /* Ajustes específicos para móvil */
            .calendario-container .rbc-toolbar {
              flex-direction: column;
            }
            
            /* Reducir padding en móvil para mejor aprovechamiento */
            .calendario-container .rbc-agenda-view table.rbc-agenda-table th,
            .calendario-container .rbc-agenda-view table.rbc-agenda-table td {
              padding: 6px 4px;
              font-size: 0.85rem;
            }
            
            /* Ajustar columnas en móvil */
            .calendario-container .rbc-agenda-time-cell {
              width: 65px;
            }
            
            .calendario-container .rbc-agenda-date-cell {
              width: 80px;
            }
            
            /* Reducir tamaño de texto en móvil */
            .calendario-container .rbc-agenda-event-cell {
              max-width: 40vw;
              font-size: 0.85rem;
            }
          }
        `}</style>
      </div>
    </div>
  )
}
