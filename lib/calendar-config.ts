/**
 * Configuración compartida para react-big-calendar
 * 
 * Este archivo centraliza la configuración del calendario para evitar
 * duplicación de código y crear el localizer una sola vez.
 * 
 * Usado en:
 * - components/calendario-partes-trabajo.tsx
 * - components/calendar-view.tsx
 */

import { dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Localizer configurado para español con semana comenzando en lunes
 */
export const calendarLocalizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { 'es': es }
})

/**
 * Mensajes en español para el calendario
 */
export const calendarMessages = {
  today: "Hoy",
  previous: "Anterior",
  next: "Siguiente",
  month: "Mes",
  week: "Semana",
  day: "Día",
  agenda: "Agenda",
  date: "Fecha",
  time: "Hora",
  event: "Evento",
  allDay: "Todo el día",
  noEventsInRange: "No hay eventos en este rango.",
  showMore: (total: number) => `+${total} más`
}
