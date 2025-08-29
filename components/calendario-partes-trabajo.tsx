"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import { format, isBefore, isToday, isAfter, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { X, ChevronDown, ChevronUp, Search, Calendar } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ParteTrabajo {
  id: number
  fecha: string
  tipo_jornada: string
  comentarios?: string | null
  id_trabajador: string
  id_tarea?: number
  created_at?: string
  id_registrador?: string
  titulo_tarea?: string
  email_trabajador?: string
  liquidado?: boolean
}

interface Liquidacion {
  id: number
  id_trabajador: string
  semana_inicio: string
  semana_fin: string
  estado: string
}

interface CalendarioPartesTrabajoProps {
  tareaId: number
  trabajadorId?: string
  usuarioActual: { id: string; rol: string }
  onRegistroChange?: (accion: 'registrado' | 'actualizado' | 'eliminado', fecha?: Date) => void
}

export function CalendarioPartesTrabajo({
  tareaId,
  trabajadorId: trabajadorIdInicial,
  usuarioActual,
  onRegistroChange
}: CalendarioPartesTrabajoProps) {
  const supabase = createClient()
  
  // Estado para almacenar el trabajador seleccionado (para admin/supervisor)
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<string | undefined>(
    usuarioActual.rol === 'trabajador' ? usuarioActual.id : trabajadorIdInicial
  )
  
  // Estados para los datos
  const [partesTrabajo, setPartesTrabajo] = useState<ParteTrabajo[]>([])
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [trabajadores, setTrabajadores] = useState<{ id: string; email: string }[]>([])
  
  // Estado para el día seleccionado y el modal
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null)
  const [comentario, setComentario] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false)

  // Estados para la tabla de partes no liquidados
  const [partesNoLiquidados, setPartesNoLiquidados] = useState<ParteTrabajo[]>([])
  const [isLoadingPartesPendientes, setIsLoadingPartesPendientes] = useState<boolean>(false)
  const [trabajadoresConPartes, setTrabajadoresConPartes] = useState<{ id: string; email: string; expandido: boolean; partes: ParteTrabajo[] }[]>([])
  const [busquedaTrabajador, setBusquedaTrabajador] = useState<string>('')
  const [mostrarTodosPendientes, setMostrarTodosPendientes] = useState<boolean>(true)

  // Cargar trabajadores asignados a la tarea (para admin/supervisor) usando vista optimizada
  useEffect(() => {
    async function cargarTrabajadores() {
      if (usuarioActual.rol !== 'admin' && usuarioActual.rol !== 'supervisor') return
      
      try {
        // Obtenemos los IDs de trabajadores desde la vista optimizada
        const { data: tareaInfo, error: errorTarea } = await supabase
          .from('vista_tareas_completa')
          .select('trabajadores_emails')
          .eq('id', tareaId)
          .single()
        
        if (errorTarea) {
          console.error('Error al cargar información de la tarea:', errorTarea)
          return
        }
        
        // Procesar los IDs de trabajadores para asegurar que sean UUIDs válidos
        let idsTrabajadores = tareaInfo?.trabajadores_emails || []
        
        // Si idsTrabajadores es un string, intentar procesarlo
        if (typeof idsTrabajadores === 'string') {
          try {
            // Si parece un JSON array
            if (idsTrabajadores.startsWith('[') && idsTrabajadores.endsWith(']')) {
              idsTrabajadores = JSON.parse(idsTrabajadores)
            } else {
              // Si es un email o un UUID simple
              idsTrabajadores = [idsTrabajadores]
            }
          } catch (error) {
            console.error('Error al procesar idsTrabajadores:', error)
            idsTrabajadores = []
          }
        }
        
        // Asegurar que todos los elementos son UUIDs válidos
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        idsTrabajadores = Array.isArray(idsTrabajadores)
          ? idsTrabajadores.filter(id => typeof id === 'string' && uuidRegex.test(id))
          : []
        
        console.log('IDs de trabajadores válidos después de filtrar:', idsTrabajadores)
        
        if (idsTrabajadores.length > 0) {
          const { data: usuarios, error: errorUsuarios } = await supabase
            .from('usuarios')
            .select('id, email')
            .in('id', idsTrabajadores)
          
          if (errorUsuarios) {
            console.error('Error al cargar usuarios:', errorUsuarios)
            return
          }
          
          setTrabajadores(usuarios || [])
        } else {
          // Si no hay trabajadores válidos, intentar cargar desde vista_asignaciones_tareas_trabajadores
          console.log('No se encontraron UUIDs válidos, intentando cargar desde vista_asignaciones_tareas_trabajadores')
          
          const { data: trabajadoresAsignados, error: errorAsignaciones } = await supabase
            .from('vista_asignaciones_tareas_trabajadores')
            .select('id_trabajador')
            .eq('id_tarea', tareaId)
            
          if (!errorAsignaciones && trabajadoresAsignados && trabajadoresAsignados.length > 0) {
            // Extraer los IDs de trabajadores directamente de la vista
            const idsDirectos = trabajadoresAsignados.map(t => t.id_trabajador)
            
            const { data: usuarios, error: errorUsuarios } = await supabase
              .from('usuarios')
              .select('id, email')
              .in('id', idsDirectos)
              
            if (!errorUsuarios) {
              setTrabajadores(usuarios || [])
              return
            }
          }
          
          setTrabajadores([])
        }
      } catch (error) {
        console.error('Error al cargar trabajadores:', error)
      }
    }
    
    cargarTrabajadores()
  }, [supabase, tareaId, usuarioActual.rol])
  
  // Referencia para el calendario
  const calendarRef = useRef<any>(null);

  // Función para cargar partes de trabajo
  const cargarPartesTrabajo = useCallback(async () => {
    if (!trabajadorSeleccionado || !tareaId) return [];
    
    console.log(`Cargando partes de trabajo para la tarea ${tareaId}, trabajador ${trabajadorSeleccionado}`);
    
    try {
      // Primero intentamos usar una función RPC para obtener los partes de trabajo
      // Esta función debe estar creada en Supabase con los permisos adecuados
      console.log('Intentando cargar partes mediante RPC obtener_partes_de_trabajo');
      
      try {
        const { data: partesRPC, error: errorRPC } = await supabase.rpc('obtener_partes_de_trabajo', {
          p_id_tarea: tareaId,
          p_id_trabajador: trabajadorSeleccionado
        });
        
        if (errorRPC) {
          console.log('Error en RPC obtener_partes_de_trabajo:', errorRPC);
          // Si la función RPC no está disponible, continuamos con el método tradicional
        } else if (partesRPC && partesRPC.length > 0) {
          console.log('Partes de trabajo obtenidos mediante RPC:', partesRPC);
          setPartesTrabajo(partesRPC);
          return partesRPC;
        }
      } catch (rpcError) {
        console.log('Error al llamar a la función RPC:', rpcError);
        // Continuamos con el método alternativo
      }
      
      // Si no podemos usar la función RPC o no devuelve resultados, intentamos usar la vista optimizada
      console.log('Intentando cargar partes mediante consulta a la vista optimizada');
      
      const { data: partesTabla, error: errorTabla } = await supabase
        .from('vista_partes_trabajo_completa')
        .select('*')
        .eq('id_tarea', tareaId)
        .eq('id_trabajador', trabajadorSeleccionado);
      
      if (errorTabla) {
        console.error('Error al consultar partes de trabajo directamente:', errorTabla);
        throw errorTabla;
      }
      
      if (partesTabla && partesTabla.length > 0) {
        console.log('Partes de trabajo obtenidos mediante consulta directa:', partesTabla);
        setPartesTrabajo(partesTabla);
        return partesTabla;
      }
      
      // Si no hay datos ni por RPC ni por consulta directa, retornamos array vacío
      console.log('No se encontraron partes de trabajo para este trabajador y tarea');
      setPartesTrabajo([]);
      return [];
      
    } catch (error) {
      console.error('Error al cargar partes de trabajo:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los registros de trabajo",
        variant: "destructive"
      });
      return [];
    }
  }, [supabase, tareaId, trabajadorSeleccionado]);

  // Función para cargar liquidaciones
  const cargarLiquidaciones = useCallback(async () => {
    if (!trabajadorSeleccionado) return;
    
    try {
      const { data: liqs, error: errorLiqs } = await supabase
        .from('liquidaciones_trabajadores')
        .select('*')
        .eq('id_trabajador', trabajadorSeleccionado)
        .order('semana_inicio', { ascending: false });
      
      if (errorLiqs) throw errorLiqs;
      
      setLiquidaciones(liqs || []);
      return liqs;
    } catch (error) {
      console.error('Error al cargar liquidaciones:', error);
      return [];
    }
  }, [supabase, trabajadorSeleccionado]);

  // Cargar datos iniciales
  useEffect(() => {
    async function cargarDatos() {
      if (!trabajadorSeleccionado || !tareaId) return;
      
      setIsLoading(true);
      try {
        // Cargar partes y liquidaciones
        await Promise.all([
          cargarPartesTrabajo(),
          cargarLiquidaciones()
        ]);
        
        // Actualizar el calendario si está disponible
        if (calendarRef.current) {
          const calendarApi = calendarRef.current.getApi();
          calendarApi.refetchEvents();
        }
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    cargarDatos();
  }, [supabase, tareaId, trabajadorSeleccionado, cargarPartesTrabajo, cargarLiquidaciones]);
  
  // Cargar partes no liquidados según el rol
  useEffect(() => {
    cargarPartesNoLiquidados();
  }, [usuarioActual, trabajadorSeleccionado, tareaId]);
  
  // Función para cargar partes no liquidados según el rol del usuario
  const cargarPartesNoLiquidados = async () => {
    setIsLoadingPartesPendientes(true);
    
    try {
      // Estrategia según el rol del usuario
      if (usuarioActual.rol === 'trabajador') {
        // Para trabajador: cargar solo sus partes no liquidados
        await cargarPartesNoLiquidadosTrabajador();
      } else if (usuarioActual.rol === 'supervisor') {
        // Para supervisor: cargar partes no liquidados de los trabajadores en sus tareas asignadas
        await cargarPartesNoLiquidadosSupervisor();
      } else if (usuarioActual.rol === 'admin') {
        // Para admin: cargar todos los partes no liquidados
        await cargarPartesNoLiquidadosAdmin();
      }
    } catch (error) {
      console.error('Error al cargar partes no liquidados:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los partes pendientes de liquidar",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPartesPendientes(false);
    }
  };
  
  // Cargar partes no liquidados para un trabajador
  const cargarPartesNoLiquidadosTrabajador = async () => {
    const { data, error } = await supabase
      .from('vista_partes_trabajo_completa')
      .select('*')
      .eq('id_trabajador', usuarioActual.id)
      .eq('liquidado', false)
      .order('fecha', { ascending: false });
    
    if (error) {
      console.error('Error al cargar partes no liquidados del trabajador:', error);
      throw error;
    }
    
    setPartesNoLiquidados(data || []);
  };
  
  // Cargar partes no liquidados para un supervisor (partes de trabajadores en tareas que supervisa)
  const cargarPartesNoLiquidadosSupervisor = async () => {
    // 1. Obtener las tareas asignadas al supervisor
    const { data: tareasAsignadas, error: errorTareas } = await supabase
      .from('supervisores_tareas')
      .select('id_tarea')
      .eq('id_supervisor', usuarioActual.id);
    
    if (errorTareas) {
      console.error('Error al cargar tareas asignadas al supervisor:', errorTareas);
      throw errorTareas;
    }
    
    if (!tareasAsignadas || tareasAsignadas.length === 0) {
      setPartesNoLiquidados([]);
      setTrabajadoresConPartes([]);
      return;
    }
    
    // Extraer los IDs de las tareas asignadas
    const idsTareas = tareasAsignadas.map((tarea: { id_tarea: number }) => tarea.id_tarea);
    
    // 2. Obtener partes no liquidados para estas tareas
    const { data: partes, error: errorPartes } = await supabase
      .from('vista_partes_trabajo_completa')
      .select('*')
      .in('id_tarea', idsTareas)
      .eq('liquidado', false)
      .order('fecha', { ascending: false });
    
    if (errorPartes) {
      console.error('Error al cargar partes no liquidados para las tareas del supervisor:', errorPartes);
      throw errorPartes;
    }
    
    setPartesNoLiquidados(partes || []);
    
    // 3. Agrupar por trabajador
    agruparPartesPorTrabajador(partes || []);
  };
  
  // Cargar partes no liquidados para un admin (todos los partes)
  const cargarPartesNoLiquidadosAdmin = async () => {
    const { data, error } = await supabase
      .from('vista_partes_trabajo_completa')
      .select('*')
      .eq('liquidado', false)
      .order('fecha', { ascending: false });
    
    if (error) {
      console.error('Error al cargar partes no liquidados para admin:', error);
      throw error;
    }
    
    setPartesNoLiquidados(data || []);
    
    // Agrupar por trabajador
    agruparPartesPorTrabajador(data || []);
  };
  
  // Función para agrupar partes por trabajador
  const agruparPartesPorTrabajador = (partes: ParteTrabajo[]) => {
    // Crear un mapa para agrupar
    const trabajadoresMap = new Map<string, {
      id: string;
      email: string;
      expandido: boolean;
      partes: ParteTrabajo[];
    }>();
    
    // Agrupar partes por trabajador
    partes.forEach(parte => {
      if (!parte.id_trabajador || !parte.email_trabajador) return;
      
      if (!trabajadoresMap.has(parte.id_trabajador)) {
        trabajadoresMap.set(parte.id_trabajador, {
          id: parte.id_trabajador,
          email: parte.email_trabajador,
          expandido: mostrarTodosPendientes, // Usar el estado global
          partes: []
        });
      }
      
      trabajadoresMap.get(parte.id_trabajador)!.partes.push(parte);
    });
    
    // Convertir el mapa a array
    const trabajadoresArray = Array.from(trabajadoresMap.values());
    
    // Ordenar por email del trabajador
    trabajadoresArray.sort((a, b) => a.email.localeCompare(b.email));
    
    setTrabajadoresConPartes(trabajadoresArray);
  };
  
  // Función para alternar la expansión de un trabajador
  const toggleExpansionTrabajador = (trabajadorId: string) => {
    const nuevosTrabajadores = trabajadoresConPartes.map(trab => {
      if (trab.id === trabajadorId) {
        return { ...trab, expandido: !trab.expandido };
      }
      return trab;
    });
    
    setTrabajadoresConPartes(nuevosTrabajadores);
  };
  
  // Función para calcular los días totales de un trabajador
  const calcularDiasTotales = (partes: ParteTrabajo[]) => {
    return partes.reduce((total, parte) => {
      return total + (parte.tipo_jornada === 'dia_completo' ? 1 : 0.5);
    }, 0);
  };
  
  // Función para calcular los días totales pendientes
  const calcularTotalDiasPendientes = () => {
    return partesNoLiquidados.reduce((total, parte) => {
      return total + (parte.tipo_jornada === 'dia_completo' ? 1 : 0.5);
    }, 0);
  };
  
  // Función para obtener los días transcurridos desde el registro
  const obtenerDiasTranscurridos = (fecha: string) => {
    const fechaParte = new Date(fecha);
    const hoy = new Date();
    return differenceInDays(hoy, fechaParte);
  };
  
  // Función para filtrar trabajadores por búsqueda
  const filtrarTrabajadores = () => {
    if (!busquedaTrabajador) {
      return trabajadoresConPartes;
    }
    
    return trabajadoresConPartes.filter(trab => 
      trab.email.toLowerCase().includes(busquedaTrabajador.toLowerCase())
    );
  };
  
  // Verificar si una fecha está dentro de una semana liquidada
  const esFechaLiquidada = (fecha: Date) => {
    const fechaStr = format(fecha, 'yyyy-MM-dd')
    return liquidaciones.some(liq => {
      return fechaStr >= liq.semana_inicio && fechaStr <= liq.semana_fin
    })
  }
  
  // Obtener parte de trabajo para una fecha específica
  const getParteTrabajo = (fecha: Date): ParteTrabajo | undefined => {
    // Formatear la fecha para comparación usando solo la parte de la fecha (sin hora)
    const fechaStr = format(fecha, 'yyyy-MM-dd')
    
    // Filtramos los partes para encontrar el que coincide con la fecha y la tarea actual
    const parte = partesTrabajo.find(p => {
      // Verificamos que la fecha del parte sea igual a la fecha buscada y sea de la tarea actual
      const coincide = p.fecha === fechaStr && p.id_tarea === tareaId;
      
      return coincide;
    });
    
    if (parte) {
      console.log(`✅ MATCH EXACTO: Encontrado parte ID=${parte.id} para fecha ${fechaStr} en tarea actual`);
    } else {
      console.log(`❌ No se encontró parte para la fecha ${fechaStr} en tarea actual`);
    }
    
    return parte;
  }
  
  // Función para obtener el estado del día (considerando todos los partes)
  const getEstadoDia = (fecha: Date) => {
    if (!fecha) return { hayMedioDiaTareaActual: false, hayDiaCompletoTareaActual: false, hayMedioDiaOtraTarea: false, hayDiaCompletoOtraTarea: false, totalAsignado: 0 };
    
    // Buscar en otrosPartesParaEsteDia en lugar de partesTrabajo para considerar todas las tareas
    const partesDelDia = otrosPartesParaEsteDia || [];
    const tareaActualPartes = partesDelDia.filter(p => p.id_tarea === tareaId);
    const otrasPartes = partesDelDia.filter(p => p.id_tarea !== tareaId);
    
    return {
      hayMedioDiaTareaActual: tareaActualPartes.some(p => p.tipo_jornada === 'medio_dia'),
      hayDiaCompletoTareaActual: tareaActualPartes.some(p => p.tipo_jornada === 'dia_completo'),
      hayMedioDiaOtraTarea: otrasPartes.some(p => p.tipo_jornada === 'medio_dia'),
      hayDiaCompletoOtraTarea: otrasPartes.some(p => p.tipo_jornada === 'dia_completo'),
      totalAsignado: tiempoYaAsignado
    };
  }
  
  // Manejar clic en un día del calendario
  const handleDateClick = (info: any) => {
    // Depuración para ver exactamente qué fecha estamos recibiendo
    console.log('DEBUG FECHAS CALENDARIO:')
    console.log('- info.dateStr:', info.dateStr);
    console.log('- info.date:', info.date);
    
    // Crear la fecha correctamente desde la fecha recibida del calendario
    // Extraer los componentes de la fecha directamente del objeto date
    const clickedDate = info.date;
    const year = clickedDate.getFullYear();
    const month = clickedDate.getMonth();
    const day = clickedDate.getDate();
    
    // Crear una nueva fecha local con estos componentes
    const fechaSeleccionada = new Date(year, month, day);
    console.log('- Fecha seleccionada corregida:', fechaSeleccionada);
    
    // Evitar seleccionar fechas futuras
    if (isAfter(fechaSeleccionada, new Date())) {
      toast({ title: "Fecha no permitida", description: "No puedes registrar días futuros", variant: "destructive" })
      return
    }
    
    // Evitar modificar fechas liquidadas
    if (esFechaLiquidada(fechaSeleccionada)) {
      toast({ title: "Semana liquidada", description: "Esta fecha pertenece a una semana ya liquidada", variant: "destructive" })
      return
    }
    
    setDiaSeleccionado(fechaSeleccionada)
    const parteExistente = getParteTrabajo(fechaSeleccionada)
    setComentario(parteExistente?.comentarios || "")
    setIsPopoverOpen(true)
  }
  
  // Estados para los partes existentes del trabajador en una fecha
  const [otrosPartesParaEsteDia, setOtrosPartesParaEsteDia] = useState<ParteTrabajo[]>([]);
  const [tiempoYaAsignado, setTiempoYaAsignado] = useState<number>(0);

  // Cargar partes existentes cuando cambia el día seleccionado
  useEffect(() => {
    // Si no hay día seleccionado o trabajador, no hacemos nada
    if (!diaSeleccionado || !trabajadorSeleccionado && usuarioActual.rol === 'trabajador') return;
    
    const idTrabajador = trabajadorSeleccionado || (usuarioActual.rol === 'trabajador' ? usuarioActual.id : undefined);
    if (!idTrabajador) return;
    
    const cargarPartesExistentes = async () => {
      try {
        const fechaStr = format(diaSeleccionado, 'yyyy-MM-dd');
        
        // Consultar todos los partes del trabajador para esa fecha (en cualquier tarea)
        const { data: partesExistentes, error } = await supabase
          .from('vista_partes_trabajo_completa')
          .select('*')
          .eq('id_trabajador', idTrabajador)
          .eq('fecha', fechaStr);
          
        if (error) throw error;
        
        console.log(`Partes existentes para ${fechaStr}:`, partesExistentes);
        
        // Guardar los partes encontrados
        setOtrosPartesParaEsteDia(partesExistentes || []);
        
        // Calcular el tiempo total ya asignado
        const tiempo = partesExistentes?.reduce((total, parte) => {
          return total + (parte.tipo_jornada === 'dia_completo' ? 1 : 0.5);
        }, 0) || 0;
        
        setTiempoYaAsignado(tiempo);
        
      } catch (error) {
        console.error("Error al cargar partes existentes:", error);
      }
    };
    
    cargarPartesExistentes();
  }, [diaSeleccionado, trabajadorSeleccionado, usuarioActual.id, usuarioActual.rol, supabase]);

  // Registrar parte de trabajo
  const registrarParte = async (tipoJornada: string, idParteEliminar?: number) => {
    // Si no hay trabajador seleccionado pero el usuario es un trabajador, usamos su ID
    const idTrabajador = trabajadorSeleccionado || (usuarioActual.rol === 'trabajador' ? usuarioActual.id : undefined);
    
    // Validaciones específicas según el caso
    if (!diaSeleccionado) {
      console.error("No hay día seleccionado para registrar parte");
      toast({
        title: "Error",
        description: "No se ha seleccionado ninguna fecha para el registro",
        variant: "destructive"
      });
      return;
    }
    
    if (!tareaId) {
      console.error("No hay tarea seleccionada para registrar parte");
      toast({
        title: "Error",
        description: "No se ha especificado una tarea para el registro",
        variant: "destructive"
      });
      return;
    }
    
    // Validación especial para administradores y supervisores
    if (!idTrabajador) {
      if (usuarioActual.rol === 'admin' || usuarioActual.rol === 'supervisor') {
        console.error("Admin/Supervisor no ha seleccionado un trabajador:", { 
          rol: usuarioActual.rol,
          usuarioId: usuarioActual.id
        });
        toast({
          title: "Selecciona un trabajador",
          description: "Como administrador o supervisor, debes seleccionar primero un trabajador antes de registrar un parte",
          variant: "destructive",
          duration: 5000 // Mostrar durante 5 segundos para asegurar visibilidad
        });
      } else {
        console.error("No se pudo determinar el ID del trabajador", { 
          trabajadorSeleccionado, 
          usuarioId: usuarioActual.id, 
          rol: usuarioActual.rol
        });
        toast({
          title: "Error",
          description: "No se pudo identificar correctamente al trabajador",
          variant: "destructive"
        });
      }
      return;
    }
    
    setIsLoading(true);
    
    try {
      const supabase = createClient();
      const fechaStr = format(diaSeleccionado, 'yyyy-MM-dd');
      const parteExistente = getParteTrabajo(diaSeleccionado);
      
      console.log(`Registrando parte: fecha=${fechaStr}, tipo=${tipoJornada}, trabajador=${idTrabajador}`);
      console.log("Parte existente:", parteExistente);
      
      // Si estamos creando un nuevo parte o cambiando de medio día a día completo,
      // verificamos si excede el límite de un día
      if ((!parteExistente || parteExistente.tipo_jornada !== tipoJornada) && 
          tipoJornada !== parteExistente?.tipo_jornada) {
        
        // Calcular el tiempo que tendrá asignado después de esta operación
        let tiempoTotal = 0;
        
        // Si es eliminación (tipoJornada igual al existente), no validamos tiempo
        if (!(parteExistente && parteExistente.tipo_jornada === tipoJornada)) {
          // Tiempo ya asignado en otras tareas (excluyendo la actual si existe)
          const tiempoOtrasPartes = otrosPartesParaEsteDia
            .filter(p => !parteExistente || p.id !== parteExistente.id)
            .reduce((total, parte) => {
              return total + (parte.tipo_jornada === 'dia_completo' ? 1 : 0.5);
            }, 0);
          
          // Tiempo que se va a registrar ahora
          const tiempoNuevo = tipoJornada === 'dia_completo' ? 1 : 0.5;
          
          tiempoTotal = tiempoOtrasPartes + tiempoNuevo;
          
          // Validar que no exceda un día
          if (tiempoTotal > 1) {
            setIsLoading(false);
            toast({
              title: "Límite de tiempo excedido",
              description: `Ya tienes registrado ${tiempoOtrasPartes === 0.5 ? 'medio día' : 'tiempo'} para esta fecha. No puedes exceder un día completo.`,
              variant: "destructive"
            });
            return;
          }
        }
      }
      
      // CASO 1: Eliminar parte existente según el ID proporcionado o el parte actual
      const idParteAEliminar = idParteEliminar || (parteExistente && parteExistente.tipo_jornada === tipoJornada ? parteExistente.id : null);
      if (idParteAEliminar) {
        console.log(`Eliminando parte existente con ID ${idParteAEliminar}`);
        
        try {
          // Intentar primero con la RPC
          const { error: rpcError } = await supabase.rpc('eliminar_parte_de_trabajo', {
            p_id_parte: idParteAEliminar
          });
          
          // Si hay error con la RPC, intentar eliminación directa
          if (rpcError) {
            console.error("Error en RPC eliminar_parte_de_trabajo:", rpcError);
            console.log("Intentando eliminación directa de la tabla partes_de_trabajo");
            
            const { error: deleteError } = await supabase
              .from('partes_de_trabajo')
              .delete()
              .eq('id', idParteAEliminar);
            
            if (deleteError) {
              console.error("Error al eliminar parte directamente:", deleteError);
              if (deleteError.code === '42501') { // Código de error de violación de política RLS
                toast({
                  title: "Error de permisos",
                  description: "No tienes permisos para eliminar este parte de trabajo.",
                  variant: "destructive"
                });
                setIsLoading(false);
                return; // Salimos de la función sin lanzar una excepción
              } else {
                throw deleteError;
              }
            }
          }
          
          // Actualizar el estado local para reflejar la eliminación inmediatamente
          const partesActualizados = partesTrabajo.filter(parte => parte.id !== idParteAEliminar);
          setPartesTrabajo(partesActualizados);
          // También actualizar otrosPartesParaEsteDia si corresponde
          setOtrosPartesParaEsteDia(otrosPartesParaEsteDia.filter(parte => parte.id !== idParteAEliminar));
          
          console.log("Parte eliminado correctamente");
          toast({
            title: "Parte eliminado",
            description: `Se ha eliminado el registro para el ${format(diaSeleccionado, 'dd/MM/yyyy')}`
          });
          
          // Recargar partes después de eliminar para asegurar sincronización con BD
          setTimeout(() => {
            cargarPartesTrabajo();
          }, 500);
          
          // Finalizar operación
          setIsLoading(false);
          setIsPopoverOpen(false);
          
          // Notificar al componente padre si hay cambios
          if (onRegistroChange) onRegistroChange();
          
          return;
          
        } catch (err) {
          console.error("Error al eliminar parte:", err);
          toast({
            title: "Error al eliminar",
            description: "No se pudo eliminar el parte de trabajo.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
      } 
      // CASO 2: Actualizar medio día a día completo
      else if (parteExistente && parteExistente.tipo_jornada === 'medio_dia' && tipoJornada === 'dia_completo') {
        console.log(`NUEVA ESTRATEGIA: Eliminar y crear nuevo parte en lugar de actualizar`);
        console.log(`- ID parte a eliminar: ${parteExistente.id}`);
        console.log(`- Tipo actual: ${parteExistente.tipo_jornada}`);
        console.log(`- Tipo nuevo a crear: ${tipoJornada}`);
        
        try {
          // PASO 1: Primero guardamos los datos del parte existente
          const datosParteOriginal = {
            id_trabajador: parteExistente.id_trabajador,
            id_tarea: parteExistente.id_tarea,
            fecha: parteExistente.fecha,
            comentarios: comentario || parteExistente.comentarios || ''
          };
          
          console.log("Datos guardados del parte original:", datosParteOriginal);
          
          // PASO 2: Eliminar el parte existente usando RPC que sabemos funciona
          console.log("Eliminando parte existente con ID:", parteExistente.id);
          
          const { error: deleteError } = await supabase.rpc('eliminar_parte_de_trabajo', {
            p_id_parte: parteExistente.id
          });
          
          if (deleteError) {
            console.error("Error al eliminar parte existente:", deleteError);
            throw deleteError;
          }
          
          console.log("Parte eliminado correctamente, procediendo a crear nuevo parte de día completo");
          
          // PASO 3: Crear un nuevo parte con tipo "dia_completo"
          const { data: newParteData, error: createError } = await supabase.rpc('registrar_parte_de_trabajo', {
            p_id_trabajador: datosParteOriginal.id_trabajador,
            p_id_tarea: datosParteOriginal.id_tarea,
            p_fecha: datosParteOriginal.fecha,
            p_tipo_jornada: 'dia_completo',
            p_comentarios: datosParteOriginal.comentarios
          });
          
          if (createError) {
            console.error("Error al crear nuevo parte de día completo:", createError);
            toast({
              title: "Error al actualizar",
              description: "Se eliminó el parte de medio día pero no se pudo crear el de día completo.",
              variant: "destructive"
            });
            // Recargar partes inmediatamente para mostrar el estado actual
            cargarPartesTrabajo();
            setIsLoading(false);
            return;
          }
          
          console.log("Nuevo parte de día completo creado con éxito");
          const actualizacionExitosa = true;
          
          // Actualizar localmente el parte modificado para reflejar inmediatamente el cambio
          // antes de esperar la recarga completa
          const partesActualizados = partesTrabajo.map(parte => {
            if (parte.id === parteExistente.id) {
              console.log(`Actualizando localmente el parte ID=${parte.id} a tipo_jornada='dia_completo'`);
              return {
                ...parte,
                tipo_jornada: 'dia_completo',
                comentarios: comentario || parte.comentarios
              };
            }
            return parte;
          });
          
          // Actualizar el estado inmediatamente
          setPartesTrabajo(partesActualizados);
          
          console.log("Parte actualizado correctamente a día completo");
          
          toast({
            title: "Día completo",
            description: `Se ha actualizado a día completo el ${format(diaSeleccionado, 'dd/MM/yyyy')}`,
            variant: "default"
          });
          
          // Recargar partes después de actualizar para asegurar sincronización con BD
          setTimeout(() => {
            cargarPartesTrabajo().then(partesRecargados => {
              if (partesRecargados) {
                console.log("Verificando si la actualización persiste después de recargar:");
                const parteActualizado = partesRecargados.find(p => p.id === parteExistente.id);
                if (parteActualizado) {
                  console.log(`Estado del parte ID=${parteExistente.id} después de recargar:`, 
                    parteActualizado.tipo_jornada === 'dia_completo' ? 
                    "✅ CORRECTO: día completo" : 
                    "❌ ERROR: sigue como medio día");
                }
                setPartesTrabajo(partesRecargados);
              }
            });
          }, 500);
          
          // Finalizar operación
          setIsLoading(false);
          setIsPopoverOpen(false);
          
          // Notificar al componente padre si hay cambios
          if (onRegistroChange) onRegistroChange();
          
          return;
          
        } catch (err) {
          console.error("Error al actualizar parte de medio día a día completo:", err);
          toast({
            title: "Error al actualizar",
            description: "No se pudo actualizar el parte de trabajo.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
      } 
            // CASO 3: Crear nuevo o reemplazar tipo existente
            else {
              console.log(`Creando/Reemplazando parte: fecha=${fechaStr}, tipo=${tipoJornada}`);
              
              try {
                // Registrar el parte usando la RPC
                console.log('Intentando usar RPC registrar_parte_de_trabajo con parámetros:', {
                  p_id_tarea: tareaId,
                  p_id_trabajador: idTrabajador,
                  p_fecha: fechaStr,
                  p_tipo_jornada: tipoJornada,
                  p_comentarios: comentario || null
                });
                
                // Primero intentamos con la RPC
                const { data, error } = await supabase.rpc('registrar_parte_de_trabajo', {
                  p_id_trabajador: idTrabajador,
                  p_id_tarea: tareaId,
                  p_fecha: fechaStr,
                  p_tipo_jornada: tipoJornada,
                  p_comentarios: comentario || null
                });
      
                // Si falla la RPC, intentamos inserción directa
                if (error) {
                  console.log("Error en RPC registrar_parte_de_trabajo:", error);
                  console.log("Intentando inserción directa a la tabla partes_de_trabajo");
                  
                  const { data: insertData, error: insertError } = await supabase
                    .from('partes_de_trabajo')
                    .insert({
                      id_trabajador: idTrabajador,
                      id_tarea: tareaId,
                      fecha: fechaStr,
                      tipo_jornada: tipoJornada,
                      comentarios: comentario || null
                    })
                    .select();
      
                  if (insertError) {
                    console.error("Error al insertar directamente:", insertError);
                    if (insertError.code === '42501') { // Código de error de violación de política RLS
                      toast({
                        title: "Error de permisos",
                        description: "No tienes permisos para registrar partes de trabajo para este usuario/tarea.",
                        variant: "destructive",
                        duration: 5000
                      });
                      setIsLoading(false);
                      return;
                    } else {
                      throw insertError;
                    }
                  }
                  
                  // Si se insertó correctamente, actualizamos el estado local con la nueva parte
                  if (insertData && insertData.length > 0) {
                    const nuevaParte = insertData[0];
                    console.log("Parte insertado directamente:", nuevaParte);
                    setPartesTrabajo([...partesTrabajo, nuevaParte]);
                  }
                } else {
                  // Si la RPC fue exitosa, obtener el ID del parte recién creado
                  console.log("Parte registrado con éxito vía RPC, datos:", data);
                  
                  // Consultar el parte recién creado para actualización local usando la vista optimizada
                  const { data: nuevaParteData } = await supabase
                    .from('vista_partes_trabajo_completa')
                    .select('*')
                    .eq('id_trabajador', idTrabajador)
                    .eq('fecha', fechaStr)
                    .limit(1);
                  
                  if (nuevaParteData && nuevaParteData.length > 0) {
                    console.log("Parte encontrado para actualización local:", nuevaParteData[0]);
                    setPartesTrabajo([...partesTrabajo, nuevaParteData[0]]);
                  }
                }
                
                // Mostrar mensaje de éxito
                toast({
                  title: "Registro guardado",
                  description: `Se ha registrado ${tipoJornada === 'dia_completo' ? 'día completo' : 'medio día'} para el ${format(diaSeleccionado, 'dd/MM/yyyy')}`
                });
                
                // Recargar partes después de crear/actualizar para asegurar sincronización con BD
                setTimeout(() => {
                  cargarPartesTrabajo().then(partesActualizados => {
                    if (partesActualizados) {
                      setPartesTrabajo(partesActualizados);
                      console.log("Estado partesTrabajo actualizado después de crear/reemplazar parte");
                    }
                  });
                }, 500);
                
                // Cerrar el diálogo y limpiar estados
                setIsPopoverOpen(false);
                setDiaSeleccionado(null);
                setComentario("");
                
                // Notificar al componente padre si hay cambios
                if (onRegistroChange) onRegistroChange();
                
              } catch (err) {
                console.error("Error grave al intentar registrar el parte:", err);
                toast({
                  title: "Error en la operación",
                  description: "No se pudo completar el registro del parte de trabajo.",
                  variant: "destructive"
                });
              } finally {
                setIsLoading(false);
              }
            }
          } catch (error) {
            console.error('Error al registrar parte de trabajo:', error);
            toast({
              title: "Error",
              description: "No se pudo registrar el parte de trabajo",
              variant: "destructive"
            });
            setIsLoading(false);
          }
        }
        
        // Función que genera eventos desde los partes de trabajo para visualizarlos en el calendario
        // Esta función ya no se utiliza, se usa obtenerEventosCalendario en su lugar
        const generarEventosPartes = (): Array<any> => {
          // Dejamos este código como referencia pero ya no lo usamos
          const eventos: Array<any> = [];
          return eventos;
        }
          
        // Conversión de los partes de trabajo al formato de eventos para FullCalendar
        const obtenerEventosCalendario = () => {
          // Agregamos log para depuración con número de secuencia para rastreo
          const secuenciaLog = Math.random().toString(36).substring(2, 8);
          console.log(`[${secuenciaLog}] Generando eventos de calendario a partir de partes:`, partesTrabajo);
          
          // Solo mostramos eventos cuando hay partes de trabajo reales
          if (!partesTrabajo || partesTrabajo.length === 0) {
            console.log(`[${secuenciaLog}] No hay partes de trabajo disponibles, mostrando calendario vacío`);
            return []; // Retornamos un array vacío para no mostrar eventos
          } else {
            // Si tenemos partes de trabajo reales, los convertimos a eventos
            const eventos = partesTrabajo.map(parte => {
              const esDiaCompleto = parte.tipo_jornada === 'dia_completo';
              console.log(`[${secuenciaLog}] Creando evento para parte: id=${parte.id}, fecha=${parte.fecha}, tipo=${parte.tipo_jornada}`);
              return {
                id: parte.id?.toString() || Math.random().toString(36).substring(2, 10),
                title: '', // Sin título visible para mejor estética
                start: parte.fecha,
                allDay: true, // Aseguramos que todos los eventos son de día completo para visualización
                className: esDiaCompleto ? 'parte-jornada-completa' : 'parte-media-jornada',
                extendedProps: {
                  tipo: parte.tipo_jornada,
                  comentarios: parte.comentarios
                }
              };
            });
            
            console.log(`[${secuenciaLog}] Total de eventos generados: ${eventos.length}`);
            return eventos;
          }
        }
        
        return (
          <div className="calendario-partes-trabajo">
            <style jsx global>{`
              /* Estilos simplificados para el calendario */
              .calendario-partes-trabajo .fc {
                font-family: var(--font-sans);
                max-width: 100%;
              }
              
              /* Aumentar altura de las celdas */
              .calendario-partes-trabajo .fc-daygrid-day {
                min-height: 80px;
                position: relative;
              }
              
              /* Asegurar que los números de los días sean visibles */
              .calendario-partes-trabajo .fc-daygrid-day-number {
                font-size: 1.1rem;
                font-weight: bold;
                padding: 4px 8px;
                background-color: rgba(255,255,255,0.9);
                border-radius: 50%;
                margin: 2px;
                z-index: 5;
                position: relative;
                box-shadow: 0 1px 2px rgba(0,0,0,0.15);
              }
      
              /* Estilos para los eventos de partes de trabajo */
              .calendario-partes-trabajo .parte-media-jornada {
                background-color: #90EE90 !important; /* Verde claro */
                border: none !important;
                height: 100% !important;
                width: 100% !important;
                margin: 0 !important;
                opacity: 0.9 !important;
                display: block !important;
              }
      
              .calendario-partes-trabajo .parte-jornada-completa {
                background-color: #228B22 !important; /* Verde oscuro */
                border: none !important;
                height: 100% !important;
                width: 100% !important;
                margin: 0 !important;
                opacity: 0.9 !important;
                display: block !important;
              }
      
              /* Asegurar que los eventos ocupen toda la celda */
              .calendario-partes-trabajo .fc-daygrid-event-harness {
                margin: 0 !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                position: absolute !important;
                z-index: 1 !important;
                width: 100% !important;
                height: 100% !important;
              }
              
              .calendario-partes-trabajo .fc-event {
                border: none !important;
                padding: 0 !important;
                height: 100% !important;
                width: 100% !important;
                margin: 0 !important;
                box-sizing: border-box !important;
              }
              
              /* Eliminar el contenedor interno del evento para que el color se muestre completo */
              .calendario-partes-trabajo .fc-event-main {
                padding: 0 !important;
                height: 100% !important;
                width: 100% !important;
              }
              
              /* Estilo para días liquidados */
              .calendario-partes-trabajo .liquidado {
                background-color: rgba(200,200,200,0.3);
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              
              /* Eventos de día completo (verde oscuro) */
              .calendario-partes-trabajo .parte-jornada-completa {
                background-color: #228B22 !important;
                border-color: #228B22 !important;
                color: white !important;
                text-align: center;
                padding: 2px 0;
                font-weight: bold;
                border-radius: 4px;
              }
              
              /* Eventos de medio día (verde claro) */
              .calendario-partes-trabajo .parte-media-jornada {
                background-color: #90EE90 !important;
                border-color: #90EE90 !important;
                color: #333 !important;
                text-align: center;
                padding: 2px 0;
                font-weight: bold;
                border-radius: 4px;
              }
              
              /* Día de hoy */
              .calendario-partes-trabajo .fc-day-today {
                background-color: rgba(255, 245, 157, 0.2) !important;
              }
              
              /* Días liquidados */
              .calendario-partes-trabajo .liquidado {
                background-color: rgba(200, 200, 200, 0.3);
                text-decoration: line-through;
              }
              
              /* Ajustes responsive */
              @media (max-width: 640px) {
                .calendario-partes-trabajo .fc-header-toolbar {
                  flex-direction: column;
                  gap: 0.5rem;
                }
                
                .calendario-partes-trabajo .fc-toolbar-title {
                  font-size: 1.2rem !important;
                }
                
                .calendario-partes-trabajo .fc-button {
                  padding: 0.3rem 0.5rem !important;
                  font-size: 0.8rem !important;
                }
              }
              
              /* Estilos para las cabeceras de días */
              .fc-col-header-cell {
                background-color: #f3f4f6 !important;
                font-weight: bold !important;
                text-align: center !important;
                padding: 4px 0 !important;
              }
              
              .fc-col-header-cell-cushion {
                color: #1e40af !important;
                font-size: 14px !important;
                padding: 4px !important;
                text-transform: uppercase !important;
              }
              /* Estilos mejorados para las celdas de días */
              .fc-daygrid-day {
                min-height: 65px !important;
                position: relative !important;
                text-align: center !important;
                display: table-cell !important;
                vertical-align: middle !important;
              }
              .fc-daygrid-day-frame {
                min-height: 100% !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
                align-items: center !important;
              }
              .fc-daygrid-day-top {
                width: 100% !important;
                display: flex !important;
                justify-content: flex-end !important;
                padding-right: 3px !important;
              }
              .fc-daygrid-day-number {
                font-size: 14px !important;
                font-weight: bold !important;
                padding: 2px 4px !important;
                background-color: rgba(255,255,255,0.9) !important;
                border-radius: 3px !important;
                border: 1px solid #ddd !important;
                box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
              }
              /* Estilos para los botones */
              .fc .fc-button {
                padding: 0.3rem 0.5rem !important;
                font-size: 0.8rem !important;
              }
              
              /* Optimizaciones para móvil */
              @media (max-width: 640px) {
                .calendario-partes-trabajo .fc-header-toolbar {
                  display: flex;
                  flex-direction: column;
                  gap: 0.5rem;
                }
                
                .calendario-partes-trabajo .fc-toolbar-title {
                  font-size: 1.2rem !important;
                }
                
                .calendario-partes-trabajo .fc-button {
                  padding: 0.3rem 0.5rem !important;
                  font-size: 0.8rem !important;
                }
              }
            `}</style>
            
            <div className="mb-4">
              {(usuarioActual.rol === 'admin' || usuarioActual.rol === 'supervisor') && trabajadores.length > 0 && (
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1">Seleccionar trabajador:</label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={trabajadorSeleccionado}
                    onChange={(e) => setTrabajadorSeleccionado(e.target.value)}
                  >
                    <option value="">Seleccione un trabajador</option>
                    {trabajadores.map((t) => (
                      <option key={t.id} value={t.id}>{t.email}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-60">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locale={esLocale}
                firstDay={1} // Lunes como primer día
                headerToolbar={{
                  left: 'prev,next',
                  center: 'title',
                  right: 'today'
                }}
                titleFormat={{ year: 'numeric', month: 'long' }}
                buttonText={{
                  today: 'Hoy'
                }}
                dateClick={handleDateClick}
                // Ya no usamos renderDayCellContent personalizado - FullCalendar maneja el número
                // En su lugar, agregamos eventos para los partes de trabajo
                events={obtenerEventosCalendario()}
                height="auto"
                fixedWeekCount={false} // Ajustar semanas según mes
                // No mostramos contenido en los eventos, solo el color de fondo
                eventContent={() => null}
                // Establecemos una altura mínima para las celdas
                dayCellClassNames={(arg) => {
                  return esFechaLiquidada(arg.date) ? 'liquidado' : '';
                }}
                contentHeight="auto"
                aspectRatio={1.35}
              />
            )}
            
            {/* Modal para registrar/editar parte de trabajo (sustituye al Popover) */}
            {diaSeleccionado && isPopoverOpen && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-lg">
                      {format(diaSeleccionado, "dd 'de' MMMM, yyyy", { locale: es })}
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setIsPopoverOpen(false)}
                    >
                      <span className="h-4 w-4">✕</span>
                    </Button>
                  </div>
                  
                  {/* Mostrar el estado actual del día */}
                  {diaSeleccionado && (
                    <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                      <div className="flex flex-col gap-2">
                        {/* Estado para esta tarea */}
                        {getParteTrabajo(diaSeleccionado) && (
                          <div className="flex items-center gap-2 mb-1">
                            <div 
                              className={`w-4 h-4 rounded-full ${
                                getParteTrabajo(diaSeleccionado)?.tipo_jornada === 'medio_dia' 
                                  ? 'bg-[#90EE90]' 
                                  : 'bg-[#228B22]'
                              }`}
                            />
                            <span className="font-medium">
                              {getParteTrabajo(diaSeleccionado)?.tipo_jornada === 'medio_dia'
                                ? 'Medio día registrado en esta tarea'
                                : 'Día completo registrado en esta tarea'}
                            </span>
                          </div>
                        )}
                        
                        {/* Estado global considerando todas las tareas */}
                        {getEstadoDia(diaSeleccionado).hayMedioDiaOtraTarea && (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-[#90EE90]"/>
                            <span className="text-sm text-gray-600">
                              Medio día registrado en otra tarea
                            </span>
                          </div>
                        )}
                        
                        {getEstadoDia(diaSeleccionado).hayDiaCompletoOtraTarea && (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-[#228B22]"/>
                            <span className="text-sm text-gray-600">
                              Día completo registrado en otra tarea
                            </span>
                          </div>
                        )}
                        
                        {/* Mostrar comentarios si existen */}
                        {getParteTrabajo(diaSeleccionado)?.comentarios && (
                          <p className="text-sm text-gray-600 italic mt-1">
                            "{getParteTrabajo(diaSeleccionado)?.comentarios}"
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                          {/* Indicador visual de tiempo disponible */}
                   <div className="mb-4">
                     <p className="text-sm font-medium">Tiempo asignado para este día:</p>
                     <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                       <div 
                         className={`h-2.5 rounded-full ${
                           tiempoYaAsignado === 0 ? 'bg-green-500' : 
                           tiempoYaAsignado === 0.5 ? 'bg-yellow-500' : 
                           'bg-red-500'}`} 
                         style={{ width: `${tiempoYaAsignado * 100}%` }}>
                       </div>
                     </div>
                     <p className="text-xs text-muted-foreground">
                       {tiempoYaAsignado === 0 ? 'Día completo disponible' :
                        tiempoYaAsignado === 0.5 ? 'Medio día disponible' :
                        'No hay tiempo disponible'}
                     </p>
                   </div>
                   
                   {/* Otros partes registrados en esta fecha */}
                   {otrosPartesParaEsteDia.length > 0 && otrosPartesParaEsteDia.some(p => p.id !== getParteTrabajo(diaSeleccionado)?.id) && (
                     <div className="mb-4 bg-gray-50 p-2 rounded-md border border-gray-200">
                       <p className="text-sm font-medium mb-1">Otros registros en esta fecha:</p>
                       <div className="space-y-2">
                         {otrosPartesParaEsteDia
                           .filter(p => p.id !== getParteTrabajo(diaSeleccionado)?.id)
                           .map(parte => (
                             <div key={parte.id} className="text-xs p-2 bg-muted rounded-md flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${parte.tipo_jornada === 'dia_completo' ? 'bg-[#228B22]' : 'bg-[#90EE90]'}`} />
                                  <div>
                                    <p><span className="font-medium">Tarea:</span> {parte.titulo_tarea || `ID: ${parte.id_tarea}`}</p>
                                    <p><span className="font-medium">Tipo:</span> {parte.tipo_jornada === 'dia_completo' ? 'Día completo' : 'Medio día'}</p>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-red-500 hover:text-red-700"
                                  onClick={() => registrarParte(parte.tipo_jornada, parte.id)}
                                >
                                  <span className="text-xs">✕</span>
                                </Button>
                              </div>
                           ))}
                       </div>
                     </div>
                   )}
                   
                   {/* Opciones según el estado actual */}
                   {diaSeleccionado && (
                     <div className="space-y-4">
                       {/* CASO 1: No hay registro en esta tarea pero hay medio día disponible */}
                       {!getParteTrabajo(diaSeleccionado) && tiempoYaAsignado === 0.5 && (
                         <div>
                           <Button 
                             onClick={() => registrarParte('medio_dia')} 
                             variant="outline" 
                             className="w-full bg-[#E8F5E9] hover:bg-[#C8E6C9] border border-[#4CAF50]">
                             <span className="font-medium">Registrar medio día en esta tarea</span>
                           </Button>
                         </div>
                       )}
                       
                       {/* CASO 2: No hay registro en esta tarea y hay tiempo completo disponible */}
                       {!getParteTrabajo(diaSeleccionado) && tiempoYaAsignado === 0 && (
                         <div className="flex gap-2">
                           <Button 
                             onClick={() => registrarParte('dia_completo')} 
                             variant="outline" 
                             className="flex-1"
                             disabled={isLoading}
                           >
                             Día Completo
                           </Button>
                           <Button 
                             onClick={() => registrarParte('medio_dia')} 
                             variant="outline" 
                             className="flex-1"
                             disabled={isLoading}
                           >
                             Medio Día
                           </Button>
                         </div>
                       )}
                
                       {/* CASO 3: Hay medio día en esta tarea, permitir completar a día completo */}
                       {getParteTrabajo(diaSeleccionado)?.tipo_jornada === 'medio_dia' && tiempoYaAsignado < 1 && (
                         <Button
                           onClick={() => registrarParte('dia_completo')}
                           variant="outline"
                           className="w-full bg-[#E8F5E9] hover:bg-[#C8E6C9]"
                           disabled={isLoading}
                         >
                           Completar a Día Completo
                         </Button>
                       )}
                       
                       {/* CASO 4: Día completo (no mostrar botones adicionales) */}
                       {tiempoYaAsignado >= 1 && !getParteTrabajo(diaSeleccionado) && (
                         <p className="text-center text-sm text-amber-600 font-medium">
                           No es posible registrar más tiempo en este día
                         </p>
                       )}
                     </div>
                   )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Comentarios:</label>
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Opcional"
                className="resize-none h-20"
              />
            </div>
            
            {/* Siempre mostrar la opción de eliminar si hay registro */}
            {getParteTrabajo(diaSeleccionado) && (
              <Button 
                onClick={() => registrarParte(getParteTrabajo(diaSeleccionado)!.tipo_jornada)} 
                variant="destructive"
                className="w-full"
                disabled={isLoading}
              >
                Eliminar Registro
              </Button>
            )}
            
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Sección de Partes No Liquidados */}
      <div className="mt-8 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Partes de trabajo pendientes de liquidar
              </CardTitle>
              {(usuarioActual.rol === 'admin' || usuarioActual.rol === 'supervisor') && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar trabajador..."
                      className="pl-8 h-9 w-full sm:w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                      value={busquedaTrabajador}
                      onChange={(e) => setBusquedaTrabajador(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setMostrarTodosPendientes(!mostrarTodosPendientes)}
                  >
                    {mostrarTodosPendientes ? "Contraer todos" : "Expandir todos"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoadingPartesPendientes ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <>
                {/* Vista para rol trabajador */}
                {usuarioActual.rol === 'trabajador' && (
                  <div>
                    {partesNoLiquidados.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-md">
                        <p className="text-muted-foreground">No tienes partes de trabajo pendientes de liquidar</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                          <div className="flex justify-between items-center pb-1 border-b mb-3">
                            <p className="font-medium">Total días pendientes: <span className="font-bold">{calcularTotalDiasPendientes()}</span></p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                            {partesNoLiquidados.map((parte) => (
                              <div key={parte.id} className="border rounded-md overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-3 border-b bg-muted/10">
                                  <h4 className="font-medium line-clamp-2" title={parte.titulo_tarea}>
                                    {parte.titulo_tarea || `Tarea #${parte.id_tarea}`}
                                  </h4>
                                </div>
                                <div className="p-2 flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">
                                      {parte.fecha ? format(new Date(parte.fecha), "dd/MM") : ""}
                                    </span>
                                    {obtenerDiasTranscurridos(parte.fecha) > 14 && (
                                      <Badge variant="destructive" className="text-xs">+{obtenerDiasTranscurridos(parte.fecha)}d</Badge>
                                    )}
                                  </div>
                                  <Badge className="text-xs" style={{
                                    backgroundColor: parte.tipo_jornada === 'dia_completo' ? 'rgb(34, 197, 94)' : 'rgb(187, 247, 208)', 
                                    color: parte.tipo_jornada === 'dia_completo' ? 'white' : 'rgb(20, 83, 45)'
                                  }}>
                                    {parte.tipo_jornada === 'dia_completo' ? 'Día completo' : 'Medio día'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                    )}
                  </div>
                )}
                
                {/* Vista para roles supervisor y admin */}
                {(usuarioActual.rol === 'supervisor' || usuarioActual.rol === 'admin') && (
                  <div>
                    {trabajadoresConPartes.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-md">
                        <p className="text-muted-foreground">No hay partes de trabajo pendientes de liquidar</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-1 border-b">
                          <p className="font-medium">
                            Total trabajadores con partes pendientes: <span className="font-bold">{filtrarTrabajadores().length}</span>
                          </p>
                          <p className="font-medium">
                            Total días pendientes: <span className="font-bold">{calcularTotalDiasPendientes()}</span>
                          </p>
                        </div>
                        
                        {filtrarTrabajadores().length === 0 ? (
                          <div className="text-center py-4">
                            <p>No se encontraron trabajadores que coincidan con la búsqueda</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {filtrarTrabajadores().map((trabajador) => (
                              <div key={trabajador.id} className="border rounded-md overflow-hidden">
                                <div 
                                  className="flex justify-between items-center p-3 bg-muted/50 cursor-pointer hover:bg-muted"
                                  onClick={() => toggleExpansionTrabajador(trabajador.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium">{trabajador.email}</span>
                                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
                                      {calcularDiasTotales(trabajador.partes)} días
                                    </Badge>
                                  </div>
                                  <Button variant="ghost" size="icon">
                                    {trabajador.expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </Button>
                                </div>
                                
                                {trabajador.expandido && (
                                  <div className="overflow-x-auto">
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 p-2">
                                      {trabajador.partes.map((parte) => (
                                        <div key={parte.id} className="border rounded-md overflow-hidden hover:shadow-md transition-shadow">
                                          <div className="p-3 border-b bg-muted/10">
                                            <h4 className="font-medium line-clamp-2" title={parte.titulo_tarea}>
                                              {parte.titulo_tarea || `Tarea #${parte.id_tarea}`}
                                            </h4>
                                          </div>
                                          <div className="p-2 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm">
                                                {parte.fecha ? format(new Date(parte.fecha), "dd/MM") : ""}
                                              </span>
                                              {obtenerDiasTranscurridos(parte.fecha) > 14 && (
                                                <Badge variant="destructive" className="text-xs">+{obtenerDiasTranscurridos(parte.fecha)}d</Badge>
                                              )}
                                            </div>
                                            <Badge className="text-xs" style={{
                                              backgroundColor: parte.tipo_jornada === 'dia_completo' ? 'rgb(34, 197, 94)' : 'rgb(187, 247, 208)', 
                                              color: parte.tipo_jornada === 'dia_completo' ? 'white' : 'rgb(20, 83, 45)'
                                            }}>
                                              {parte.tipo_jornada === 'dia_completo' ? 'Día completo' : 'Medio día'}
                                            </Badge>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}