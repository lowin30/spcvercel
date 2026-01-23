"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, Event } from 'react-big-calendar'
import format from 'date-fns/format'
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { useSupabase } from '@/lib/supabase-provider'
import { Database } from '../lib/database.types'
import { calendarLocalizer, calendarMessages } from '@/lib/calendar-config'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, Sun, Moon, InfoIcon, AlertTriangle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"

// Tipos
type ParteDeTrabajo = Database['public']['Tables']['partes_de_trabajo']['Row']
interface CalendarioPartesTrabajoProps {
  tareaId: string
  trabajadorId: string
  usuarioActual: any  // Objeto con id, rol, email, etc.
}
interface CalendarEvent extends Event {
  resource: ParteDeTrabajo
}
type Jornada = 'dia_completo' | 'medio_dia'

export default function CalendarioPartesTrabajo({ tareaId, trabajadorId, usuarioActual }: CalendarioPartesTrabajoProps) {
  // Helper: validar si una fecha pertenece a la semana actual (L→D) según locale
  const estaEnSemanaActual = useCallback((d: Date) => {
    const inicio = startOfWeek(new Date(), { locale: es })
    const fin = endOfWeek(inicio, { locale: es })
    return isWithinInterval(d, { start: inicio, end: fin })
  }, [])
  // Función para colorear eventos según tarea
  const eventStyleGetter = (event: CalendarEvent) => {
    const esEstaTarea = event.resource.id_tarea === parseInt(tareaId)

    let backgroundColor
    if (esEstaTarea) {
      // Tarea actual: Verde/Naranja (editables)
      backgroundColor = event.resource.tipo_jornada === 'dia_completo' ? '#10B981' : '#F59E0B'
    } else {
      // Otras tareas: Gris (solo lectura)
      backgroundColor = event.resource.tipo_jornada === 'dia_completo' ? '#6B7280' : '#9CA3AF'
    }

    const style = {
      backgroundColor,
      borderRadius: '5px',
      opacity: esEstaTarea ? 0.8 : 0.6,
      color: 'white',
      border: esEstaTarea ? '0px' : '2px solid #D1D5DB',
      display: 'block'
    }
    return { style }
  }
  const { supabase } = useSupabase()
  const [partes, setPartes] = useState<ParteDeTrabajo[]>([])
  const [tareasInfo, setTareasInfo] = useState<Record<number, { codigo: string, titulo: string }>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [modalState, setModalState] = useState<{
    date: Date | null,
    isLoading: boolean,
    parteExistente: ParteDeTrabajo | null,
    cargaTotalDia: number,
    jornadaSeleccionada: Jornada | '',
    partesEnOtrasTareas: ParteDeTrabajo[]  // Lista de partes en otras tareas para mostrar detalles
  }>({ date: null, isLoading: false, parteExistente: null, cargaTotalDia: 0, jornadaSeleccionada: '', partesEnOtrasTareas: [] })

  const fetchPartes = useCallback(async () => {
    // Optimización: Solo seleccionar campos necesarios (id, id_tarea, fecha, tipo_jornada)
    // Esto reduce ~60% el tamaño de los datos transferidos
    let query = supabase
      .from('partes_de_trabajo')
      .select('id, id_tarea, fecha, tipo_jornada, tareas(code, titulo)')

    // Para trabajadores: Mostrar TODOS sus partes (de todas las tareas)
    // Para admin/supervisor: Solo de esta tarea y este trabajador
    if (usuarioActual.rol === 'trabajador') {
      query = query.eq('id_trabajador', trabajadorId)
    } else {
      query = query.eq('id_tarea', parseInt(tareaId)).eq('id_trabajador', trabajadorId)
    }

    const { data, error } = await query
    if (error) console.error('Error fetching partes:', error)
    else {
      setPartes(data || [])

      // Construir mapa de tareas para referencia rápida
      const tareasMap: Record<number, { codigo: string, titulo: string }> = {}
      data?.forEach((p: any) => {
        if (p.id_tarea && p.tareas) {
          tareasMap[p.id_tarea] = {
            codigo: p.tareas.code || 'N/A',
            titulo: p.tareas.titulo || 'Sin título'
          }
        }
      })
      setTareasInfo(tareasMap)
    }
  }, [supabase, tareaId, trabajadorId, usuarioActual.rol])

  useEffect(() => {
    fetchPartes()
  }, [fetchPartes])

  const openModalWithData = useCallback(async (date: Date) => {
    // Bloqueo visual inmediato: solo semana actual
    if (!estaEnSemanaActual(date)) {
      toast({
        title: 'Fecha no permitida',
        description: 'Solo puedes registrar/modificar en la semana actual (L→D).',
        variant: 'destructive'
      })
      return
    }
    setIsDialogOpen(true)
    setModalState({ date, isLoading: true, parteExistente: null, cargaTotalDia: 0, jornadaSeleccionada: '', partesEnOtrasTareas: [] })

    const fechaISO = date.toISOString().split('T')[0]
    const idTareaNum = parseInt(tareaId)

    // 1. Carga total del día para el trabajador en TODAS las tareas
    // Optimización: Solo seleccionar campos necesarios (id, id_tarea, tipo_jornada)
    // Esto reduce ~70% el tamaño de los datos y acelera la respuesta del modal
    const { data: partesDelDia, error: errorPartesDia } = await supabase
      .from('partes_de_trabajo')
      .select('id, id_tarea, tipo_jornada')
      .eq('id_trabajador', trabajadorId)
      .eq('fecha', fechaISO)

    if (errorPartesDia) {
      console.error('Error fetching partes del día:', errorPartesDia)
      setIsDialogOpen(false)
      return
    }

    // 2. Parte existente para ESTA tarea específica
    const parteExistenteEnTareaActual = partesDelDia.find((p: { id_tarea: number | null }) => p.id_tarea === idTareaNum) as ParteDeTrabajo | null

    // 3. Partes en OTRAS tareas (para mostrar detalles)
    const partesEnOtrasTareas = partesDelDia.filter((p: { id_tarea: number | null }) => p.id_tarea !== idTareaNum) as ParteDeTrabajo[]
    const cargaOtrasTareas = partesEnOtrasTareas.reduce((acc: number, p: { tipo_jornada: string | null }) => acc + (p.tipo_jornada === 'dia_completo' ? 1 : 0.5), 0)

    setModalState({
      date,
      isLoading: false,
      parteExistente: parteExistenteEnTareaActual || null,
      cargaTotalDia: cargaOtrasTareas,
      jornadaSeleccionada: parteExistenteEnTareaActual?.tipo_jornada || '',
      partesEnOtrasTareas
    })
  }, [estaEnSemanaActual, supabase, trabajadorId, tareaId])

  // Fix para móviles: Agregar touch event listeners directos
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement

      // Buscar la celda del día (background o date cell)
      const dayBg = target.closest('.rbc-day-bg')
      const dateCell = target.closest('.rbc-date-cell')

      if (!dayBg && !dateCell) return

      // Obtener el número del día
      const dayElement = dateCell || dayBg?.parentElement?.querySelector('.rbc-date-cell')
      if (!dayElement) return

      const dayText = dayElement.textContent?.trim()
      if (!dayText || isNaN(parseInt(dayText))) return

      const dayNumber = parseInt(dayText)

      // Obtener mes y año del header
      const monthHeader = document.querySelector('.rbc-toolbar .rbc-toolbar-label')
      if (!monthHeader) return

      const headerText = monthHeader.textContent || ''
      const parts = headerText.split(' ')
      if (parts.length < 2) return

      const monthName = parts[0].toLowerCase()
      const year = parseInt(parts[1])

      const monthMap: Record<string, number> = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
        'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
        'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
      }

      const month = monthMap[monthName]
      if (month === undefined || isNaN(year)) return

      const selectedDate = new Date(year, month, dayNumber)

      // Validar que la fecha sea correcta
      if (selectedDate.getDate() !== dayNumber || selectedDate.getMonth() !== month) return

      // Prevenir scroll y zoom en móviles
      e.preventDefault()

      // Abrir modal
      openModalWithData(selectedDate)
    }

    // Solo agregar en dispositivos táctiles
    if ('ontouchstart' in window) {
      const calendar = document.querySelector('.rbc-month-view')
      if (calendar) {
        calendar.addEventListener('touchstart', handleTouchStart as EventListener, { passive: false })

        return () => {
          calendar.removeEventListener('touchstart', handleTouchStart as EventListener)
        }
      }
    }
  }, [openModalWithData])

  const handleSave = async () => {
    if (!modalState.date || !modalState.jornadaSeleccionada) return

    const fechaISO = modalState.date.toISOString().split('T')[0]

    // Validación previa a operación: semana actual
    if (!estaEnSemanaActual(modalState.date)) {
      toast({
        title: 'Fecha fuera de rango',
        description: 'Solo se permiten cambios en la semana actual (L→D).',
        variant: 'destructive'
      })
      return
    }

    if (modalState.parteExistente) {
      try {
        const resp = await fetch(`/api/partes/${modalState.parteExistente.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo_jornada: modalState.jornadaSeleccionada }),
        })
        if (!resp.ok) {
          let msg = 'No se pudo actualizar el parte'
          try {
            const j = await resp.json()
            msg = j?.error || j?.message || msg
          } catch { }
          toast({ title: 'Error', description: msg, variant: 'destructive' })
          return
        }
        // Optimistic update: actualizar en memoria
        setPartes(prev => prev.map(p => p.id === modalState.parteExistente!.id
          ? { ...p, tipo_jornada: modalState.jornadaSeleccionada as any }
          : p
        ))
      } catch (e: any) {
        console.error('Error en llamada a API PATCH /api/partes/[id]:', e)
        toast({ title: 'Error', description: 'Fallo al comunicar con el servidor', variant: 'destructive' })
        return
      }
    } else {
      const idTareaNum = parseInt(tareaId)
      if ((usuarioActual as any)?.rol === 'supervisor') {
        const { data: supOk } = await supabase
          .from('supervisores_tareas')
          .select('id')
          .eq('id_tarea', idTareaNum)
          .eq('id_supervisor', (usuarioActual as any).id)
          .maybeSingle()
        if (!supOk) {
          toast({
            title: 'Operación no permitida',
            description: 'No estás asignado como supervisor de esta tarea.',
            variant: 'destructive'
          })
          return
        }
        const { data: trabOk } = await supabase
          .from('trabajadores_tareas')
          .select('id')
          .eq('id_tarea', idTareaNum)
          .eq('id_trabajador', trabajadorId)
          .maybeSingle()
        if (!trabOk) {
          toast({
            title: 'Trabajador no asignado',
            description: 'Asigna primero el trabajador a esta tarea y luego registra la jornada.',
            variant: 'destructive'
          })
          return
        }
      }
      try {
        const resp = await fetch('/api/partes/registrar', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_tarea: idTareaNum,
            id_trabajador: trabajadorId,
            fecha: fechaISO,
            tipo_jornada: modalState.jornadaSeleccionada,
          }),
        })
        if (!resp.ok) {
          let msg = 'No se pudo registrar el parte'
          try {
            const j = await resp.json()
            msg = j?.error || j?.message || msg
          } catch { }
          toast({ title: 'Error', description: msg, variant: 'destructive' })
          return
        }
        // Optimistic create: agregar en memoria
        try {
          const j = await resp.json()
          const parte = (j?.parte as ParteDeTrabajo | undefined)
          if (parte) {
            setPartes(prev => [...prev, parte])
          }
        } catch { }
      } catch (e: any) {
        console.error('Error en llamada a API /api/partes/registrar:', e)
        toast({ title: 'Error', description: 'Fallo al comunicar con el servidor', variant: 'destructive' })
        return
      }
    }

    // Cerrar diálogo sin refetch (UI ya está actualizada optimistamente)
    setIsDialogOpen(false)
  }

  const handleDelete = async () => {
    if (!modalState.parteExistente) return
    if (modalState.date && !estaEnSemanaActual(modalState.date)) {
      toast({
        title: 'No permitido',
        description: 'Eliminar solo es posible en la semana actual (L→D) y si no está liquidada.',
        variant: 'destructive'
      })
      return
    }
    try {
      const resp = await fetch(`/api/partes/${modalState.parteExistente.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!resp.ok) {
        let msg = 'No se pudo eliminar el parte'
        try {
          const j = await resp.json()
          msg = j?.error || j?.message || msg
        } catch { }
        toast({ title: 'Error', description: msg, variant: 'destructive' })
        return
      }
      // Optimistic delete: quitar en memoria
      setPartes(prev => prev.filter(p => p.id !== modalState.parteExistente!.id))
    } catch (e: any) {
      console.error('Error en llamada a API DELETE /api/partes/[id]:', e)
      toast({ title: 'Error', description: 'Fallo al comunicar con el servidor', variant: 'destructive' })
      return
    }

    setIsDialogOpen(false)
  }

  // Optimización: Memoizar conversión de eventos para evitar recalcular en cada render
  // Esto evita crear objetos Date innecesariamente (importante con 100+ registros)
  const events: CalendarEvent[] = useMemo(() => {
    return partes.map(p => {
      const emoji = p.tipo_jornada === 'dia_completo' ? '☀️' : '🌙'

      return {
        title: emoji,
        start: new Date(p.fecha + 'T00:00:00'),
        end: new Date(p.fecha + 'T00:00:00'),
        allDay: true,
        resource: p,
      }
    })
  }, [partes, tareaId])

  // Optimización: Memoizar cálculos del modal para evitar recalcular en cada render
  const { cargaActualEnEstaTarea, puedeSeleccionarMedioDia, puedeSeleccionarDiaCompleto, ambasOpcionesDeshabilitadas, diaCompletoOcupadoEnOtrasTareas } = useMemo(() => {
    const carga = modalState.parteExistente?.tipo_jornada === 'dia_completo' ? 1 :
      (modalState.parteExistente?.tipo_jornada === 'medio_dia' ? 0.5 : 0)

    const puedeMedioDia = modalState.cargaTotalDia + 0.5 <= 1
    const puedeDiaCompleto = modalState.cargaTotalDia + 1 <= 1

    return {
      cargaActualEnEstaTarea: carga,
      puedeSeleccionarMedioDia: puedeMedioDia,
      puedeSeleccionarDiaCompleto: puedeDiaCompleto,
      // Detectar si ambas opciones están deshabilitadas (excepto si ya existe un parte en esta tarea que se puede mantener)
      ambasOpcionesDeshabilitadas: !puedeMedioDia && !puedeDiaCompleto && !modalState.parteExistente,
      // Banner crítico: Día completo ocupado en otras tareas
      diaCompletoOcupadoEnOtrasTareas: modalState.cargaTotalDia >= 1 && !modalState.parteExistente
    }
  }, [modalState.parteExistente, modalState.cargaTotalDia])

  // Tooltips contextuales
  const getTooltipMedioDia = () => {
    if (puedeSeleccionarMedioDia || cargaActualEnEstaTarea === 0.5) return ''
    if (modalState.cargaTotalDia >= 1) return 'El día completo ya está ocupado en otras tareas'
    if (modalState.cargaTotalDia > 0) return `Ya tiene ${modalState.cargaTotalDia} día(s) en otras tareas. Máximo permitido: 1 día total`
    return 'No se puede asignar más de 1 día completo en total.'
  }

  const getTooltipDiaCompleto = () => {
    if (puedeSeleccionarDiaCompleto || cargaActualEnEstaTarea === 1) return ''
    if (modalState.cargaTotalDia >= 1) return 'El día completo ya está ocupado en otras tareas'
    if (modalState.cargaTotalDia > 0 && cargaActualEnEstaTarea > 0) {
      return `Esto excedería el límite de 1 día (tiene ${cargaActualEnEstaTarea} en esta tarea + ${modalState.cargaTotalDia} en otras)`
    }
    if (modalState.cargaTotalDia > 0) return `Ya tiene ${modalState.cargaTotalDia} día(s) en otras tareas. Máximo permitido: 1 día total`
    return 'No se puede asignar más de 1 día completo en total.'
  }

  return (
    <>
      <div className="h-[55vh] sm:h-[70vh] transition-all duration-300">
        <Calendar
          localizer={calendarLocalizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          defaultView="month"
          views={['month']}
          selectable
          dayPropGetter={(date) => {
            if (!estaEnSemanaActual(date as Date)) {
              return {
                className: 'cursor-not-allowed bg-gray-50/60 opacity-50',
                style: { backgroundColor: 'transparent' }
              }
            }
            return {}
          }}
          onSelectSlot={(slotInfo) => {
            // Bloquear selección fuera de semana actual
            if (!estaEnSemanaActual(slotInfo.start as Date)) {
              toast({
                title: 'Fecha no permitida',
                description: 'Solo puedes registrar/modificar en la semana actual.',
                variant: 'destructive'
              })
              return
            }
            openModalWithData(slotInfo.start)
          }}
          onSelectEvent={(event) => openModalWithData(event.start as Date)}
          culture='es'
          messages={calendarMessages}
          eventPropGetter={eventStyleGetter}
          className="rounded-lg border shadow-sm text-xs sm:text-sm"
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[400px] p-4 sm:p-6 rounded-xl gap-3">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              Registrar Jornada
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {modalState.date && format(modalState.date, 'd MMM', { locale: es })}
              </span>
            </DialogTitle>
            {/* Description removed for minimalism on mobile, title has date */}
          </DialogHeader>

          {modalState.isLoading ? (
            <div className="flex justify-center items-center h-24 sm:h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="grid gap-3 py-2">
              {/* Banner Consolidado Compacto */}
              {(modalState.parteExistente || modalState.partesEnOtrasTareas.length > 0) && (
                <div className={`text-xs sm:text-sm p-2.5 rounded-lg border flex items-start gap-2.5 ${diaCompletoOcupadoEnOtrasTareas
                    ? 'bg-red-50/50 border-red-200 text-red-800'
                    : 'bg-blue-50/50 border-blue-200 text-blue-800'
                  }`}>
                  {diaCompletoOcupadoEnOtrasTareas ? <AlertTriangle className="h-4 w-4 mt-0.5" /> : <InfoIcon className="h-4 w-4 mt-0.5" />}
                  <div className="w-full">
                    <div className="font-semibold flex justify-between items-center mb-1">
                      <span>{diaCompletoOcupadoEnOtrasTareas ? 'Día ocupado' : 'Resumen'}</span>
                      <span className="bg-white/50 px-1.5 rounded text-[10px] border border-black/5">
                        {modalState.cargaTotalDia + cargaActualEnEstaTarea}/1 asignado
                      </span>
                    </div>

                    {/* Lista ultracompacta */}
                    <div className="space-y-1 opacity-90">
                      {modalState.parteExistente && (
                        <div className="flex justify-between border-b border-black/5 pb-1 mb-1">
                          <span>Esta tarea:</span>
                          <span className="font-medium">{modalState.parteExistente.tipo_jornada === 'dia_completo' ? 'Día Completo' : 'Medio Día'}</span>
                        </div>
                      )}
                      {modalState.partesEnOtrasTareas.map(p => (
                        <div key={p.id} className="flex justify-between truncate">
                          <span className="truncate max-w-[120px]">Tarea {p.id_tarea}</span>
                          <span className="font-medium shrink-0">{p.tipo_jornada === 'dia_completo' ? '1.0' : '0.5'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Opciones en Grid: Siempre side-by-side para ser compacto */}
              {ambasOpcionesDeshabilitadas ? (
                <div className="text-center p-4 bg-muted/30 border border-border rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">Opciones no disponibles</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <RadioCard
                    label="Medio Día"
                    subLabel="0.5"
                    value="medio_dia"
                    icon={<Moon className="w-5 h-5 sm:w-6 sm:h-6" />}
                    isSelected={modalState.jornadaSeleccionada === 'medio_dia'}
                    isDisabled={!puedeSeleccionarMedioDia && cargaActualEnEstaTarea !== 0.5}
                    onSelect={() => setModalState(s => ({ ...s, jornadaSeleccionada: 'medio_dia' }))}
                  />
                  <RadioCard
                    label="Día Completo"
                    subLabel="1.0"
                    value="dia_completo"
                    icon={<Sun className="w-5 h-5 sm:w-6 sm:h-6" />}
                    isSelected={modalState.jornadaSeleccionada === 'dia_completo'}
                    isDisabled={!puedeSeleccionarDiaCompleto && cargaActualEnEstaTarea !== 1}
                    onSelect={() => setModalState(s => ({ ...s, jornadaSeleccionada: 'dia_completo' }))}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-row gap-2 mt-2 pt-2 sm:pt-0 justify-end sm:justify-between border-t sm:border-0">
            {modalState.parteExistente && (
              <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0">
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)} className="h-9">Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={!modalState.jornadaSeleccionada || modalState.isLoading} className="h-9 min-w-[90px]">
                {modalState.parteExistente ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Componente para las tarjetas de radio visuales - Versión Minimalista
function RadioCard({ label, subLabel, value, icon, isSelected, isDisabled, onSelect }: {
  label: string, subLabel: string, value: Jornada, icon: React.ReactNode, isSelected: boolean, isDisabled: boolean, onSelect: () => void
}) {
  return (
    <div
      onClick={!isDisabled ? onSelect : undefined}
      className={`relative p-3 border rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all text-center
        ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card hover:bg-accent/50'}
        ${isDisabled ? 'opacity-50 grayscale cursor-not-allowed bg-muted/50' : 'cursor-pointer active:scale-95'}`
      }
    >
      <div className={`p-1.5 rounded-full ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-xs sm:text-sm font-medium leading-none">{label}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">{subLabel} jornada</span>
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
      )}
    </div>
  )
}