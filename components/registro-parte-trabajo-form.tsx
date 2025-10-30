"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import CalendarioPartesTrabajo from '@/components/calendario-partes-trabajo'
import { Loader2 } from 'lucide-react'

// Interfaces para tipado
interface Tarea {
  id: number
  titulo: string
}

interface Trabajador {
  id: string
  email: string
}

interface RegistroParteTrabajoFormProps {
  usuarioActual: any
  tareaIdInicial?: number | null
  onParteRegistrado?: () => void
  fechaInicial?: Date
  trabajadorIdInicial?: string | null
}

export function RegistroParteTrabajoForm({ usuarioActual, tareaIdInicial, trabajadorIdInicial }: RegistroParteTrabajoFormProps) {
  const supabase = createClient()

  // Estados del componente
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [selectedTareaId, setSelectedTareaId] = useState<number | null>(null)
  const [selectedTrabajadorId, setSelectedTrabajadorId] = useState<string | null>(null)
  const [loadingTareas, setLoadingTareas] = useState(true)
  const [loadingTrabajadores, setLoadingTrabajadores] = useState(false)

  // Handlers para los selectores
  const handleTareaChange = (id: string) => {
    setSelectedTareaId(Number(id))
    
    // Solo resetear trabajador si es admin/supervisor
    // Para trabajadores, el trabajadorId SIEMPRE es él mismo
    if (usuarioActual.rol === 'admin' || usuarioActual.rol === 'supervisor') {
      setSelectedTrabajadorId(null)
      setTrabajadores([])
    }
  }

  const handleTrabajadorChange = (id: string) => {
    setSelectedTrabajadorId(id)
  }

  // Efecto para cargar las tareas según el rol del usuario
  useEffect(() => {
    async function fetchTareas() {
      setLoadingTareas(true)
      if (usuarioActual.rol === 'admin' || usuarioActual.rol === 'supervisor') {
        const { data, error } = await supabase
          .from('tareas')
          .select('id, titulo')
          .eq('finalizada', false)
          .order('titulo', { ascending: true })
        if (error) toast({ title: 'Error', description: 'No se pudieron cargar las tareas.', variant: 'destructive' })
        else {
          setTareas(data || [])
          // Preseleccionar tarea si viene desde página de tarea
          if (tareaIdInicial && (data || []).some(t => t.id === Number(tareaIdInicial))) {
            setSelectedTareaId(Number(tareaIdInicial))
          }
        }
      } else { // Rol: trabajador
        const { data: asignaciones, error: asignError } = await supabase
          .from('vista_asignaciones_tareas_trabajadores')
          .select('id_tarea')
          .eq('id_trabajador', usuarioActual.id)
        if (asignError || !asignaciones) {
          setTareas([])
        } else {
          const ids = Array.from(new Set(asignaciones.map(t => Number(t.id_tarea)))).filter(id => !Number.isNaN(id))
          if (ids.length === 0) {
            setTareas([])
          } else {
            const { data: tareasData, error: tareasError } = await supabase
              .from('tareas')
              .select('id, titulo')
              .in('id', ids)
              .eq('finalizada', false)
              .order('titulo', { ascending: true })
            if (tareasError || !tareasData) {
              setTareas([])
            } else {
              setTareas(tareasData)
              // Si viene tareaIdInicial (página de tarea), usarla; si no, auto-seleccionar solo si hay 1
              if (tareaIdInicial && tareasData.some(t => t.id === Number(tareaIdInicial))) {
                setSelectedTareaId(Number(tareaIdInicial))
              } else if (tareasData.length === 1) {
                setSelectedTareaId(tareasData[0].id)
              }
            }
          }

          // Para trabajadores, SIEMPRE auto-seleccionar su propio ID como trabajador
          setSelectedTrabajadorId(usuarioActual.id)
        }
      }
      setLoadingTareas(false)
    }
    fetchTareas()
  }, [supabase, usuarioActual.id, usuarioActual.rol, tareaIdInicial])

  // Efecto para cargar los trabajadores cuando se selecciona una tarea
  useEffect(() => {
    async function fetchTrabajadores() {
      if (!selectedTareaId || usuarioActual.rol === 'trabajador') {
        setTrabajadores([])
        return
      }
      setLoadingTrabajadores(true)
      const { data, error } = await supabase.from('vista_asignaciones_tareas_trabajadores').select('id_trabajador, email_trabajador').eq('id_tarea', selectedTareaId)
      if (error) {
        toast({ title: 'Error', description: 'No se pudieron cargar los trabajadores.', variant: 'destructive' })
        setTrabajadores([])
      } else if (data) {
        const trabajadoresUnicos = Array.from(new Map(data.map(t => [t.id_trabajador, { id: t.id_trabajador, email: t.email_trabajador }])).values());
        setTrabajadores(trabajadoresUnicos)
      } else {
        setTrabajadores([])
      }
      setLoadingTrabajadores(false)
    }
    fetchTrabajadores()
  }, [selectedTareaId, supabase, usuarioActual.rol])

  // Efecto: si es admin/supervisor y hay trabajadorIdInicial, preseleccionarlo cuando ya tengamos la lista
  useEffect(() => {
    if ((usuarioActual.rol === 'admin' || usuarioActual.rol === 'supervisor') && trabajadorIdInicial && selectedTareaId) {
      // Verificamos si el trabajador inicial está en la lista, si no, igual lo seteamos y el calendario se mostrará
      setSelectedTrabajadorId(trabajadorIdInicial)
    }
  }, [usuarioActual.rol, trabajadorIdInicial, selectedTareaId, trabajadores])

  if (loadingTareas) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Registro General de Partes</h2>

      {/* Mensaje si el trabajador no tiene tareas asignadas */}
      {tareas.length === 0 && usuarioActual.rol === 'trabajador' && (
        <div className="text-center p-8 bg-yellow-50 border-2 border-yellow-200 rounded-md">
          <p className="font-medium text-yellow-800 text-lg">No tienes tareas asignadas</p>
          <p className="text-sm text-yellow-600 mt-2">
            Contacta a tu supervisor para que te asigne a una tarea.
          </p>
        </div>
      )}

      {/* Selectores para Admin y Supervisor */}
      {(usuarioActual.rol === 'admin' || usuarioActual.rol === 'supervisor') && tareas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="tarea-select" className="block text-sm font-medium text-gray-700 mb-1">1. Seleccionar Tarea</label>
            <Select onValueChange={handleTareaChange} value={selectedTareaId?.toString() ?? ''}>
              <SelectTrigger id="tarea-select"><SelectValue placeholder="Elige una tarea..." /></SelectTrigger>
              <SelectContent>{tareas.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.titulo}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="trabajador-select" className="block text-sm font-medium text-gray-700 mb-1">2. Seleccionar Trabajador</label>
            <Select onValueChange={handleTrabajadorChange} value={selectedTrabajadorId ?? ''} disabled={!selectedTareaId || loadingTrabajadores}>
              <SelectTrigger id="trabajador-select">
                <SelectValue placeholder={loadingTrabajadores ? 'Cargando...' : 'Elige un trabajador...'} />
              </SelectTrigger>
              <SelectContent>{trabajadores.map(t => <SelectItem key={t.id} value={t.id}>{t.email}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Selector de Tarea SOLO para Trabajadores con múltiples tareas */}
      {usuarioActual.rol === 'trabajador' && tareas.length > 1 && !tareaIdInicial && (
        <div className="mb-4">
          <label htmlFor="tarea-select-trabajador" className="block text-sm font-medium text-gray-700 mb-2">
            Selecciona la tarea para registrar tus días de trabajo:
          </label>
          <Select onValueChange={handleTareaChange} value={selectedTareaId?.toString() ?? ''}>
            <SelectTrigger id="tarea-select-trabajador" className="w-full">
              <SelectValue placeholder="Elige una tarea..." />
            </SelectTrigger>
            <SelectContent>
              {tareas.map(t => (
                <SelectItem key={t.id} value={t.id.toString()}>
                  {t.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Renderizado del calendario cuando todo está seleccionado */}
      {selectedTareaId && selectedTrabajadorId ? (
        <div className="mt-6">
           <div className="mt-2 mb-4 p-2 bg-amber-50 border border-amber-200 rounded">
             <p className="text-sm text-amber-700">Para registrar un día, haz clic en la fecha deseada en el calendario y selecciona el tipo de jornada.</p>
           </div>
          <CalendarioPartesTrabajo
            key={`${selectedTareaId}-${selectedTrabajadorId}`}
            tareaId={selectedTareaId.toString()}
            trabajadorId={selectedTrabajadorId}
            usuarioActual={usuarioActual}
          />
        </div>
      ) : (
        (usuarioActual.rol === 'admin' || usuarioActual.rol === 'supervisor') && (
          <div className="text-center p-4 border-dashed border-2 rounded-md mt-4">
            <p>Selecciona una tarea y un trabajador para ver el calendario.</p>
          </div>
        )
      )}
    </div>
  )
}
