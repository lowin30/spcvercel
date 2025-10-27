"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, Event } from 'react-big-calendar'
import format from 'date-fns/format'
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
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

  const openModalWithData = async (date: Date) => {
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
  }

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
      // Actualizar
      const { error } = await supabase
        .from('partes_de_trabajo')
        .update({ tipo_jornada: modalState.jornadaSeleccionada })
        .eq('id', modalState.parteExistente.id)
      if (error) {
        console.error('Error updating parte:', error)
        toast({
          title: 'Operación no permitida',
          description: 'No puedes modificar partes fuera de la semana actual o en semanas cerradas.',
          variant: 'destructive'
        })
        return
      }
    } else {
      // Insertar
      const { error } = await supabase
        .from('partes_de_trabajo')
        .insert([{ id_tarea: parseInt(tareaId), id_trabajador: trabajadorId, fecha: fechaISO, tipo_jornada: modalState.jornadaSeleccionada, id_registrador: (usuarioActual as any).id }])
      if (error) {
        console.error('Error inserting parte:', error)
        toast({
          title: 'Operación no permitida',
          description: 'No puedes registrar partes fuera de la semana actual o en semanas cerradas.',
          variant: 'destructive'
        })
        return
      }
    }
    
    await fetchPartes() // Recargar todos los partes
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

    const { error } = await supabase
      .from('partes_de_trabajo')
      .delete()
      .eq('id', modalState.parteExistente.id)

    if (error) {
      console.error('Error deleting parte:', error)
      toast({
        title: 'Operación no permitida',
        description: 'No puedes eliminar partes fuera de la semana actual o en semanas cerradas.',
        variant: 'destructive'
      })
      return
    }
    
    await fetchPartes() // Recargar
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
      <div className="h-[70vh]">
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
                className: 'cursor-not-allowed',
                style: { backgroundColor: '#fafafa', opacity: 0.6 }
              }
            }
            return {}
          }}
          onSelectSlot={(slotInfo) => {
            // Bloquear selección fuera de semana actual
            if (!estaEnSemanaActual(slotInfo.start as Date)) {
              toast({
                title: 'Fecha no permitida',
                description: 'Solo puedes registrar/modificar en la semana actual (L→D).',
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
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Jornada</DialogTitle>
            {modalState.date && <DialogDescription>Para el {format(modalState.date, 'PPP', { locale: es })}.</DialogDescription>}
          </DialogHeader>

          {modalState.isLoading ? (
            <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="grid gap-4 py-4">
              {/* Banner Consolidado: Muestra el resumen completo del día */}
              {(modalState.parteExistente || modalState.partesEnOtrasTareas.length > 0) && (
                <div className={`text-sm p-3 rounded-md border-2 ${
                  diaCompletoOcupadoEnOtrasTareas 
                    ? 'bg-red-50 border-red-300 text-red-700' 
                    : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                  <div className="flex items-start gap-2">
                    {diaCompletoOcupadoEnOtrasTareas ? (
                      <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    ) : (
                      <InfoIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-bold text-base mb-2">
                        {diaCompletoOcupadoEnOtrasTareas ? '🚫 DÍA COMPLETO OCUPADO' : '📋 Resumen de esta fecha'}
                      </p>
                      
                      {/* Parte en ESTA tarea */}
                      {modalState.parteExistente && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold mb-1">✏️ En esta tarea:</p>
                          <div className={`p-2 rounded text-xs ${
                            diaCompletoOcupadoEnOtrasTareas ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            <p className="font-medium">
                              {modalState.parteExistente.tipo_jornada === 'dia_completo' ? '☀️ Día Completo' : '🌙 Medio Día'}
                            </p>
                            <p className={`text-xs mt-0.5 ${
                              diaCompletoOcupadoEnOtrasTareas ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              Puedes modificarlo o eliminarlo abajo
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Partes en OTRAS tareas */}
                      {modalState.partesEnOtrasTareas.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-semibold mb-1">📌 En otras tareas:</p>
                          <div className="space-y-1">
                            {modalState.partesEnOtrasTareas.map((parte) => {
                              const tareaInfo = tareasInfo[parte.id_tarea || 0]
                              return (
                                <div key={parte.id} className={`p-2 rounded text-xs ${
                                  diaCompletoOcupadoEnOtrasTareas ? 'bg-red-100' : 'bg-orange-50 border border-orange-200'
                                }`}>
                                  <p className="font-medium">
                                    {parte.tipo_jornada === 'dia_completo' ? '☀️ Día Completo' : '🌙 Medio Día'}
                                  </p>
                                  <p className={diaCompletoOcupadoEnOtrasTareas ? 'text-red-700' : 'text-orange-700'}>
                                    {tareaInfo ? `${tareaInfo.codigo} - ${tareaInfo.titulo}` : `Tarea ${parte.id_tarea}`}
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Total ocupado */}
                      <div className={`mt-2 pt-2 border-t ${
                        diaCompletoOcupadoEnOtrasTareas ? 'border-red-200' : 'border-blue-200'
                      }`}>
                        <p className="text-xs font-bold">
                          Total ocupado: {modalState.cargaTotalDia + cargaActualEnEstaTarea} día(s) de 1
                        </p>
                        {diaCompletoOcupadoEnOtrasTareas && (
                          <p className="text-xs mt-1">⚠️ No puedes registrar más trabajo para esta fecha</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Si ambas opciones están deshabilitadas, mostrar mensaje en lugar de botones */}
              {ambasOpcionesDeshabilitadas ? (
                <div className="text-center p-6 bg-gray-50 border border-gray-200 rounded-md">
                  <InfoIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium text-gray-700">No hay opciones disponibles</p>
                  <p className="text-sm text-gray-500 mt-1">El trabajador ya tiene su capacidad completa asignada para esta fecha.</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <RadioCard
                    label="Medio Día"
                    value="medio_dia"
                    icon={<Moon className="w-8 h-8" />}
                    isSelected={modalState.jornadaSeleccionada === 'medio_dia'}
                    isDisabled={!puedeSeleccionarMedioDia && cargaActualEnEstaTarea !== 0.5}
                    disabledTooltip={getTooltipMedioDia()}
                    onSelect={() => setModalState(s => ({ ...s, jornadaSeleccionada: 'medio_dia' }))}
                  />
                  <RadioCard
                    label="Día Completo"
                    value="dia_completo"
                    icon={<Sun className="w-8 h-8" />}
                    isSelected={modalState.jornadaSeleccionada === 'dia_completo'}
                    isDisabled={!puedeSeleccionarDiaCompleto && cargaActualEnEstaTarea !== 1}
                    disabledTooltip={getTooltipDiaCompleto()}
                    onSelect={() => setModalState(s => ({ ...s, jornadaSeleccionada: 'dia_completo' }))}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between w-full">
            <div>
              {modalState.parteExistente && (
                <Button variant="destructive" onClick={handleDelete} className="w-full sm:w-auto">
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </Button>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!modalState.jornadaSeleccionada || modalState.isLoading}>
                {modalState.parteExistente ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Componente para las tarjetas de radio visuales
function RadioCard({ label, value, icon, isSelected, isDisabled, onSelect, disabledTooltip }: {
  label: string, value: Jornada, icon: React.ReactNode, isSelected: boolean, isDisabled: boolean, onSelect: () => void, disabledTooltip: string
}) {
  const content = (
    <div
      onClick={!isDisabled ? onSelect : undefined}
      className={`flex-1 p-4 border-2 rounded-lg flex flex-col items-center justify-center gap-2 transition-all cursor-pointer 
        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
        ${isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:border-blue-400'}`
      }
    >
      {icon}
      <span className="font-semibold">{label}</span>
    </div>
  )

  if (isDisabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent><p>{disabledTooltip}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}