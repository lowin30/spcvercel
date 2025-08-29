"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from '@/lib/supabase-client'
import { Button } from "@/components/ui/button"
import { BuildingList } from "@/components/building-list"
import Link from "next/link"
import { Plus, Search, Loader2, Filter, X, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export default function EdificiosPage({
  searchParams = {},
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const [edificios, setEdificios] = useState<any[]>([])
  const [edificiosFiltrados, setEdificiosFiltrados] = useState<any[]>([])
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [administradores, setAdministradores] = useState<{id: string, nombre: string}[]>([])
  const [activeFilters, setActiveFilters] = useState<{
    administrador?: string,
  }>({})
  
  const router = useRouter()
  const params = useSearchParams()
  const searchQuery = params.get('q') || ''
  
  // Inicializar búsqueda si viene en la URL
  useEffect(() => {
    if (searchQuery) {
      setSearchTerm(searchQuery)
    }
  }, [searchQuery])
  
  // Recarga los edificios cuando la página obtiene el foco o cuando regresamos a ella
  useEffect(() => {
    // Función para recargar los datos cuando la ventana obtiene el foco
    const recargarEdificios = () => {
      console.log('Recargando datos de edificios...')
      fetchEdificios() // Llamamos a la función interna que obtiene los edificios
    }
    
    // Verificamos cuándo la ventana obtiene el foco (por ejemplo, al regresar de otra página)
    window.addEventListener('focus', recargarEdificios)
    
    return () => {
      window.removeEventListener('focus', recargarEdificios)
    }
  }, [])
  
  // Aplicar filtros cada vez que cambian
  useEffect(() => {
    // Función para aplicar todos los filtros
    const applyFilters = () => {
      if (!edificios) return

      let filtered = [...edificios]
      
      // Filtro por término de búsqueda
      if (searchTerm) {
        const termLower = searchTerm.toLowerCase()
        filtered = filtered.filter(edificio => 
          edificio.nombre?.toLowerCase().includes(termLower) || 
          edificio.direccion?.toLowerCase().includes(termLower) ||
          edificio.cuit?.toLowerCase().includes(termLower)
        )
      }
      
      // Filtro por administrador
      if (activeFilters.administrador) {
        const idAdminFiltro = parseInt(activeFilters.administrador, 10)
        filtered = filtered.filter(edificio => 
          edificio.id_administrador === idAdminFiltro
        )
      }
      
      setEdificiosFiltrados(filtered)
    }
    
    applyFilters()
  }, [edificios, searchTerm, activeFilters])
  
  // Filtrar edificios por estado
  const edificiosActivos = edificiosFiltrados?.filter((edificio) => edificio.estado === "activo") || []
  const edificiosEnObra = edificiosFiltrados?.filter((edificio) => edificio.estado === "en_obra") || []
  const edificiosFinalizados = edificiosFiltrados?.filter((edificio) => edificio.estado === "finalizado") || []

  // Cargar edificios al inicio
  useEffect(() => {
    fetchEdificios()
  }, [])
  
  // Función para obtener los edificios de la base de datos
  async function fetchEdificios() {
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
        // Utilizamos la navegación directa para evitar errores
        window.location.href = "/login"
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
      
      // Obtener edificios usando la vista optimizada
      const { data: edificiosData, error: edificiosError } = await supabase
        .from("vista_edificios_completa")
        .select('*')
        .order("created_at", { ascending: false })
      
      if (edificiosError) {
        console.error("Error al obtener edificios:", edificiosError)
        setError("Error al cargar edificios")
        return
      }
      
      setEdificios(edificiosData || [])
      setEdificiosFiltrados(edificiosData || [])
      
      // Cargar lista de administradores
      const { data: adminsData, error: adminsError } = await supabase
        .from('administradores')
        .select('id, nombre')
        .order('nombre')
      
      if (adminsError) {
        console.error("Error al cargar administradores:", adminsError)
      } else if (adminsData) {
        setAdministradores(adminsData)
      }
      
    } catch (err) {
      console.error("Error inesperado:", err)
      setError("Ocurrió un error inesperado")
    } finally {
      setLoading(false)
    }
  }

  // Estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
          <p className="text-lg text-gray-500">Cargando edificios...</p>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Edificios</h1>
        {userDetails?.rol === "admin" && (
          <Button asChild>
            <Link href="/dashboard/edificios/nuevo">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Edificio
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de Edificios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg">
              <h3 className="font-medium">Activos</h3>
              <p className="text-2xl font-bold">{edificiosActivos.length}</p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-lg">
              <h3 className="font-medium">En Obra</h3>
              <p className="text-2xl font-bold">{edificiosEnObra.length}</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
              <h3 className="font-medium">Finalizados</h3>
              <p className="text-2xl font-bold">{edificiosFinalizados.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Buscar por nombre, dirección, CUIT..." 
            className="pl-8" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" onClick={() => setActiveFilters(prev => ({...prev}))}
          title="Filtros avanzados">
          <Filter className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Filtros avanzados */}
      <Card className="mt-4">
        <CardHeader className="py-4">
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>Filtra los edificios por administrador</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
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
          </div>
          
          {/* Botón para limpiar filtros */}
          {(activeFilters.administrador !== undefined || searchTerm) && (
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setActiveFilters({})
                  setSearchTerm('')
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" /> 
                Limpiar filtros
              </Button>
            </div>
          )}
          
          {/* Mostrar filtros activos */}
          {(activeFilters.administrador !== undefined || searchTerm) && (
            <div className="flex flex-wrap gap-2 mt-4 border-t pt-4">
              <p className="text-sm font-medium mr-2">Filtros activos:</p>
              {searchTerm && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Búsqueda: {searchTerm}
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {activeFilters.administrador && (
                <Badge variant="outline" className="flex items-center gap-1">
                  Administrador: {administradores.find(a => a.id === activeFilters.administrador)?.nombre || 'Desconocido'}
                  <button 
                    onClick={() => setActiveFilters(prev => ({...prev, administrador: undefined}))}
                    className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="todos">
        <TabsList className="grid grid-cols-4 md:w-auto w-full">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="activos">Activos</TabsTrigger>
          <TabsTrigger value="en_obra">En Obra</TabsTrigger>
          <TabsTrigger value="finalizados">Finalizados</TabsTrigger>
        </TabsList>
        <TabsContent value="todos" className="mt-4">
          <BuildingList buildings={edificiosFiltrados || []} />
        </TabsContent>
        <TabsContent value="activos" className="mt-4">
          <BuildingList buildings={edificiosActivos} />
        </TabsContent>
        <TabsContent value="en_obra" className="mt-4">
          <BuildingList buildings={edificiosEnObra} />
        </TabsContent>
        <TabsContent value="finalizados" className="mt-4">
          <BuildingList buildings={edificiosFinalizados} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
