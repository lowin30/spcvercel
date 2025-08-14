"use client"

import { useState, useEffect } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon, Loader2, Search } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { executeCountQuery } from "@/lib/supabase-helpers"

// Tipos para los datos
interface Ajuste {
  id: number
  id_factura: number
  id_item: number
  monto_base: number
  porcentaje_ajuste: number
  monto_ajuste: number
  aprobado: boolean
  pagado: boolean
  created_at: string
  descripcion_item?: string
  factura?: {
    nombre: string
    datos_afip: string
    total: number
    id_administrador: number
  }
  administrador?: {
    id: number
    nombre: string
  }
}

interface Administrador {
  id: number
  nombre: string
}

export default function AjustesPage() {
  // Estados
  const [ajustes, setAjustes] = useState<Ajuste[]>([])
  const [administradores, setAdministradores] = useState<Administrador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estados para filtros
  const [filtroAdministrador, setFiltroAdministrador] = useState<number | null>(null)
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<Date | null>(null)
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<Date | null>(null)
  const [busqueda, setBusqueda] = useState("")

  // Estado para paginación
  const [pagina, setPagina] = useState(1)
  const elementosPorPagina = 20
  const [totalAjustes, setTotalAjustes] = useState(0)

  useEffect(() => {
    cargarDatos()
  }, [pagina, filtroAdministrador, filtroFechaDesde, filtroFechaHasta, busqueda])

  async function cargarDatos() {
    try {
      setLoading(true)
      const supabase = createBrowserSupabaseClient()

      // Verificar sesión
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/login'
        return
      }

      // Cargar administradores para el filtro
      const { data: adminsData, error: adminsError } = await supabase
        .from('administradores')
        .select('id, nombre')
        .order('nombre')
      
      if (adminsError) {
        console.error("Error al cargar administradores:", adminsError)
      } else {
        setAdministradores(adminsData || [])
      }

      // Construir la consulta para los ajustes con joins
      let query = supabase
        .from('ajustes_facturas')
        .select(`
          *,
          factura:facturas(nombre, datos_afip, total, id_administrador, administrador:administradores(id, nombre))
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      // Aplicar filtros
      if (filtroAdministrador && parseInt(filtroAdministrador.toString()) !== 0) {
        // Filtramos por el id_administrador de la factura usando un inner join
        query = query.eq('factura.id_administrador', filtroAdministrador)
      }

      if (filtroFechaDesde) {
        query = query.gte('created_at', filtroFechaDesde.toISOString().split('T')[0])
      }

      if (filtroFechaHasta) {
        // Ajustamos la fecha hasta para incluir todo el día
        const fechaHasta = new Date(filtroFechaHasta)
        fechaHasta.setHours(23, 59, 59, 999)
        query = query.lte('created_at', fechaHasta.toISOString())
      }

      if (busqueda) {
        // Buscar en descripción del item o en el nombre de la factura
        query = query.or(`descripcion_item.ilike.%${busqueda}%,facturas.nombre.ilike.%${busqueda}%`)
      }

      // Paginación
      const desde = (pagina - 1) * elementosPorPagina
      query = query.range(desde, desde + elementosPorPagina - 1)

      // Ejecutar la consulta
      const { data, error, count } = await query

      if (error) {
        console.error("Error al cargar ajustes:", error)
        setError(`Error al cargar los ajustes: ${error.message}`)
      } else {
        setAjustes(data || [])
        setTotalAjustes(count || 0)
      }

    } catch (err) {
      console.error("Error inesperado:", err)
      setError("Ocurrió un error inesperado al cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  // Función para formatear fecha
  const formatearFecha = (fecha: string) => {
    try {
      return format(new Date(fecha), "dd 'de' MMMM 'de' yyyy", { locale: es })
    } catch (error) {
      return "Fecha inválida"
    }
  }

  // Función para limpiar filtros
  const limpiarFiltros = () => {
    setFiltroAdministrador(null)
    setFiltroFechaDesde(null)
    setFiltroFechaHasta(null)
    setBusqueda("")
    setPagina(1)
  }

  // Calcular número total de páginas
  const totalPaginas = Math.ceil(totalAjustes / elementosPorPagina)

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ajustes de Facturas</h1>
          <p className="text-muted-foreground">
            Gestione los ajustes aplicados a las facturas
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtre los ajustes por administrador o fecha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Filtro por administrador */}
            <div>
              <label className="text-sm font-medium mb-1 block">Administrador</label>
              <Select 
                value={filtroAdministrador?.toString() || ""} 
                onValueChange={(value) => setFiltroAdministrador(value ? parseInt(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los administradores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todos los administradores</SelectItem>
                  {administradores.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id.toString()}>
                      {admin.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por fecha desde */}
            <div>
              <label className="text-sm font-medium mb-1 block">Fecha desde</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filtroFechaDesde ? format(filtroFechaDesde, "dd/MM/yyyy") : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filtroFechaDesde || undefined}
                    onSelect={(date) => setFiltroFechaDesde(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Filtro por fecha hasta */}
            <div>
              <label className="text-sm font-medium mb-1 block">Fecha hasta</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filtroFechaHasta ? format(filtroFechaHasta, "dd/MM/yyyy") : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filtroFechaHasta || undefined}
                    onSelect={(date) => setFiltroFechaHasta(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Búsqueda */}
            <div>
              <label className="text-sm font-medium mb-1 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por descripción o factura..."
                  className="pl-8"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={limpiarFiltros}>
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de ajustes */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Ajustes</CardTitle>
          <CardDescription>
            Se muestran {ajustes.length} ajustes de un total de {totalAjustes}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-800 p-4 rounded-md">
              {error}
            </div>
          ) : ajustes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron ajustes con los filtros aplicados
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Factura</TableHead>
                      <TableHead>Datos AFIP</TableHead>
                      <TableHead>Administrador</TableHead>
                      <TableHead>Total Factura</TableHead>
                      <TableHead>Monto Ajuste</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ajustes.map((ajuste) => (
                      <TableRow key={ajuste.id}>
                        <TableCell>{formatearFecha(ajuste.created_at)}</TableCell>
                        <TableCell>{ajuste.factura?.nombre || "Sin nombre"}</TableCell>
                        <TableCell>{ajuste.factura?.datos_afip || "Sin datos"}</TableCell>
                        <TableCell>{ajuste.factura?.administrador?.nombre || "Sin administrador"}</TableCell>
                        <TableCell>{formatCurrency(ajuste.factura?.total || 0)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(ajuste.monto_ajuste)}</TableCell>
                        <TableCell>
                          {ajuste.aprobado ? (
                            <Badge className="bg-green-100 text-green-800">Aprobado</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                              Pendiente
                            </Badge>
                          )}
                          {ajuste.pagado && (
                            <Badge className="ml-2 bg-blue-100 text-blue-800">Pagado</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    Página {pagina} de {totalPaginas}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagina(p => Math.max(1, p - 1))}
                      disabled={pagina === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                      disabled={pagina === totalPaginas}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
