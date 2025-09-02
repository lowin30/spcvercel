"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { SupabaseClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Loader2, Search, X, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TaskList } from '@/components/task-list' // Asumiendo que este componente existe

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

  // Estados normalizados para las pestañas
  const estadosTarea = [
    { id: 1, nombre: "Organizar", color: "gray" },
    { id: 2, nombre: "Preguntar", color: "blue" },
    { id: 3, nombre: "Presupuestado", color: "purple" },
    { id: 4, nombre: "Enviado", color: "indigo" },
    { id: 5, nombre: "Aprobado", color: "green" },
    { id: 6, nombre: "Facturado", color: "orange" },
    { id: 7, nombre: "Terminado", color: "green" },
    { id: 8, nombre: "Reclamado", color: "red" },
    { id: 9, nombre: "Liquidada", color: "purple" }
  ]

  useEffect(() => {
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

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

      // Construir la consulta de tareas
      let query = supabase.from('tareas').select(`
        id, descripcion, id_edificio, id_estado_nuevo, created_at, importe_presupuestado, finalizada,
        edificios (nombre, id_administrador, clientes(nombre))
      `)

      if (userDetailsData.rol === 'supervisor') {
        query = query.eq('id_delegacion', userDetailsData.id_delegacion)
      }

      const { data: tareasData, error: tareasError } = await query.order('id', { ascending: false })

      if (tareasError) throw tareasError
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
          <h1 className="text-3xl font-bold">Tareas</h1>
          <p className="text-muted-foreground">Gestiona y visualiza todas las tareas.</p>
        </div>
        <div className="flex items-center gap-2">
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
        <TabsList>
          <TabsTrigger value="todas">Todas ({tareasFiltradas.length})</TabsTrigger>
          {estadosTarea.map(estado => {
            const count = tareasFiltradas.filter(t => t.id_estado_nuevo === estado.id).length
            return <TabsTrigger key={estado.id} value={estado.id.toString()}>{estado.nombre} ({count})</TabsTrigger>
          })}
        </TabsList>
        <TabsContent value="todas" className="mt-4">
          <TaskList tasks={tareasFiltradas} userRole={userDetails?.rol || ''} />
        </TabsContent>
        {estadosTarea.map(estado => (
          <TabsContent key={estado.id} value={estado.id.toString()} className="mt-4">
            <TaskList tasks={tareasFiltradas.filter(t => t.id_estado_nuevo === estado.id)} userRole={userDetails?.rol || ''} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
