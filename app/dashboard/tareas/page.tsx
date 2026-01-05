"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { TaskList } from "@/components/task-list"
import Link from "next/link"
import { Plus, Loader2, Search, Filter, Calendar, X, ArrowLeft, Check, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

export default function TareasPage() {
  const [tareas, setTareas] = useState<any[]>([])
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [presupuestosBase, setPresupuestosBase] = useState<Record<string, any>>({})
  const [tareasConPresupuestoFinal, setTareasConPresupuestoFinal] = useState<string[]>([])
  const [recordatorios, setRecordatorios] = useState<any[]>([])
  const [loadingRecordatorios, setLoadingRecordatorios] = useState<boolean>(false)
  const [selectedTareaId, setSelectedTareaId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const crearPresupuesto = searchParams.get('crear_presupuesto') === 'true'
  
  // Estado para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<{[key: string]: any}>({})
  
  // Estado para datos de los filtros
  const [administradores, setAdministradores] = useState<{id: string, nombre: string}[]>([])
  const [edificios, setEdificios] = useState<{id: string, nombre: string}[]>([]) 
  const [todosLosEdificios, setTodosLosEdificios] = useState<{id: string, nombre: string, id_administrador: string}[]>([]) 
  const [supervisores, setSupervisores] = useState<{id: string, email: string}[]>([])
  const [supervisoresMap, setSupervisoresMap] = useState<Record<string, { nombre?: string; color_perfil?: string }>>({})
  
  // Edificios filtrados según el administrador seleccionado
  const edificiosFiltrados = activeFilters.administrador
    ? todosLosEdificios.filter(edificio => edificio.id_administrador === activeFilters.administrador)
    : todosLosEdificios
  
  // Estados normalizados para las tareas
  const estadosTarea = [
    { id: 1, nombre: "Organizar", color: "gray", codigo: "organizar", descripcion: "Tarea en fase inicial de organización", orden: 1 },
    { id: 2, nombre: "Preguntar", color: "blue", codigo: "preguntar", descripcion: "Tarea en fase de consulta o investigación", orden: 2 },
    { id: 3, nombre: "Presupuestado", color: "purple", codigo: "presupuestado", descripcion: "Tarea con presupuesto creado", orden: 3 },
    { id: 4, nombre: "Enviado", color: "indigo", codigo: "enviado", descripcion: "Presupuesto enviado al cliente", orden: 4 },
    { id: 5, nombre: "Aprobado", color: "green", codigo: "aprobado", descripcion: "Presupuesto aprobado por el cliente", orden: 5 },
    { id: 6, nombre: "Facturado", color: "orange", codigo: "facturado", descripcion: "Tarea facturada", orden: 6 },
    { id: 7, nombre: "Terminado", color: "green", codigo: "terminado", descripcion: "Tarea completada", orden: 7 },
    { id: 8, nombre: "Reclamado", color: "red", codigo: "reclamado", descripcion: "Tarea con reclamo del cliente", orden: 8 },
    { id: 9, nombre: "Liquidada", color: "purple", codigo: "liquidada", descripcion: "Tarea completada y liquidada financieramente", orden: 9 },
    { id: 10, nombre: "Posible", color: "yellow", codigo: "posible", descripcion: "Son posibles trabajos a futuro", orden: 10 }
  ]
  
  // Obtener el número de tareas por cada estado normalizado
  const contadorTareasPorEstado: Record<number, number> = {}
  estadosTarea.forEach(estado => {
    contadorTareasPorEstado[estado.id] = tareas?.filter((tarea) => tarea.id_estado_nuevo === estado.id).length || 0
  })
  
  // Filtrar tareas por estado normalizado para las pestañas - creamos un array para cada estado
  const tareasPorEstado: Record<number, any[]> = {}
  estadosTarea.forEach(estado => {
    tareasPorEstado[estado.id] = tareas?.filter((tarea) => tarea.id_estado_nuevo === estado.id) || []
  })
  
  // Función para aplicar filtros y búsqueda a las tareas
  const applyFilters = (tareasInput: any[], excludeFinalized = false) => {
    return tareasInput.filter(tarea => {
      // Excluir tareas finalizadas si se especifica
      if (excludeFinalized && tarea.finalizada === true) {
        return false
      }
      
      // Excluir tareas en estado 'Enviado' (id=4) solo si NO hay filtro de estado activo
      if (excludeFinalized && !activeFilters.estado && tarea.id_estado_nuevo === 4) {
        return false
      }
      
      // Filtro de búsqueda por texto
      if (searchTerm && !(
        tarea.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tarea.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tarea.code?.toLowerCase().includes(searchTerm.toLowerCase())
      )) {
        return false
      }
      
      // Filtro por administrador
      if (activeFilters.administrador && tarea.id_administrador?.toString() !== activeFilters.administrador?.toString()) {
        return false
      }
      
      // Filtro por edificio
      if (activeFilters.edificio && tarea.id_edificio?.toString() !== activeFilters.edificio?.toString()) {
        return false
      }
      
      // Filtro por estado normalizado
      if (activeFilters.estado && tarea.id_estado_nuevo !== parseInt(activeFilters.estado)) {
        return false
      }
      
      if (activeFilters.supervisorEmail) {
        const emailsField = (tarea as any).supervisores_emails
        let emails: string[] = []
        if (Array.isArray(emailsField)) {
          emails = emailsField
        } else if (typeof emailsField === 'string') {
          emails = emailsField.split(/[,;\s]+/).map((s: string) => s.trim()).filter(Boolean)
        }
        if (!emails.includes(activeFilters.supervisorEmail)) {
          return false
        }
      }
      
      return true
    })
  }
  
  // Efecto para limpiar el filtro de edificio cuando cambia el administrador
  useEffect(() => {
    // Si se selecciona un administrador y hay un edificio seleccionado que no pertenece a ese administrador
    if (activeFilters.administrador && activeFilters.edificio) {
      const edificioPertenece = todosLosEdificios.some(
        edificio => edificio.id === activeFilters.edificio && 
                  edificio.id_administrador === activeFilters.administrador
      )
      
      if (!edificioPertenece) {
        // Limpiar la selección de edificio
        setActiveFilters(prev => ({ ...prev, edificio: undefined }))
      }
    }
  }, [activeFilters.administrador, todosLosEdificios])
  
  // Aplicar filtros a todos los conjuntos de tareas
  // En la vista "Todas" excluimos las tareas finalizadas (finalizada = true)
  const tareasFiltradas = applyFilters(tareas || [], true)
  
  // 🆕 Vista de tareas FINALIZADAS (finalizada = true)
  const tareasFinalizadas = applyFilters(
    (tareas || []).filter(t => t.finalizada === true), 
    false // No excluir finalizadas porque ya están filtradas
  )
  
  // Aplicar filtros a las tareas por estado normalizado
  const tareasPorEstadoFiltradas: Record<number, any[]> = {}
  
  // Aplicamos filtros a cada estado
  estadosTarea.forEach(estado => {
    // No excluimos tareas finalizadas en la pestaña "Terminado" (id_estado_nuevo = 7)
    const excludeFinalized = estado.id !== 7
    tareasPorEstadoFiltradas[estado.id] = applyFilters(tareasPorEstado[estado.id] || [], excludeFinalized)
  })

  // Función para obtener la clase de color de fondo según el color del estado
  const getBgColorClass = (color: string) => {
    switch (color) {
      case "gray":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      case "blue":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "purple":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "indigo":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
      case "green":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "orange":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      case "yellow":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "red":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  // Manejar la selección de tarea para crear presupuesto final
  const handleSelectTareaForPresupuesto = (tareaId: string) => {
    setSelectedTareaId(tareaId === selectedTareaId ? null : tareaId)
  }

  // Continuar para crear el presupuesto con la tarea seleccionada
  const continuarCreacionPresupuesto = () => {
    if (!selectedTareaId) return
    
    const presupuestoBase = presupuestosBase[selectedTareaId]
    
    if (presupuestoBase) {
      // Si hay presupuesto base, redireccionar a la página de nuevo presupuesto final con los parámetros
      router.push(`/dashboard/presupuestos/nuevo?tipo=final&id_padre=${presupuestoBase.id}&id_tarea=${selectedTareaId}`)
    } else {
      // Si no hay presupuesto base, redireccionar solo con el id_tarea
      router.push(`/dashboard/presupuestos/nuevo?tipo=final&id_tarea=${selectedTareaId}`)
    }
  }
  
  // Función auxiliar para cargar administradores y edificios
  const cargarReferencias = async (supabase: any) => {
    try {
      // Cargar nombres de administradores
      const { data: adminsData, error: adminsError } = await supabase
        .from('administradores')
        .select('id, nombre')
        .eq('estado', 'activo')
        .order('nombre')
      
      if (adminsError) {
        console.error("Error al cargar administradores:", adminsError)
      } else if (adminsData) {
        setAdministradores(adminsData)
      }
      
      // Cargar nombres de edificios con su relación de administrador
      const { data: edificiosData, error: edificiosError } = await supabase
        .from('vista_edificios_completa')
        .select('id, nombre, id_administrador')
        .order('nombre')
      
      if (edificiosError) {
        console.error("Error al cargar edificios:", edificiosError)
      } else if (edificiosData) {
        setTodosLosEdificios(edificiosData)
        setEdificios(edificiosData)
      }

      const { data: supData, error: supError } = await supabase
        .from('usuarios')
        .select('id, email, nombre, color_perfil')
        .eq('rol', 'supervisor')
        .order('email')
      if (supError) {
        console.error("Error al cargar supervisores:", supError)
      } else if (supData) {
        setSupervisores(supData)
        // Construir mapa email -> { nombre, color }
        const map = supData.reduce((acc: Record<string, { nombre?: string; color_perfil?: string }>, u: any) => {
          const email = (u?.email || '').toLowerCase()
          if (email) acc[email] = { nombre: u?.nombre, color_perfil: u?.color_perfil }
          return acc
        }, {})
        setSupervisoresMap(map)
      }
    } catch (err) {
      console.error("Error al cargar datos de referencia:", err)
    }
  }
  
  useEffect(() => {
    async function cargarTareas() {
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
          console.error("Error al obtener detalles del usuario:", userError)
          setError("Error al obtener detalles del usuario")
          return
        }
        
        setUserDetails(userData)

        // Cargar recordatorios unificados según rol (admin/supervisor)
        try {
          setLoadingRecordatorios(true)
          if (userData?.rol === 'admin') {
            const { data: recAdmin, error: recErrA } = await supabase
              .from('vista_admin_recordatorios_tareas_unificada')
              .select('*')
              .limit(50)
            if (!recErrA && recAdmin) {
              const sorted = [...recAdmin].sort((a: any, b: any) => {
                if ((a.prioridad || 99) !== (b.prioridad || 99)) return (a.prioridad || 99) - (b.prioridad || 99)
                const fa = a.fecha_visita ? new Date(a.fecha_visita).getTime() : Number.MAX_SAFE_INTEGER
                const fb = b.fecha_visita ? new Date(b.fecha_visita).getTime() : Number.MAX_SAFE_INTEGER
                if (fa !== fb) return fa - fb
                const ca = a.created_at ? new Date(a.created_at).getTime() : 0
                const cb = b.created_at ? new Date(b.created_at).getTime() : 0
                return ca - cb
              })
              setRecordatorios(sorted)
            }
          } else if (userData?.rol === 'supervisor') {
            const { data: recSup, error: recErrS } = await supabase
              .from('vista_sup_recordatorios_tareas_unificada')
              .select('*')
              .limit(50)
            if (!recErrS && recSup) {
              const sorted = [...recSup].sort((a: any, b: any) => {
                if ((a.prioridad || 99) !== (b.prioridad || 99)) return (a.prioridad || 99) - (b.prioridad || 99)
                const fa = a.fecha_visita ? new Date(a.fecha_visita).getTime() : Number.MAX_SAFE_INTEGER
                const fb = b.fecha_visita ? new Date(b.fecha_visita).getTime() : Number.MAX_SAFE_INTEGER
                if (fa !== fb) return fa - fb
                const ca = a.created_at ? new Date(a.created_at).getTime() : 0
                const cb = b.created_at ? new Date(b.created_at).getTime() : 0
                return ca - cb
              })
              setRecordatorios(sorted)
            }
          }
        } finally {
          setLoadingRecordatorios(false)
        }
        
        // Si estamos en modo de creación de presupuesto y el usuario es admin
        // cargar también los presupuestos base y finales asociados a las tareas
        if (crearPresupuesto && userData?.rol === "admin") {
          // Cargar presupuestos base
          const { data: presupuestosBaseData, error: presupuestosError } = await supabase
            .from("presupuestos_base")
            .select("*")
          
          if (!presupuestosError && presupuestosBaseData) {
            // Organizar presupuestos base por id_tarea para fácil acceso
            const presupuestosMap: Record<string, any> = {}
            presupuestosBaseData.forEach((presupuesto: any) => {
              if (presupuesto.id_tarea) {
                presupuestosMap[presupuesto.id_tarea] = presupuesto
              }
            })
            
            setPresupuestosBase(presupuestosMap)
          }
          
          // Cargar presupuestos finales para saber qué tareas ya tienen presupuesto final
          // Usamos una consulta más precisa que no devuelva nulls y agrupe por id_tarea
          const { data: presupuestosFinalesData, error: presupuestosFinalesError } = await supabase
            .from("presupuestos_finales")
            .select("id_tarea")
            .not("id_tarea", "is", null)
            
          if (!presupuestosFinalesError && presupuestosFinalesData) {
            // Extraer IDs de tareas que ya tienen presupuesto final
            const tareasIds = presupuestosFinalesData
              .map((p: any) => p.id_tarea.toString()) // Convertir a string para comparación consistente
            
            console.log("Tareas que ya tienen presupuesto final:", tareasIds)
            setTareasConPresupuestoFinal(tareasIds)
          }
        }
        
        let tareasResponse;

        if (crearPresupuesto) {
          console.log("Modo Crear Presupuesto: Llamando a la función RPC 'get_tareas_sin_presupuesto_final'");
          tareasResponse = await supabase.rpc('get_tareas_sin_presupuesto_final');
        } else {
          // Construir la consulta de tareas según el rol del usuario usando la vista optimizada
          const baseQuery = supabase
            .from("vista_tareas_completa")
            .select(`*`)
            .order("created_at", { ascending: false });

          // Aplicar filtros según el rol
          let tareasQuery;
          if (userData?.rol?.toLowerCase().trim() === "trabajador") {
            const trabajadorTareasResponse = await supabase
              .from('trabajadores_tareas')
              .select('id_tarea')
              .eq('id_trabajador', session.user.id);
            const tareasAsignadas = trabajadorTareasResponse.data?.map((t: any) => t.id_tarea) || [];
            if (tareasAsignadas.length > 0) {
              tareasQuery = baseQuery.in("id", tareasAsignadas);
            } else {
              tareasQuery = baseQuery.eq("id", -1);
            }
          } else if (userData?.rol?.toLowerCase().trim() === "supervisor") {
            const supervisorTareasResponse = await supabase
              .from('supervisores_tareas')
              .select('id_tarea')
              .eq('id_supervisor', session.user.id);
            const tareasAsignadas = supervisorTareasResponse.data?.map((t: any) => t.id_tarea) || [];
            if (tareasAsignadas.length > 0) {
              tareasQuery = baseQuery.in("id", tareasAsignadas);
            } else {
              tareasQuery = baseQuery.eq("id", -1);
            }
          } else {
            tareasQuery = baseQuery;
          }
          tareasResponse = await tareasQuery;
        }
        const tareasData = tareasResponse.data
        const tareasError = tareasResponse.error
        
        if (tareasError) {
          console.error("Error al cargar tareas:", tareasError)
          setError("Error al cargar tareas")
          return
        }
        
        setTareas(tareasData || [])
        
        // Cargar datos para los filtros
        await cargarReferencias(supabase)
      } catch (err) {
        console.error("Error inesperado:", err)
        setError("Ocurrió un error inesperado")
      } finally {
        setLoading(false)
      }
    }
    
    cargarTareas()
  }, [router])

  // Estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
          <p className="text-lg text-gray-500">Cargando {crearPresupuesto ? "tareas para presupuesto" : "tareas"}...</p>
        </div>
      </div>
    )
  }
  
  // Estado de error
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-red-800">Error</h2>
        <p className="mt-2 text-red-700">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    )
  }

  // Modo de creación de presupuesto final
  if (crearPresupuesto) {
    // Debug: Mostrar los IDs con los que estamos comparando
    console.log("Tareas disponibles (todas):", tareas.map(t => ({ id: t.id, estado: t.estado })))
    console.log("IDs de tareas con presupuesto final:", tareasConPresupuestoFinal)
    
    // La función RPC ya nos devuelve solo las tareas disponibles, no se necesita más filtrado aquí.
    const tareasDisponibles = tareas;

    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-2"
            onClick={() => router.push("/dashboard/presupuestos")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Presupuestos
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Seleccionar Tarea para Presupuesto Final</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Seleccione una tarea para crear un presupuesto final</CardTitle>
            <CardDescription>
              Solo se muestran tareas pendientes o asignadas que no tienen presupuesto final.
              Si la tarea tiene un presupuesto base asociado, se mostrará como referencia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar tareas..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {tareasDisponibles.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">
                  No hay tareas pendientes o asignadas sin presupuesto final.
                </p>
                <p className="text-sm mt-2">
                  Todas las tareas activas ya tienen presupuestos finales asociados.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/presupuestos-base">
                    Ver Presupuestos Base
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tareasDisponibles.map((tarea) => {
                  const presupuesto = presupuestosBase[tarea.id]
                  const isSelected = selectedTareaId === tarea.id
                  const tienePresupuestoBase = !!presupuesto
                  
                  return (
                    <div 
                      key={tarea.id}
                      className={`border rounded-lg p-4 transition-all ${isSelected ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary cursor-pointer"}`}
                      onClick={() => handleSelectTareaForPresupuesto(tarea.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{tarea.titulo}</h3>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {tarea.estado_nombre ? tarea.estado_nombre.charAt(0).toUpperCase() + tarea.estado_nombre.slice(1) : 'Sin estado'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Código: {tarea.code} | Edificio: {tarea.edificio_nombre || "Sin edificio"}
                          </p>
                          <p className="text-sm mt-1 line-clamp-2">{tarea.descripcion}</p>
                        </div>
                        
                        {isSelected && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      
                      {/* Mostrar información del presupuesto base si existe */}
                      {tienePresupuestoBase ? (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <h4 className="text-sm font-medium mb-2">Presupuesto Base:</h4>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground">Materiales</p>
                              <p className="font-medium">{formatCurrency(presupuesto.materiales || 0)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Mano de obra</p>
                              <p className="font-medium">{formatCurrency(presupuesto.mano_obra || 0)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total</p>
                              <p className="font-medium">{formatCurrency(presupuesto.total || 0)}</p>
                            </div>
                          </div>
                          {presupuesto.nota_pb && (
                            <div className="mt-2">
                              <p className="text-muted-foreground text-xs">Descripción:</p>
                              <p className="text-sm">{presupuesto.nota_pb}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-sm text-amber-600">
                            Esta tarea no tiene presupuesto base asociado. Se creará un presupuesto final directo.
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.push("/dashboard/presupuestos")}>
              Cancelar
            </Button>
            <Button 
              onClick={continuarCreacionPresupuesto}
              disabled={!selectedTareaId}
            >
              Continuar a Nuevo Presupuesto
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Interfaz normal de tareas
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tareas</h2>
          <p className="text-muted-foreground">Gestiona las tareas del sistema</p>
        </div>
        {(userDetails?.rol === "admin" || userDetails?.rol === "supervisor") && (
          <Button asChild>
            <Link href="/dashboard/tareas/nueva">
              <Plus className="mr-2 h-4 w-4" /> Nueva Tarea
            </Link>
          </Button>
        )}
      </div>

      {(userDetails?.rol === 'admin' || userDetails?.rol === 'supervisor') && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recordatorios de Tareas</CardTitle>
            <CardDescription>Lista priorizada de tareas sin Presupuesto Base</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingRecordatorios ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando recordatorios...</div>
            ) : (recordatorios?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground">No hay recordatorios pendientes.</div>
            ) : (
              <div className="space-y-2">
                {recordatorios.slice(0, 10).map((it: any) => {
                  const hoy = new Date()
                  const fvis = it.fecha_visita ? new Date(it.fecha_visita) : null
                  const esHoy = !!fvis && fvis.toDateString() === hoy.toDateString()
                  const chip = it.tipo_recordatorio === 'proxima_visita_sin_pb'
                    ? (esHoy ? 'HOY' : '72h')
                    : it.tipo_recordatorio === 'con_actividad_sin_pb'
                    ? 'Act. 7d'
                    : it.tipo_recordatorio === 'inactiva_sin_pb'
                    ? '14d sin act.'
                    : 'Sin PB'
                  const pri = it.prioridad || 4
                  const priLabel = pri === 1 ? 'Urgente' : pri === 2 ? 'Alta' : pri === 3 ? 'Media' : 'Baja'
                  // Chip de fecha de visita (si existe): HOY / 72h / dd/mm
                  let fechaChip: string | null = null
                  if (fvis) {
                    const diffMs = fvis.getTime() - hoy.setHours(0,0,0,0)
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                    if (diffDays === 0) {
                      fechaChip = 'HOY'
                    } else if (diffDays > 0 && diffDays <= 3) {
                      fechaChip = '72h'
                    } else {
                      const dd = fvis.getDate().toString().padStart(2, '0')
                      const mm = (fvis.getMonth() + 1).toString().padStart(2, '0')
                      fechaChip = `${dd}/${mm}`
                    }
                  }
                  return (
                    <div key={it.id_tarea} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded-md p-3">
                      <div className="min-w-0">
                        <Link href={`/dashboard/tareas/${it.id_tarea}`} className="font-medium text-sm hover:underline truncate block">
                          {it.nombre_tarea || `Tarea #${it.id_tarea}`}
                        </Link>
                        <div className="text-xs text-muted-foreground truncate">
                          {(userDetails?.rol === 'admin' && it.supervisor_label) ? `Supervisor: ${it.supervisor_label}` : ''}
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-0 flex items-center gap-2 flex-wrap shrink-0">
                        <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px]">{chip}</Badge>
                        {fechaChip && (
                          <Badge variant="outline" className="px-1.5 py-0.5 text-[10px]">{fechaChip}</Badge>
                        )}
                        <Badge variant="outline" className="px-1.5 py-0.5 text-[10px]">{priLabel}</Badge>
                        {userDetails?.rol === 'supervisor' ? (
                          <Button asChild size="sm" variant="outline" className="h-8 px-2 text-xs">
                            <Link href="/dashboard/presupuestos-base/nuevo">Crear PB</Link>
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="outline" className="h-8 px-2 text-xs">
                            <Link href={`/dashboard/tareas/${it.id_tarea}`}>Ver tarea</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Barra de búsqueda y filtros */}
      <Card className="my-8 md:mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Búsqueda y Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {/* Barra de búsqueda */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tareas por título, descripción o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
            {searchTerm && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-0 top-0 h-10 w-10" 
                onClick={() => setSearchTerm('')}
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Sección de filtros */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Filtros avanzados</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Filtro por estado */}
              <div className="space-y-2">
                <p className="text-sm">Estado</p>
                <Select
                  value={activeFilters.estado || '_todos_'}
                  onValueChange={(value) => 
                    setActiveFilters(prev => value === '_todos_' ? {...prev, estado: undefined} : {...prev, estado: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_todos_">Todos los estados</SelectItem>
                    {estadosTarea.map(estado => (
                      <SelectItem key={estado.id} value={estado.id.toString()}>
                        {estado.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por administrador */}
              <div className="space-y-2">
                <p className="text-sm">Administrador</p>
                <Select
                  value={activeFilters.administrador || '_todos_'}
                  onValueChange={(value) => 
                    setActiveFilters(prev => value === '_todos_' ? {...prev, administrador: undefined} : {...prev, administrador: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los administradores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_todos_">Todos los administradores</SelectItem>
                    {/* Mostrar los administradores ordenados alfabéticamente */}
                    {administradores
                      .sort((a, b) => a.nombre.localeCompare(b.nombre))
                      .map(admin => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.nombre}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtro por edificio */}
              <div className="space-y-2">
                <p className="text-sm">Edificio</p>
                <Select
                  value={activeFilters.edificio || '_todos_'}
                  onValueChange={(value) => 
                    setActiveFilters(prev => value === '_todos_' ? {...prev, edificio: undefined} : {...prev, edificio: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los edificios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_todos_">Todos los edificios</SelectItem>
                    {/* Mostrar los edificios filtrados por administrador seleccionado */}
                    {edificiosFiltrados
                      .sort((a, b) => a.nombre.localeCompare(b.nombre))
                      .map(edificio => (
                        <SelectItem key={edificio.id} value={edificio.id}>
                          {edificio.nombre}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm">Supervisor</p>
                <Select
                  value={activeFilters.supervisorEmail || '_todos_'}
                  onValueChange={(value) => 
                    setActiveFilters(prev => value === '_todos_' ? {...prev, supervisorEmail: undefined} : {...prev, supervisorEmail: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los supervisores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_todos_">Todos los supervisores</SelectItem>
                    {supervisores
                      .sort((a, b) => a.email.localeCompare(b.email))
                      .map(sup => (
                        <SelectItem key={sup.id} value={sup.email}>
                          {sup.email}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Botón para limpiar filtros */}
            {Object.keys(activeFilters).some(k => activeFilters[k] !== undefined) && (
              <div className="mt-4 flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setActiveFilters({})}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" /> 
                  Limpiar filtros
                </Button>
              </div>
            )}
            
            {/* Mostrar filtros activos */}
            {Object.keys(activeFilters).some(k => activeFilters[k] !== undefined) && (
              <div className="flex flex-wrap gap-2 mt-4 border-t pt-4">
                <p className="text-sm font-medium mr-2">Filtros activos:</p>
                {Object.entries(activeFilters).map(([key, value]) => (
                  value && (
                    <Badge key={key} variant="secondary" className="gap-1">
                      {key === 'administrador' ? 'Administrador:' : key === 'edificio' ? 'Edificio:' : key === 'supervisorEmail' ? 'Supervisor:' : 'Estado:'}
                      {key === 'administrador' 
                        ? administradores.find(a => a.id === value)?.nombre || value
                        : key === 'edificio'
                        ? edificios.find(e => e.id === value)?.nombre || value
                        : key === 'supervisorEmail'
                        ? (value as string)
                        : estadosTarea.find(e => e.id.toString() === value)?.nombre || value}
                      <X 
                        className="h-3 w-3 ml-1 cursor-pointer" 
                        onClick={() => setActiveFilters(prev => ({ ...prev, [key]: undefined }))}
                      />
                    </Badge>
                  )
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs de estados normalizados */}
      <Tabs defaultValue="todas" className="mt-5 pt-2">
        <TabsList className="grid grid-cols-3 md:flex md:flex-row w-full gap-1 md:gap-2 bg-transparent p-0">
          <TabsTrigger 
            value="todas" 
            className="h-9 md:h-auto data-[state=active]:bg-blue-600 data-[state=active]:text-white text-[10px] md:text-sm py-1.5 md:py-2 px-1.5 md:px-2 justify-between flex items-center gap-1"
            title="Todas las tareas"
          >
            <span className="truncate">Todas</span>
            <Badge variant="outline" className="py-0 h-4 md:h-5 text-[9px] md:text-xs px-1 bg-background shrink-0">
              {tareasFiltradas.length}
            </Badge>
          </TabsTrigger>
          
          {/* Pestaña Organizar - gris */}
          <TabsTrigger 
            value="estado-1" 
            className="h-9 md:h-auto data-[state=active]:bg-gray-500 data-[state=active]:text-white text-[10px] md:text-sm py-1.5 md:py-2 px-1.5 md:px-2 justify-between flex items-center gap-1"
            title="Tarea en fase inicial de organización"
          >
            <span className="truncate">Organizar</span>
            <Badge variant="outline" className="py-0 h-4 md:h-5 text-[9px] md:text-xs px-1 bg-background shrink-0">
              {tareasPorEstadoFiltradas[1]?.length || 0}
            </Badge>
          </TabsTrigger>
          
          {/* Pestaña Aprobado - verde */}
          <TabsTrigger 
            value="estado-5" 
            className="h-9 md:h-auto data-[state=active]:bg-green-600 data-[state=active]:text-white text-[10px] md:text-sm py-1.5 md:py-2 px-1.5 md:px-2 justify-between flex items-center gap-1"
            title="Presupuesto aprobado por el cliente"
          >
            <span className="truncate">Aprobado</span>
            <Badge variant="outline" className="py-0 h-4 md:h-5 text-[9px] md:text-xs px-1 bg-background shrink-0">
              {tareasPorEstadoFiltradas[5]?.length || 0}
            </Badge>
          </TabsTrigger>
          
          {/* Pestaña para el estado "Posible" - amarillo */}
          <TabsTrigger 
            value="estado-10" 
            className="h-9 md:h-auto data-[state=active]:bg-yellow-500 data-[state=active]:text-white text-[10px] md:text-sm py-1.5 md:py-2 px-1.5 md:px-2 justify-between flex items-center gap-1"
            title="Son posibles trabajos a futuro"
          >
            <span className="truncate">Posible</span>
            <Badge variant="outline" className="py-0 h-4 md:h-5 text-[9px] md:text-xs px-1 bg-background shrink-0">
              {tareasPorEstadoFiltradas[10]?.length || 0}
            </Badge>
          </TabsTrigger>
          
          {/* 🆕 Pestaña Finalizadas - azul oscuro */}
          <TabsTrigger 
            value="finalizadas" 
            className="h-9 md:h-auto data-[state=active]:bg-slate-700 data-[state=active]:text-white text-[10px] md:text-sm py-1.5 md:py-2 px-1.5 md:px-2 justify-between flex items-center gap-1"
            title="Tareas marcadas como finalizadas"
          >
            <span className="truncate">Finalizadas</span>
            <Badge variant="outline" className="py-0 h-4 md:h-5 text-[9px] md:text-xs px-1 bg-background shrink-0">
              {tareasFinalizadas.length}
            </Badge>
          </TabsTrigger>
        </TabsList>
        
        {/* Contenido para "Todas" las tareas */}
        <TabsContent value="todas" className="mt-8 pt-2">
          <div className="mb-4">
            <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
              Todas las tareas del sistema
            </Badge>
          </div>
          <TaskList tasks={tareasFiltradas} userRole={userDetails?.rol || ""} supervisoresMap={supervisoresMap} />
        </TabsContent>
        
        {/* Contenido para estado "Organizar" */}
        <TabsContent value="estado-1" className="mt-8 pt-2">
          <div className="mb-4">
            <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-200">
              Tareas en estado "Organizar" - Fase inicial de organización
            </Badge>
          </div>
          <TaskList tasks={tareasPorEstadoFiltradas[1] || []} userRole={userDetails?.rol || ""} supervisoresMap={supervisoresMap} />
        </TabsContent>
        
        {/* Contenido para estado "Aprobado" */}
        <TabsContent value="estado-5" className="mt-8 pt-2">
          <div className="mb-4">
            <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
              Tareas en estado "Aprobado" - Presupuesto aprobado por el cliente
            </Badge>
          </div>
          <TaskList tasks={tareasPorEstadoFiltradas[5] || []} userRole={userDetails?.rol || ""} supervisoresMap={supervisoresMap} />
        </TabsContent>
        
        {/* Contenido para estado Posible */}
        <TabsContent value="estado-10" className="mt-8 pt-2">
          <div className="mb-4">
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
              Tareas en estado "Posible" - Son posibles trabajos a futuro
            </Badge>
          </div>
          <TaskList 
            tasks={tareasPorEstadoFiltradas[10] || []} 
            userRole={userDetails?.rol || ""}
            supervisoresMap={supervisoresMap}
          />
        </TabsContent>
        
        {/* 🆕 Contenido para Finalizadas */}
        <TabsContent value="finalizadas" className="mt-8 pt-2">
          <div className="mb-4">
            <Badge variant="outline" className="bg-slate-100 text-slate-800 hover:bg-slate-200">
              Tareas Finalizadas - Trabajos completados y archivados
            </Badge>
          </div>
          <TaskList 
            tasks={tareasFinalizadas} 
            userRole={userDetails?.rol || ""}
            supervisoresMap={supervisoresMap}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
