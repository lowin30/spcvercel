"use client"

import { DepartamentosInteractivos } from "@/components/departamentos-interactivos"
import { useState, useEffect, use } from "react"
import React from "react"
import { useRouter } from "next/navigation"
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTime, getPrioridadColor } from "@/lib/utils"
import { CommentList } from "@/components/comment-list"
import { CommentForm } from "@/components/comment-form"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { ArrowLeft, Calendar, MapPin, Calculator, FileText, UserPlus, UserCog, AlertTriangle, Loader2, X, UserRound, CalendarDays, CheckCircle, Circle, Map, Phone, InfoIcon, Users, Building, BuildingIcon, LinkIcon, ExternalLink, Trash2Icon, TrashIcon, EditIcon, FileTextIcon } from "lucide-react";
import { DatePickerVisual } from "@/components/date-picker-visual"
import { RegistroParteTrabajoForm } from "@/components/registro-parte-trabajo-form";
import { EstadoInteractivo } from "@/components/estado-interactivo"
import { PrioridadInteractiva } from "@/components/prioridad-interactiva"
import { SupervisorInteractivo } from "@/components/supervisor-interactivo"
import { TrabajadoresInteractivos } from "@/components/trabajadores-interactivos"
import { PresupuestosInteractivos } from "@/components/presupuestos-interactivos"

import ErrorBoundary from '@/components/error-boundary'
import { ProcesadorImagen } from '@/components/procesador-imagen'
import { HistorialGastosOCR } from '@/components/historial-gastos-ocr'
import { SemanasLiquidadasIndicador } from '@/components/semanas-liquidadas-indicador';

interface TaskPageProps {
  params: Promise<{ id: string }>
}

export default function TaskPage({ params: paramsPromise }: TaskPageProps) {
  const { id } = use(paramsPromise);
  const router = useRouter()
  const tareaId = parseInt(id);
  
  // Estados para datos principales
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tarea, setTarea] = useState<any>(null)
  const [userDetails, setUserDetails] = useState<any>(null)
  const [esTareaFinalizada, setEsTareaFinalizada] = useState(false)
  const [estadoActualId, setEstadoActualId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [supervisor, setSupervisor] = useState<any>(null)
  const [trabajadoresAsignados, setTrabajadoresAsignados] = useState<any[]>([])
  const [trabajadoresDisponibles, setTrabajadoresDisponibles] = useState<any[]>([])
  const [supervisoresDisponibles, setSupervisoresDisponibles] = useState<Array<any>>([])
  const [comentarios, setComentarios] = useState<any[]>([])
  const [esTrabajadorAsignado, setEsTrabajadorAsignado] = useState(false)

  
  // Estados para presupuestos
  const [presupuestoBase, setPresupuestoBase] = useState<any>(null)
  const [presupuestoFinal, setPresupuestoFinal] = useState<any>(null)
  
  // Estados locales para actualización en tiempo real
  const [prioridadActual, setPrioridadActual] = useState<string>("")
  const [mostrarFormularioParte, setMostrarFormularioParte] = useState(false);
  
  // Función para cargar presupuestos desde las tablas correctas
  const cargarPresupuestos = async (userRol?: string) => {
    try {
      const supabase = createClient()
      if (!supabase || !tareaId) {
        return
      }

      

      // 1. Cargar presupuesto base desde la tabla 'presupuestos_base'
      const { data: presupuestoBaseData, error: baseError } = await supabase
        .from("presupuestos_base")
        .select(`
          *,
          tareas!inner (
            code,
            titulo,
            id_edificio,
            edificios (nombre)
          )
        `)
        .eq("id_tarea", tareaId)
        .maybeSingle()

      

      if (baseError) {
        console.error("Error al cargar presupuesto base:", baseError)
        toast({
          title: "Error de Presupuesto",
          description: "No se pudo cargar el presupuesto base.",
          variant: "destructive",
        })
        setPresupuestoBase(null)
        setPresupuestoFinal(null)
        return
      }

      setPresupuestoBase(presupuestoBaseData)

      // 2. Buscar presupuesto final (dos casos posibles)
      let presupuestoFinalData = null
      
      // Caso 1: Si existe un presupuesto base, buscar el presupuesto final asociado
      if (presupuestoBaseData?.id) {
        
        
        const { data, error: finalError } = await supabase
          .from("presupuestos_finales")
          .select("*")
          .eq("id_presupuesto_base", presupuestoBaseData.id)
          .maybeSingle()

        

        if (finalError) {
          
        } else if (data) {
          presupuestoFinalData = data
        }
      }
      
      // Caso 2: Si no se encontró presupuesto final vía presupuesto base,
      // buscar presupuesto final vinculado directamente a la tarea (sin presupuesto base)
      if (!presupuestoFinalData) {
        
        const { data, error: finalDirectoError } = await supabase
          .from("presupuestos_finales")
          .select("*")
          .eq("id_tarea", tareaId)
          .is("id_presupuesto_base", null)
          .maybeSingle()

        

        if (finalDirectoError) {
          
        } else if (data) {
          presupuestoFinalData = data
        }
      }
      
      // Consultar facturas asociadas al presupuesto final (solo si es admin)
      if (presupuestoFinalData && userRol === "admin") {
        
        
        const { data: facturas, error: facturasError } = await supabase
          .from('facturas')
          .select('id, pagada')
          .eq('id_presupuesto_final', presupuestoFinalData.id)
        
        
        if (facturasError) {
          
        } else if (facturas && facturas.length > 0) {
          presupuestoFinalData.tiene_facturas = true
          presupuestoFinalData.facturas_pagadas = facturas.every(f => f.pagada)
          
        } else {
          
        }
      }
      
      // Establecer el presupuesto final encontrado (o null si no hay ninguno)
      setPresupuestoFinal(presupuestoFinalData)
      
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al cargar los presupuestos.",
        variant: "destructive",
      })
    }
  }
  
  // Función para cargar todos los datos de la tarea
  const cargarDatosTarea = async () => {
    // Solo cargar datos cuando tengamos un ID de tarea válido
    if (!tareaId) return;
    
    try {
      setLoading(true)
      const supabase = createClient()
      
      if (!supabase) {
        setError("No se pudo inicializar el cliente de Supabase")
        return
      }
      
      // Verificar sesión de usuario
      const sessionResponse = await supabase.auth.getSession()
      const session = sessionResponse.data.session
      
      if (!session) {
        router.push("/login")
        return
      }
      
      // Obtener detalles del usuario
      const userResponse = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", session.user.id)
        .single()
        
      const userData = userResponse.data
      const userError = userResponse.error
      
      if (userError) {
        setError("Error al obtener detalles del usuario")
        return
      }
      
      setUserDetails(userData)
      
      // Obtener tarea con manejo de errores mejorado usando la vista optimizada y expandiendo la información del edificio
      // Realizamos una consulta que garantice que tenemos todos los datos necesarios del edificio
      const { data: tareaData, error: tareaError } = await supabase
        .from("tareas")
        .select(`
          *,
          edificios!left (id, nombre, direccion, cuit)
        `)
        .eq("id", tareaId)
        .single()

      if (tareaError) {
        throw new Error(`Error al cargar la tarea: ${tareaError.message}`)
      }

      if (!tareaData) {
        setError("La tarea que estás buscando no existe o ha sido eliminada.")
        return
      }
      
      
      
      setTarea(tareaData)
      
      // Verificar si el usuario actual es el trabajador asignado
      if (userDetails?.id && tareaData && tareaData.id_asignado === userDetails.id) {
        setEsTrabajadorAsignado(true)
      } else {
        setEsTrabajadorAsignado(false)
      }
      
      // Inicializar estados cuando se carga la tarea
      if (tareaData) {
        const estadoId = tareaData.id_estado_nuevo != null ? Number(tareaData.id_estado_nuevo) : tareaData.estado != null ? Number(tareaData.estado) : null;
        setEstadoActualId(estadoId);
        setEsTareaFinalizada(Boolean(tareaData.finalizada));
        // Asegurarse de que la prioridad sea uno de los valores válidos
        const prioridad = tareaData.prioridad || '';
        setPrioridadActual(prioridad === 'baja' || prioridad === 'media' || prioridad === 'alta' || prioridad === 'urgente' ? prioridad : 'media');
        
      }
      
      // Extraer supervisores y trabajadores de la vista optimizada
      // La vista vista_tareas_completa ya incluye los datos de trabajadores y supervisores
      // como campos planos: supervisores_emails y trabajadores_emails
      
      // Para los supervisores: Consultamos directamente la tabla supervisores_tareas
      // para obtener los datos más actualizados y evitar problemas con la vista
      let supervisorData = null;
      
      
      
      // 1. Primero obtenemos el id_supervisor de la tabla supervisores_tareas
      const { data: supervisorAsignado, error: errorSupervisor } = await supabase
        .from("supervisores_tareas")
        .select("id_supervisor")
        .eq("id_tarea", tareaId)
        .maybeSingle();
        
      if (errorSupervisor) {
        
      }
      
      // 2. Si hay un supervisor asignado, obtenemos sus datos completos de la tabla usuarios
      if (supervisorAsignado?.id_supervisor) {
        
        const { data: supervisorUserData, error: errorUsuario } = await supabase
          .from("usuarios")
          .select("id, email, color_perfil")
          .eq("id", supervisorAsignado.id_supervisor)
          .maybeSingle();
          
        if (errorUsuario) {
          
        }
        
        if (supervisorUserData) {
          supervisorData = {
            usuarios: supervisorUserData
          };
        }
      } else {
        
      }
      
      
      setSupervisor(supervisorData);

      // Para los trabajadores: Consultamos directamente la tabla trabajadores_tareas
      // para obtener los datos más actualizados y evitar problemas con la vista
      const trabajadoresData = [];
      
      
      
      // 1. Obtenemos los id_trabajador de la tabla trabajadores_tareas
      const { data: trabajadoresAsignados, error: errorTrabajadores } = await supabase
        .from("trabajadores_tareas")
        .select("id_trabajador")
        .eq("id_tarea", tareaId);
        
      if (errorTrabajadores) {
        
      }
      
      // 2. Si hay trabajadores asignados, obtenemos sus datos completos de la tabla usuarios
      if (trabajadoresAsignados && trabajadoresAsignados.length > 0) {
        
        // Extraer los IDs de trabajadores
        const idsTrabajos = trabajadoresAsignados.map(t => t.id_trabajador);
        
        // Consultar datos completos de los trabajadores
        const { data: trabajadoresUserData, error: errorUsuarios } = await supabase
          .from("usuarios")
          .select("id, email, color_perfil")
          .in("id", idsTrabajos);
          
        if (errorUsuarios) {
          
        }
        
        if (trabajadoresUserData && trabajadoresUserData.length > 0) {
          // Formateamos los datos como el componente espera
          for (const trabajador of trabajadoresUserData) {
            trabajadoresData.push({
              usuarios: trabajador
            });
          }
        }
      } else {
        
      }
      
      
      setTrabajadoresAsignados(trabajadoresData || [])
      
      // Cargar todos los usuarios que son supervisores
      try {
        const { data: supervisores, error: errorSupervisores } = await supabase
          .from("usuarios")
          .select("id, email, color_perfil, code")
          .eq("rol", "supervisor")
        
        if (errorSupervisores) {
          
        } else {
          
          setSupervisoresDisponibles(supervisores || [])
        }
      } catch (error) {
        
      }
      
      // Cargar todos los trabajadores ACTIVOS disponibles
      try {
        // Consulta conjunta para obtener usuarios que son trabajadores y tienen configuración activa
        const { data: trabajadores, error: errorTrabajadores } = await supabase
          .from("usuarios")
          .select("id, email, color_perfil, configuracion_trabajadores!inner(activo)")
          .eq("rol", "trabajador")
          .eq("configuracion_trabajadores.activo", true)
        
        if (errorTrabajadores) {
          
        } else {
          // Convertir al formato que espera el componente
          const trabajadoresFormateados = trabajadores?.map((t: any) => ({
            id: t.id,
            email: t.email,
            color_perfil: t.color_perfil
          })) || []
          
          
          setTrabajadoresDisponibles(trabajadoresFormateados)
        }
      } catch (error) {
        
      }
      
      // Obtener comentarios - Consulta simple sin relaciones
      const comentariosResponse = await supabase
        .from("comentarios")
        .select("id, contenido, created_at, foto_url, id_usuario")
        .eq("id_tarea", tareaId)
        .order("created_at", { ascending: false })
      
      const comentariosData = comentariosResponse.data || []
      
      // Si hay comentarios, obtener información de usuarios
      if (comentariosData.length > 0) {
        const userIds = [...new Set(comentariosData.map((c: any) => c.id_usuario))]
        
        // Obtener datos de usuarios relacionados
        let usuariosResponse;
               // Solución alternativa para evitar errores de sintaxis con Supabase
        // Usar filtro genérico que funciona con uno o múltiples IDs
        try {
          // Construir consulta manualmente con filtro OR - solo columnas que existen
          let query = supabase.from("usuarios").select("id, email, code, color_perfil")
          
          // Si solo hay un ID, usar eq simple
          if (userIds.length === 1) {
            query = query.filter('id', 'eq', userIds[0])          
          } else {
            // Si hay múltiples, usar in
            query = query.filter('id', 'in', `(${userIds.join(',')})`)  
          }
          
          usuariosResponse = await query
        } catch (error) {
          
          usuariosResponse = { data: [] }
        }
        
        const usuariosData = usuariosResponse.data || []
        
        // Enriquecer los datos de comentarios con la información de usuarios
        const comentariosEnriquecidos = comentariosData.map((comentario: any) => {
          const usuario = usuariosData.find((u: any) => u.id === comentario.id_usuario)
          return {
            ...comentario,
            usuarios: usuario || null
          }
        })
        
        setComentarios(comentariosEnriquecidos)
      } else {
        setComentarios([])
      }
      

      
      // Cargar datos de presupuestos (base y final)
      await cargarPresupuestos(userData?.rol)
      
    } catch (err) {
      setError("Ocurrió un error inesperado al cargar la tarea")
    } finally {
      setLoading(false)
    }
  }

  // Manejar cambios en la fecha de visita
  const onDateChange = async (date: Date | null) => {
    try {
      // No verificamos permisos ya que todos los roles pueden modificar la agenda
      // La restricción anterior ha sido eliminada para permitir que todos modifiquen la fecha
      
      const supabase = createClient();
      
      // Comprobar que tenemos una sesión válida
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Error de sesión",
          description: "Tu sesión ha expirado. Inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }
      
      // Formatear la fecha para PostgreSQL - Formato local sin ajuste de zona horaria
      let formattedDate = null;
      if (date) {
        // Formatear manualmente usando la fecha y hora local sin convertir a UTC
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        // Formato YYYY-MM-DD HH:MM:SS (hora local sin ajuste)
        formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        
        
      }
      
      // Mostrar indicador de carga
      toast({
        title: "Guardando...",
        description: "Actualizando la fecha de visita"
      });
      
      // IMPORTANTE: Primero intentar usar la función RPC
      try {
        // Convertir el ID a número si es necesario
        const tareaIdNum = typeof tarea.id === 'string' ? parseInt(tarea.id, 10) : tarea.id;
        
        
        
        const { data: rpcResult, error: rpcError } = await supabase.rpc('actualizar_fecha_tarea', { 
          tarea_id: tareaIdNum, 
          nueva_fecha: formattedDate 
        });
        
        
        
        if (!rpcError) {
          // La RPC funcionó correctamente
          toast({
            title: "Éxito",
            description: "Fecha de visita actualizada correctamente"
          });
          
          // Actualizar interfaz con la fecha devuelta por la RPC
          const fechaRPC = rpcResult?.nueva_fecha || formattedDate;
          
          
          // Primero actualizamos el estado local para UI inmediata
          setTarea((prevTarea: any) => ({
            ...prevTarea,
            fecha_visita: fechaRPC
          }));
          
          // Esperar brevemente para que la BD actualice el valor
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Recargar datos para asegurar que todo esté sincronizado con la BD
          const { data: tareaActualizada } = await supabase
            .from("tareas")
            .select("*")
            .eq("id", tarea.id)
            .single();
          
          if (tareaActualizada) {
            
            setTarea(tareaActualizada);
          }
          return;
        } else {
          
          
          // La RPC falló, intentar método estándar
          const { error } = await supabase
            .from("tareas")
            .update({ fecha_visita: formattedDate })
            .eq("id", tarea.id);
          
          if (error) {
            throw new Error(`Error al actualizar: ${error.message}`);
          }
          
          // Actualizar interfaz
          setTarea({
            ...tarea,
            fecha_visita: formattedDate
          });
          
          toast({
            title: "Éxito",
            description: "Fecha de visita actualizada"
          });
          
          // Verificar que se haya guardado correctamente
          const { data: verificacion } = await supabase
            .from("tareas")
            .select("fecha_visita")
            .eq("id", tarea.id)
            .single();
          
          if (verificacion && verificacion.fecha_visita !== formattedDate) {
            toast({
              title: "Advertencia",
              description: "Los cambios podrían no haberse guardado correctamente",
              variant: "destructive"
            });
          }
          
          // Recargar datos
          await cargarDatosTarea();
        }
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Error al actualizar la fecha",
          variant: "destructive"
        });
      }
    } catch (err) {
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error al procesar la fecha",
        variant: "destructive"
      });
    }
  };

  // useEffect con dependencias apropiadas para evitar loops infinitos
  // Usamos este enfoque para evitar tener que incluir la función completa como dependencia
  useEffect(() => {
    // Definimos la función de carga dentro del useEffect para evitar dependencias circulares
    const cargarDatos = async () => {
      if (tareaId) {
        await cargarDatosTarea()
      }
    }
    
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareaId]) // Solo se ejecuta cuando cambia tareaId

  // Determinar si el usuario puede ver/crear presupuestos basado en el rol
  const esAdmin = userDetails?.rol === "admin"
  const esSupervisor = userDetails?.rol === "supervisor"
  
  // Verificar si el supervisor actual está asignado a esta tarea
  // La estructura correcta del objeto supervisor incluye usuarios con id
  const esSupervisorDeTarea = esSupervisor && 
                             supervisor && 
                             supervisor.usuarios && 
                             userDetails && 
                             supervisor.usuarios.id === userDetails.id

  // Renderizar estados de carga y error
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <Loader2 className="h-12 w-12 text-primary mb-4 animate-spin" />
        <h1 className="text-2xl font-bold mb-4">Cargando tarea</h1>
        <p className="text-muted-foreground mb-6 text-center">
          Espera un momento mientras cargamos la información...
        </p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-muted-foreground mb-6 text-center">{error}</p>
        <Button asChild>
          <Link href="/dashboard/tareas">Volver a tareas</Link>
        </Button>
      </div>
    )
  }
  
  if (!tarea) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <h1 className="text-2xl font-bold mb-4">Tarea no encontrada</h1>
        <p className="text-muted-foreground mb-6">La tarea que estás buscando no existe o ha sido eliminada.</p>
        <Button asChild>
          <Link href="/dashboard/tareas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la lista de tareas
          </Link>
        </Button>
      </div>
    )
  }
  
  // Renderizar el contenido de la tarea
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/tareas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start justify-between space-y-3 sm:space-y-0">
            <div>
              <CardTitle className="text-2xl">{tarea.titulo}</CardTitle>
              <CardDescription className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline">
                  ID: {tarea.id}
                </Badge>
                <PrioridadInteractiva
                  tareaId={tarea.id}
                  prioridadActual={prioridadActual as "baja" | "media" | "alta" | "urgente"}
                  onPrioridadChange={(nuevaPrioridad) => {
                    
                    setPrioridadActual(nuevaPrioridad);
                    // Aquí se implementaría la actualización en el servidor en una versión completa
                  }}
                />
                {tarea.edificios && (
                  <>
                    <Badge variant="secondary">
                      {tarea.edificios.nombre}
                    </Badge>
                    {tarea.edificios.cuit && (
                      <Badge variant="outline" className="ml-2">
                        {tarea.edificios.cuit}
                      </Badge>
                    )}
                  </>
                )}
                
                {/* Mostrar solo si la tarea está finalizada */}
                {esTareaFinalizada && (
                  <Badge variant="outline" className="bg-gray-200">
                    Finalizada
                  </Badge>
                )}
              </CardDescription>
            </div>

            {(esAdmin || esSupervisorDeTarea) && (
              <EstadoInteractivo
                tipoEntidad="tarea"
                entidadId={tarea.id}
                estadoActualId={estadoActualId}
                esFinalizada={esTareaFinalizada}
                onEstadoChange={(nuevoEstadoId, finalizada) => {
                  setEstadoActualId(nuevoEstadoId);
                  setEsTareaFinalizada(finalizada);
                  
                }}
                className="mt-2 sm:mt-0"
              />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Descripción</h3>
            <p className="whitespace-pre-line">{tarea.descripcion}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium mb-1">Edificio</h3>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                <Link
                  href={`/dashboard/edificios/${tarea.edificios?.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {tarea.edificios?.nombre || 'No especificado'} - {tarea.edificios?.direccion || 'Sin dirección'}
                </Link>
              </div>
            </div>
{/* Sección de departamentos */}
<div>
  <h3 className="font-medium mb-1">Departamentos</h3>
  <DepartamentosInteractivos 
    tareaId={tarea.id} 
    edificioId={tarea.id_edificio}
    onDepartamentosChange={(departamentos) => {
      
    }}
  />
</div>
            <div>
              <h3 className="font-medium mb-1">Fecha de visita</h3>
              <div className="flex items-center mb-2">
                <DatePickerVisual
                  date={tarea.fecha_visita ? new Date(tarea.fecha_visita) : null}
                  onDateChange={onDateChange}
                  disabled={false} // Permitir que todos los roles puedan modificar la fecha de visita
                />
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-1">Supervisor</h3>
              {/* Solo admin puede modificar el supervisor, los demás solo pueden ver */}
              {esAdmin ? (
                <SupervisorInteractivo
                  tareaId={tarea.id}
                  supervisorActual={supervisor?.usuarios || null}
                  supervisoresDisponibles={supervisoresDisponibles}
                  userDetailsId={userDetails?.id}
                  onSupervisorChange={async (emailSupervisor) => {
                  // Ahora recibimos el email del supervisor en lugar del ID
                  
                  try {
                    // Crear cliente Supabase
                    const supabase = createClient();
                    
                    // Intentar obtener la sesión actual
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) {
                      toast({
                        title: "Error",
                        description: "No hay sesión activa. Por favor inicia sesión nuevamente.",
                        variant: "destructive",
                      });
                      router.push('/login');
                      return;
                    }
                    
                    // Aseguramos que el tipo sea número
                    const tareaIdNum = typeof tarea.id === 'string' ? parseInt(tarea.id, 10) : tarea.id;
                    
                    // Si no se proporciona un nuevo supervisor, lo establecemos a null
                    if (emailSupervisor === null) {
                      // Eliminar registros en la tabla relacional supervisores_tareas
                      const { error: errorRelacion } = await supabase
                        .from('supervisores_tareas')
                        .delete()
                        .eq('id_tarea', tareaIdNum);
                        
                      if (errorRelacion) {
                        throw errorRelacion;
                      }
                      
                      setSupervisor(null);
                      toast({
                        title: "Supervisor eliminado",
                        description: "Se ha eliminado el supervisor de la tarea",
                      });
                    }
                      
                    // Si hay un nuevo supervisor, lo asignamos
                    if (emailSupervisor !== null && emailSupervisor !== undefined) {
                      try {
                        // Buscar el supervisor por email
                        const supervisorSeleccionado = supervisoresDisponibles.find(
                          sup => sup.email === emailSupervisor
                        );
                        
                        if (!supervisorSeleccionado) {
                          throw new Error(`No se encontró supervisor con email ${emailSupervisor}`);
                        }
                        
                        
                        
                        // Asegurar que tenemos un ID válido para la tarea
                        const tareaIdNum = typeof tarea.id === 'string' ? parseInt(tarea.id, 10) : tarea.id;
                        const supervisorIdNum = supervisorSeleccionado.id; 
                        
                        if (isNaN(tareaIdNum)) {
                          throw new Error(`ID de tarea no válido: ${tarea.id}`);
                        }
                        
                        // Ya no actualizamos la columna id_supervisor en la tabla tareas
                        // Solo trabajamos con la tabla relacional
                        
                        // 2. Primero eliminar cualquier registro existente
                        const { error: errorDelete } = await supabase
                          .from('supervisores_tareas')
                          .delete()
                          .eq('id_tarea', tareaIdNum);
                          
                        if (errorDelete) {
                          throw errorDelete;
                        }
                        
                        // 3. Insertar nuevo registro en la tabla relacional supervisores_tareas
                        const { error: errorInsert } = await supabase
                          .from('supervisores_tareas')
                          .insert({ 
                            id_tarea: tareaIdNum, 
                            id_supervisor: supervisorIdNum 
                          });
                          
                        if (errorInsert) {
                          throw errorInsert;
                        }
                        
                        // Actualizar el supervisor inmediatamente con el nuevo formato
                        setSupervisor({
                          usuarios: supervisorSeleccionado
                        });
                        
                        toast({
                          title: "Supervisor asignado",
                          description: `Supervisor ${supervisorSeleccionado.email} asignado correctamente a la tarea.`,
                        });
                      } catch (error: any) {
                        
                        toast({
                          title: "Error al cambiar supervisor",
                          description: `No se pudo actualizar el supervisor: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                          variant: "destructive",
                        });
                      }
                    }
                    
                    // Nota: Ya no necesitamos este código porque actualizamos el supervisor
                    // inmediatamente después de la inserción exitosa o de la eliminación
                    
                  } catch (error) {
                    
                    toast({
                      title: "Error",
                      description: "No se pudo actualizar el supervisor",
                      variant: "destructive",
                    });
                  }
                }}
              />
              ) : (
                /* Para trabajadores, solo mostrar el supervisor sin capacidad de cambiarlo */
                <div className="flex items-center mt-1">
                  {supervisor?.usuarios ? (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <UserRound className="h-3 w-3" />
                      {supervisor.usuarios.email}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">Sin supervisor asignado</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-1">Trabajadores asignados</h3>
              {/* Solo admin y supervisor pueden modificar trabajadores */}
              {(esAdmin || esSupervisor) ? (
                <TrabajadoresInteractivos
                  tareaId={tarea.id}
                  trabajadoresAsignados={
                  trabajadoresAsignados
                    .filter(t => t.usuarios) // Filtrar entradas sin datos de usuario
                    .map(t => ({
                      id: t.usuarios.id,
                      email: t.usuarios.email,
                      color_perfil: t.usuarios.color_perfil
                    }))
                }
                trabajadoresDisponibles={trabajadoresDisponibles}
                onTrabajadorAdd={async (nuevoTrabajadorId) => {
                  // Encontrar el trabajador en la lista de disponibles
                  const trabajadorEncontrado = trabajadoresDisponibles.find(t => t.id === nuevoTrabajadorId);
                    
                  if (trabajadorEncontrado) {
                    // Verificar si el trabajador ya está asignado para evitar duplicados
                    const yaAsignado = trabajadoresAsignados.some(t => t.usuarios?.id === nuevoTrabajadorId);
                    
                    if (yaAsignado) {
                      toast({
                        title: "Trabajador ya asignado",
                        description: `${trabajadorEncontrado.email} ya está asignado a esta tarea`,
                        variant: "warning"
                      });
                      return;
                    }
                    
                    // Mostrar estado de carga
                    setIsLoading(true);
                    
                    // Crear una referencia a Supabase para usar en operaciones asíncronas
                    const supabase = createClient();
                    
                    try {
                      // Validar que el ID de la tarea sea un número válido
                      const tareaIdNum = typeof tareaId === 'string' ? parseInt(tareaId, 10) : tareaId;
                      
                      if (isNaN(tareaIdNum)) {
                        throw new Error(`ID de tarea inválido: ${tareaId}`);
                      }
                      
                      // Guardar en la base de datos
                      const { error } = await supabase
                        .from("trabajadores_tareas")
                        .insert({
                          id_tarea: tareaIdNum,
                          id_trabajador: nuevoTrabajadorId
                        });
                        
                      if (error) {
                        toast({
                          title: "Error al asignar trabajador",
                          description: error.message,
                          variant: "destructive"
                        });
                      } else {
                        // Éxito: actualizar la UI y mostrar notificación
                        toast({
                          title: "Trabajador agregado",
                          description: `Se ha asignado a ${trabajadorEncontrado?.email} a esta tarea`
                        });
                        
                        // Crear un nuevo objeto con el formato esperado por el componente
                        const nuevoTrabajadorAsignado = {
                          usuarios: {
                            id: trabajadorEncontrado.id,
                            email: trabajadorEncontrado.email,
                            color_perfil: trabajadorEncontrado.color_perfil
                          }
                        };
                        
                        // Actualizar la lista de trabajadores asignados en el estado local
                        setTrabajadoresAsignados([...trabajadoresAsignados, nuevoTrabajadorAsignado]);
                        
                        
                      }
                    } catch (error) {
                      
                      toast({
                        title: "Error inesperado",
                        description: `No se pudo completar la asignación: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                        variant: "destructive"
                      });
                    } finally {
                      setIsLoading(false);
                    }
                  } else {
                    
                    toast({
                      title: "Error",
                      description: "No se encontró el trabajador seleccionado",
                      variant: "destructive"
                    });
                  }
                }}
                onTrabajadorRemove={async (trabajadorId) => {
                  
                  setIsLoading(true);
                  
                  // Crear una referencia a Supabase para usar en operaciones asíncronas
                  const supabase = createClient();
                  
                  // Obtener el trabajador que estamos eliminando para mostrarlo en la notificación
                  const trabajadorAEliminar = trabajadoresAsignados.find(t => t.usuarios?.id === trabajadorId);
                  
                  try {
                    // Eliminar de la base de datos utilizando async/await para mayor consistencia y claridad
                    const { error } = await supabase
                      .from("trabajadores_tareas")
                      .delete()
                      .eq("id_tarea", tareaId)
                      .eq("id_trabajador", trabajadorId);
                    
                    if (error) {
                      toast({
                        title: "Error al eliminar trabajador",
                        description: error.message,
                        variant: "destructive"
                      });
                    } else {
                      // Filtrar el trabajador de la lista de asignados
                      const nuevosAsignados = trabajadoresAsignados.filter(
                        t => t.usuarios?.id !== trabajadorId
                      );
                      
                      // Actualizar estado inmediatamente
                      setTrabajadoresAsignados(nuevosAsignados);
                      
                      toast({
                        title: "Trabajador eliminado",
                        description: `Se ha eliminado a ${trabajadorAEliminar?.usuarios?.email} de esta tarea`
                      });
                      
                      
                    }
                  } catch (error) {
                    
                    toast({
                      title: "Error inesperado",
                      description: "No se pudo eliminar al trabajador de la tarea",
                      variant: "destructive"
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }}  
              />
              ) : (
                /* Para trabajadores, solo mostrar la lista sin capacidad de modificar */
                <div className="flex flex-wrap gap-2 mt-1">
                  {trabajadoresAsignados.length > 0 ? (
                    trabajadoresAsignados
                      .filter(t => t.usuarios)
                      .map((t) => (
                        <Badge key={t.usuarios.id} variant="secondary" className="flex items-center gap-1">
                          <UserRound className="h-3 w-3" />
                          {t.usuarios.email}
                        </Badge>
                      ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Sin trabajadores asignados</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {(userDetails?.rol === "admin" || userDetails?.rol === "supervisor") && (
            <>
              <Separator />
              
              <PresupuestosInteractivos
                tareaId={tarea.id}
                userId={userDetails?.id} // userId ya estaba siendo esperado por el componente hijo
                id_administrador_tarea={tarea?.id_administrador}
                id_edificio_tarea={tarea?.id_edificio}
                presupuestoBase={presupuestoBase}
                presupuestoFinal={presupuestoFinal}
                userRol={userDetails?.rol || "trabajador"}
                onPresupuestoChange={() => {
                  // Recargar presupuestos cuando se produzcan cambios
                  // Utilizamos la función cargarDatosTarea que ya existe y funciona
                  cargarDatosTarea()
                }}
              />
            </>
          )}





          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Gastos y Comprobantes</h3>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <ErrorBoundary fallback={<p>Error al cargar el componente de procesamiento de imágenes</p>}>
                <ProcesadorImagen 
                  tareaId={Number(tarea.id)} 
                  tareaCodigo={tarea.codigo} 
                  tareaTitulo={tarea.titulo} 
                />
              </ErrorBoundary>

              {/* Sección para Registrar Parte de Trabajo */}
              {userDetails && !esTareaFinalizada && (
                <div className="py-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                    <h3 className="text-lg font-semibold flex items-center mb-2 md:mb-0">
                      <CalendarDays className="mr-2 h-5 w-5 text-primary" /> 
                      Registro de Partes de Trabajo
                    </h3>
                    {!mostrarFormularioParte && (
                      <Button onClick={() => setMostrarFormularioParte(true)} className="w-full sm:w-auto">
                        <UserPlus className="mr-2 h-4 w-4" /> Registrar Nuevo Parte
                      </Button>
                    )}
                  </div>

                  {userDetails?.rol === 'trabajador' && (
                    <div className="mb-4">
                      <SemanasLiquidadasIndicador trabajadorId={userDetails.id} />
                    </div>
                  )}

                  {!mostrarFormularioParte ? (
                    <div className="text-center p-6 border border-dashed rounded-md bg-muted/30">
                      <p className="text-muted-foreground">Pulsa "Registrar Nuevo Parte" para añadir jornadas trabajadas</p>
                    </div>
                  ) : (
                    <Card className="border shadow-md">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg">Registro Visual de Partes</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setMostrarFormularioParte(false)} aria-label="Cerrar formulario">
                          <X className="h-5 w-5" />
                        </Button>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <RegistroParteTrabajoForm
                          tareaIdInicial={tareaId}
                          usuarioActual={userDetails}
                          trabajadorIdInicial={(esAdmin || esSupervisorDeTarea) && (trabajadoresAsignados?.filter(t => t.usuarios)?.length === 1) ? trabajadoresAsignados[0]?.usuarios?.id : null}
                          onParteRegistrado={() => {
                            setMostrarFormularioParte(false);
                            toast({ title: 'Parte Registrado', description: 'El parte de trabajo ha sido registrado con éxito.' });
                          }}
                          fechaInicial={new Date()} // Pre-fill with today's date
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <Separator className="my-6" />  
              <ErrorBoundary fallback={<p>Error al cargar el historial de gastos</p>}>
                <HistorialGastosOCR 
                  tareaId={Number(tarea.id)} 
                  userRole={userDetails?.rol || 'trabajador'}
                  userId={userDetails?.id}
                />
              </ErrorBoundary>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Comentarios</h3>
            <ErrorBoundary fallback={<p>Error al cargar los comentarios</p>}>
              <CommentList comments={comentarios} />
              <CommentForm idTarea={tarea.id} onComentarioCreado={() => cargarDatosTarea()} />
            </ErrorBoundary>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
