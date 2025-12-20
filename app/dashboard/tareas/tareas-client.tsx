"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Loader2, Search, X, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TaskList } from '@/components/task-list' // Asumiendo que este componente existe
import { obtenerEstadosTarea, limpiarCacheEstados, EstadoTarea } from '@/lib/estados-service'
import { toast } from '@/components/ui/use-toast'

export default function TareasClient() {
  const supabase = createClient()
  const [tareas, setTareas] = useState<any[]>([])
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<{ [key: string]: any }>({})
  const [administradores, setAdministradores] = useState<{ id: string; nombre: string }[]>([])
  const [todosLosEdificios, setTodosLosEdificios] = useState<{ id: string; nombre: string; id_administrador: string }[]>([])
  const [supervisoresMap, setSupervisoresMap] = useState<Record<string, { nombre?: string; color_perfil?: string }>>({})

  // Estados para las pestañas (se cargarán desde el servicio)
  const [estadosTarea, setEstadosTarea] = useState<EstadoTarea[]>([])
  const [cargandoEstados, setCargandoEstados] = useState(false)
  
  // Cargar estados desde el servicio centralizado
  useEffect(() => {
    const cargarEstados = async () => {
      setCargandoEstados(true);
      try {
        console.log('TareasClient: Solicitando estados de tareas');
        // Forzar carga desde Supabase para asegurarnos de que está actualizado
        const estados = await obtenerEstadosTarea(true);
        
        if (!estados || estados.length === 0) {
          console.warn('TareasClient: No se obtuvieron estados, se usarán valores predeterminados');
          // Si no hay estados, mostrar un mensaje de error pero seguir funcionando
          toast({
            title: "Advertencia",
            description: "No se pudieron cargar los estados de tareas, se usarán valores predeterminados.",
            variant: "default",
          });
        } else {
          console.log('TareasClient: Estados cargados correctamente:', {
            cantidad: estados.length,
            listaEstados: estados.map(e => `${e.id}: ${e.nombre}`)
          });
        }
        
        // Actualizar el estado de la interfaz
        setEstadosTarea(estados);
      } catch (error) {
        console.error("Error al cargar estados en tareas-client:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los estados de tareas. Algunas funciones podrían no estar disponibles.",
          variant: "destructive",
        });
      } finally {
        setCargandoEstados(false);
      }
    };
    
    // Ejecutar la carga de estados al montar el componente
    cargarEstados();
  }, []);
  
  // Función para refrescar estados manualmente
  const refrescarEstados = async () => {
    setCargandoEstados(true);
    try {
      limpiarCacheEstados(); // Limpiar caché
      const estados = await obtenerEstadosTarea(true); // Forzar actualización
      setEstadosTarea(estados);
      
      // Depurar los estados de tareas actuales en las tareas cargadas
      const estadosEnTareas = new Set();
      tareas.forEach(tarea => {
        if (tarea.id_estado_nuevo) estadosEnTareas.add(tarea.id_estado_nuevo);
      });
      console.log("Estados encontrados en tareas:", [...estadosEnTareas]);
      console.log("Estados cargados del servicio:", estados.map(e => e.id));
      
      // Mensaje de éxito
      toast({
        title: "Estados actualizados",
        description: `Se han cargado ${estados.length} estados. Hay ${estadosEnTareas.size} estados diferentes en uso.`,
      });
    } catch (error) {
      console.error("Error al actualizar estados:", error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los estados.",
        variant: "destructive",
      });
    } finally {
      setCargandoEstados(false);
    }
  }
const fetchData = useCallback(async () => {
    if (!supabase) return

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: userDetailsData, error: userDetailsError } = await supabase
        .from('usuarios')
        .select('rol, id_empresa, id_delegacion')
        .eq('id', user.id)
        .maybeSingle()

      if (userDetailsError) throw userDetailsError
      setUserDetails(userDetailsData)

      // Cargar datos para filtros
      const { data: adminData } = await supabase.from('clientes').select('id, nombre').eq('rol', 'administrador')
      setAdministradores(adminData || [])
      
      const { data: edificiosData } = await supabase.from('edificios').select('id, nombre, id_administrador')
      setTodosLosEdificios(edificiosData || [])

      // Cargar supervisores para mapear email → { nombre, color }
      const { data: supervisores } = await supabase
        .from('usuarios')
        .select('email, nombre, color_perfil')
        .eq('rol', 'supervisor')
      if (supervisores && supervisores.length > 0) {
        const map = supervisores.reduce((acc: Record<string, { nombre?: string; color_perfil?: string }>, u: any) => {
          const email = (u?.email || '').toLowerCase()
          const local = email.split('@')[0]
          const display = u?.nombre || local || email
          if (email) acc[email] = { nombre: display, color_perfil: u?.color_perfil }
          return acc
        }, {})
        setSupervisoresMap(map)
      }

      // Construir la consulta de tareas - usamos vista_tareas_completa para tener todos los detalles incluyendo estados
      let query = supabase.from('vista_tareas_completa').select('*')

      if (userDetailsData?.rol === 'supervisor') {
        // Supervisores: ver solo tareas de su delegación y no mostrar liquidadas (id_estado_nuevo = 9)
        query = query
          .eq('id_delegacion', userDetailsData.id_delegacion)
          .neq('id_estado_nuevo', 9)
      }

      const { data: tareasData, error: tareasError } = await query.order('id', { ascending: false })

      if (tareasError) throw tareasError
      
      // Analizar estados presentes en las tareas para depuración
      if (tareasData && tareasData.length > 0) {
        const estadosPresentes = new Map();
        tareasData.forEach(tarea => {
          if (tarea.id_estado_nuevo) {
            if (!estadosPresentes.has(tarea.id_estado_nuevo)) {
              estadosPresentes.set(tarea.id_estado_nuevo, {
                count: 1,
                nombre: tarea.estado_tarea || "Sin nombre de estado",
                ejemploTareaId: tarea.id
              });
            } else {
              const actual = estadosPresentes.get(tarea.id_estado_nuevo);
              estadosPresentes.set(tarea.id_estado_nuevo, {
                ...actual,
                count: actual.count + 1
              });
            }
          }
        });
        
        console.log("Estados de tareas encontrados:", Object.fromEntries(estadosPresentes));
        console.log("Total tareas:", tareasData.length);
        console.log("Ejemplo de tarea con datos:", {
          id: tareasData[0].id,
          descripcion: tareasData[0].descripcion,
          estado_id: tareasData[0].id_estado_nuevo,
          estado_nombre: tareasData[0].estado_tarea
        });
      }
      
      // Guardar las tareas en el estado
      setTareas(tareasData || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    if (supabase) {
      fetchData()
    }
  }, [supabase, fetchData])

  const edificiosFiltrados = activeFilters.administrador
    ? todosLosEdificios.filter(edificio => edificio.id_administrador === activeFilters.administrador)
    : todosLosEdificios

  const applyFilters = (tareasInput: any[]) => {
    return tareasInput.filter(tarea => {
      if (!activeFilters.estado && tarea.id_estado_nuevo === 4) {
        return false
      }
      const searchTermLower = searchTerm.toLowerCase()
      const matchesSearch = searchTermLower === '' ||
        tarea.id.toString().includes(searchTermLower) ||
        tarea.descripcion?.toLowerCase().includes(searchTermLower) ||
        tarea.edificios?.nombre.toLowerCase().includes(searchTermLower)

      const matchesFilters = Object.keys(activeFilters).every(key => {
        const filterValue = activeFilters[key]
        if (!filterValue || filterValue === '_todos_') return true
        if (key === 'administrador') return tarea.edificios?.id_administrador === filterValue
        if (key === 'edificio') return tarea.id_edificio === filterValue
        return true
      })

      return matchesSearch && matchesFilters
    })
  }

  const tareasFiltradas = applyFilters(tareas)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-xl text-red-600 mb-4">Error al cargar las tareas</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchData}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Tareas - Actualizado</h1>
          <p className="text-muted-foreground">Gestiona y visualiza todas las tareas (con nuevos estados).</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={refrescarEstados}
            disabled={cargandoEstados}
            title="Actualizar estados de tareas"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/dashboard/presupuestos/nuevo?tipo=final" passHref>
              <Button variant="outline">Crear Presupuesto Final</Button>
          </Link>
          <Link href="/dashboard/tareas/nueva" passHref>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nueva Tarea
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros y Búsqueda</CardTitle>
          <CardDescription>Afina tu búsqueda para encontrar tareas específicas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              placeholder="Buscar por ID, descripción, edificio..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="lg:col-span-3"
            />
            <Select
              value={activeFilters.administrador || '_todos_'}
              onValueChange={value => setActiveFilters(prev => ({ ...prev, administrador: value === '_todos_' ? undefined : value, edificio: undefined }))}
            >
              <SelectTrigger><SelectValue placeholder="Filtrar por administrador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_todos_">Todos los administradores</SelectItem>
                {administradores.map(admin => <SelectItem key={admin.id} value={admin.id}>{admin.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={activeFilters.edificio || '_todos_'}
              onValueChange={value => setActiveFilters(prev => ({ ...prev, edificio: value === '_todos_' ? undefined : value }))}
              disabled={!activeFilters.administrador}
            >
              <SelectTrigger><SelectValue placeholder="Filtrar por edificio" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_todos_">Todos los edificios</SelectItem>
                {edificiosFiltrados.map(edificio => <SelectItem key={edificio.id} value={edificio.id}>{edificio.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            {Object.keys(activeFilters).length > 0 && (
                <Button variant="outline" onClick={() => {setActiveFilters({}); setSearchTerm('')}} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" /> Limpiar filtros
                </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="todas" className="mt-10">
        <TabsList className="bg-blue-100 p-2 border-2 border-blue-500">
          <TabsTrigger value="todas" className="bg-green-100">🔄 TODAS LAS TAREAS ({tareasFiltradas.length})</TabsTrigger>
          <TabsTrigger value="1" className="bg-yellow-100">🔍 ORGANIZAR ({tareasFiltradas.filter(t => t.id_estado_nuevo === 1).length})</TabsTrigger>
          <TabsTrigger value="5" className="bg-green-100">✓ APROBADO ({tareasFiltradas.filter(t => t.id_estado_nuevo === 5).length})</TabsTrigger>
          
          {/* Nueva pestaña para otros estados (incluye el nuevo estado) */}
          <TabsTrigger value="otros" className="bg-purple-100 font-bold">⚡ NUEVO/OTROS ({tareasFiltradas.filter(t => {
            // Estados que ya tienen pestañas específicas
            const estadosEspecificos = [1, 5];
            // Incluir en "Otros" cualquier estado que no tenga pestaña específica
            return t.id_estado_nuevo && !estadosEspecificos.includes(t.id_estado_nuevo);
          }).length})</TabsTrigger>
        </TabsList>
        
        {/* Contenido para todas las tareas */}
        <TabsContent value="todas" className="mt-4">
          <TaskList tasks={tareasFiltradas} userRole={userDetails?.rol || ''} supervisoresMap={supervisoresMap} />
        </TabsContent>
        
        {/* Contenido para tareas en Organizar */}
        <TabsContent value="1" className="mt-4">
          <TaskList tasks={tareasFiltradas.filter(t => t.id_estado_nuevo === 1)} userRole={userDetails?.rol || ''} supervisoresMap={supervisoresMap} />
        </TabsContent>
        
        {/* Contenido para tareas Aprobadas */}
        <TabsContent value="5" className="mt-4">
          <TaskList tasks={tareasFiltradas.filter(t => t.id_estado_nuevo === 5)} userRole={userDetails?.rol || ''} supervisoresMap={supervisoresMap} />
        </TabsContent>
        
        {/* Contenido para otros estados (incluye el nuevo estado) */}
        <TabsContent value="otros" className="mt-4">
          <TaskList tasks={tareasFiltradas.filter(t => {
            // Estados que ya tienen pestañas específicas
            const estadosEspecificos = [1, 5];
            // Incluir en "Otros" cualquier estado que no tenga pestaña específica
            return t.id_estado_nuevo && !estadosEspecificos.includes(t.id_estado_nuevo);
          })} userRole={userDetails?.rol || ''} supervisoresMap={supervisoresMap} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

