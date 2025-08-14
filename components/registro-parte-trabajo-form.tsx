"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import { CalendarioPartesTrabajo } from '@/components/calendario-partes-trabajo'

interface Tarea {
  id: number
  titulo: string
  code: string
}

interface Usuario {
  id: string
  email: string
  // Agrega otros campos de usuario que puedas necesitar, ej. nombre completo
}

interface RegistroParteTrabajoFormProps {
  tareaIdInicial?: number
  trabajadorIdInicial?: string
  fechaInicial?: Date
  usuarioActual: Usuario & { rol: string }
  onParteRegistrado?: (accion?: 'registrado' | 'actualizado' | 'eliminado', fecha?: Date) => void // Callback opcional
}

export function RegistroParteTrabajoForm({
  tareaIdInicial,
  trabajadorIdInicial,
  fechaInicial,
  usuarioActual,
  onParteRegistrado,
}: RegistroParteTrabajoFormProps) {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()

  const [idTarea, setIdTarea] = useState<number | undefined>(tareaIdInicial)
  const idTrabajador = trabajadorIdInicial || (usuarioActual.rol === 'trabajador' ? usuarioActual.id : undefined)
  
  const [tareasDisponibles, setTareasDisponibles] = useState<Tarea[]>([])
  const [trabajadoresDisponibles, setTrabajadoresDisponibles] = useState<Usuario[]>([])

  const [loadingTareas, setLoadingTareas] = useState(false)
  const [loadingTrabajadores, setLoadingTrabajadores] = useState(false)

  // Cargar tareas disponibles usando las tablas relacionales directamente
  useEffect(() => {
    async function fetchTareas() {
      setLoadingTareas(true)
      let tareasQuery;
      
      // Si el usuario es supervisor, consultar las tareas que supervisa desde la tabla relacional
      if (usuarioActual.rol === 'supervisor') {
        // Primero obtenemos los ids de tareas que supervisa
        const { data: tareasSupervisa, error: errorSupervisa } = await supabase
          .from('supervisores_tareas')
          .select('id_tarea')
          .eq('id_supervisor', usuarioActual.id);
          
        if (errorSupervisa) {
          console.error('Error al obtener tareas supervisadas:', errorSupervisa);
          setLoadingTareas(false);
          return;
        }
        
        // Extraemos los IDs de tareas
        const idsTareas = tareasSupervisa?.map(t => t.id_tarea) || [];
        
        if (idsTareas.length === 0) {
          // Si no supervisa ninguna tarea, devolver un array vacío
          setTareasDisponibles([]);
          setLoadingTareas(false);
          return;
        }
        
        // Luego obtenemos los detalles de esas tareas
        tareasQuery = supabase
          .from('tareas')
          .select('id, titulo, code')
          .in('id', idsTareas);
      }
      // Para trabajadores, consultar las tareas asignadas desde la tabla relacional
      else if (usuarioActual.rol === 'trabajador') {
        // Primero obtenemos los ids de tareas asignadas
        const { data: tareasAsignadas, error: errorAsignadas } = await supabase
          .from('trabajadores_tareas')
          .select('id_tarea')
          .eq('id_trabajador', usuarioActual.id);
          
        if (errorAsignadas) {
          console.error('Error al obtener tareas asignadas:', errorAsignadas);
          setLoadingTareas(false);
          return;
        }
        
        // Extraemos los IDs de tareas
        const idsTareas = tareasAsignadas?.map(t => t.id_tarea) || [];
        
        if (idsTareas.length === 0) {
          // Si no tiene tareas asignadas, devolver un array vacío
          setTareasDisponibles([]);
          setLoadingTareas(false);
          return;
        }
        
        // Luego obtenemos los detalles de esas tareas
        tareasQuery = supabase
          .from('tareas')
          .select('id, titulo, code')
          .in('id', idsTareas)
          .eq('finalizada', false);
      }
      // Para administradores, mostrar todas las tareas
      else {
        tareasQuery = supabase
          .from('tareas')
          .select('id, titulo, code');
      }

      const { data, error } = await tareasQuery.order('titulo', { ascending: true })

      if (error) {
        console.error('Error al cargar tareas:', error)
        toast({ title: 'Error', description: 'No se pudieron cargar las tareas.', variant: 'destructive' })
      } else {
        setTareasDisponibles(data || [])
      }
      setLoadingTareas(false)
    }
    fetchTareas()
  }, [supabase, usuarioActual.rol, usuarioActual.id])

  // Cargar los trabajadores asignados cuando se selecciona una tarea (para admin/supervisor)
  useEffect(() => {
    async function cargarTrabajadoresAsignados() {
      if (!idTarea || (usuarioActual.rol !== 'admin' && usuarioActual.rol !== 'supervisor')) return
      
      setLoadingTrabajadores(true)
      
      try {
        console.log(`Consultando trabajadores para la tarea con ID ${idTarea} usando vista optimizada`)
        
        // Usar la vista optimizada para obtener los emails de trabajadores asignados a la tarea
        const { data: tareaInfo, error: errorTarea } = await supabase
          .from('vista_tareas_completa')
          .select('trabajadores_emails')
          .eq('id', idTarea)
          .single()
        
        if (errorTarea) {
          console.error('Error al cargar información de la tarea:', errorTarea)
          toast({
            title: 'Error',
            description: 'No se pudo cargar la información de la tarea seleccionada.',
            variant: 'destructive'
          })
          setLoadingTrabajadores(false)
          return
        }
        
        // Extraer los IDs de trabajadores del array en trabajadores_emails
        let idsTrabajadores = tareaInfo?.trabajadores_emails || []
        
        // Verificar si es un string y parsearlo si es necesario
        if (typeof idsTrabajadores === 'string') {
          try {
            if (idsTrabajadores.startsWith('[') && idsTrabajadores.endsWith(']')) {
              idsTrabajadores = JSON.parse(idsTrabajadores)
            } else {
              idsTrabajadores = [idsTrabajadores]
            }
          } catch (error) {
            console.error('Error al parsear IDs de trabajadores:', error)
            idsTrabajadores = []
          }
        }
        
        // Filtrar solo los IDs que son UUIDs válidos
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        idsTrabajadores = Array.isArray(idsTrabajadores) ? 
          idsTrabajadores.filter(id => typeof id === 'string' && uuidRegex.test(id)) : []
        
        console.log(`IDs de trabajadores válidos encontrados: ${idsTrabajadores.length || 0}`)
        
        // Si hay IDs de trabajadores, cargar la información completa de los usuarios
        if (idsTrabajadores.length > 0) {
          // Consultar solo si hay IDs válidos
          const { data: usuarios, error: errorUsuarios } = await supabase
            .from('usuarios')
            .select('id, email, nombre, color_perfil')
            .in('id', idsTrabajadores)
            
          if (errorUsuarios) {
            console.error('Error al cargar detalles de usuarios:', errorUsuarios)
            toast({ title: 'Error', description: 'No se pudieron cargar los detalles de los trabajadores.', variant: 'destructive' })
          } else if (usuarios) {
            setTrabajadoresDisponibles(usuarios)
          }
        } else {
          // Si no hay IDs válidos después de filtrar, intentar con la vista alternativa
          console.log('No se encontraron IDs válidos, intentando con vista alternativa')
          
          try {
            const { data: asignaciones, error: errorAsignaciones } = await supabase
              .from('vista_asignaciones_tareas_trabajadores')
              .select('id_trabajador')
              .eq('id_tarea', idTarea)
            
            if (errorAsignaciones) {
              console.error('Error al cargar asignaciones de respaldo:', errorAsignaciones)
              toast({
                title: "Sin trabajadores",
                description: "Esta tarea no tiene trabajadores asignados.",
                variant: "default"
              })
              setTrabajadoresDisponibles([])
              return
            }
            
            const idsAlternativos = asignaciones?.map(a => a.id_trabajador) || []
            
            if (idsAlternativos.length > 0) {
              const { data: usuarios, error: errorUsuarios } = await supabase
                .from('usuarios')
                .select('id, email, nombre, color_perfil')
                .in('id', idsAlternativos)
                
              if (errorUsuarios) {
                console.error('Error al cargar detalles de usuarios (vista alternativa):', errorUsuarios)
                toast({ title: 'Error', description: 'No se pudieron cargar los detalles de los trabajadores.', variant: 'destructive' })
              } else if (usuarios) {
                setTrabajadoresDisponibles(usuarios)
              }
            } else {
              toast({
                title: "Sin trabajadores",
                description: "Esta tarea no tiene trabajadores asignados.",
                variant: "default"
              })
              setTrabajadoresDisponibles([])
            }
          } catch (error) {
            console.error('Error al cargar trabajadores (vista alternativa):', error)
            toast({
              title: "Sin trabajadores",
              description: "Esta tarea no tiene trabajadores asignados.",
              variant: "default"
            })
            setTrabajadoresDisponibles([])
          }
        }
      } catch (error) {
        console.error('Error al cargar trabajadores asignados:', error)
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los trabajadores asignados a esta tarea.',
          variant: 'destructive',
        })
      } finally {
        setLoadingTrabajadores(false)
      }
    }
    
    cargarTrabajadoresAsignados()
  }, [idTarea, supabase, usuarioActual.rol]);

  // Esta función ya no es necesaria porque utilizaremos solo el calendario

  // Función para manejar cambios en el calendario
  const handleCalendarioChange = (accion: 'registrado' | 'actualizado' | 'eliminado', fecha?: Date) => {
    // Notificar al componente padre
    if (onParteRegistrado) {
      onParteRegistrado(accion, fecha);
    }
    
    // Para futuro: aquí podríamos actualizar una lista de partes recientes si fuera necesario
  };

  return (
    <div className="space-y-6 p-4 border rounded-md shadow-sm bg-card">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Registrar Parte de Trabajo</h2>
      </div>
      
      {/* Selector de tarea, solo visible si no hay tarea inicial predefinida */}
      {!tareaIdInicial && (
        <div className="mb-4">
          <Label htmlFor="tarea">Tarea</Label>
          <Select onValueChange={(value) => setIdTarea(Number(value))} value={idTarea?.toString()} disabled={loadingTareas}>
            <SelectTrigger id="tarea" className="mt-1">
              <SelectValue placeholder={loadingTareas ? "Cargando tareas..." : "Selecciona una tarea"} />
            </SelectTrigger>
            <SelectContent>
              {tareasDisponibles.map((tarea) => (
                <SelectItem key={tarea.id} value={tarea.id.toString()}>
                  {tarea.code} - {tarea.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Eliminado el selector de trabajador, ahora solo se usa el del componente CalendarioPartesTrabajo */}

      <div className="mt-2 mb-4 p-2 bg-amber-50 border border-amber-200 rounded">
        <p className="text-sm text-amber-700">Para registrar un día, haz clic en la fecha deseada en el calendario y selecciona el tipo de jornada.</p>
      </div>

      {/* Mostrar calendario si hay tarea seleccionada */}
      {idTarea && (
        <CalendarioPartesTrabajo
          tareaId={idTarea}
          trabajadorId={idTrabajador}
          usuarioActual={usuarioActual}
          onRegistroChange={handleCalendarioChange}
        />
      )}
      
      {/* Mensaje si no hay tarea seleccionada */}
      {!idTarea && (
        <div className="text-center p-4 border border-dashed rounded-md">
          <p>Selecciona una tarea para ver el calendario de registro</p>
        </div>
      )}
    </div>
  )
}
