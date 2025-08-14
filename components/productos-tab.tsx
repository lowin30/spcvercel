"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Package, PlusCircle, Search, CircleSlash, CircleCheck, Edit, Loader2 } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

interface ProductosTabProps {
  productos: any[]
  categorias: any[]
}

export function ProductosTab({ productos: initialProductos, categorias: initialCategorias }: ProductosTabProps) {
  const [productos, setProductos] = useState<any[]>(initialProductos)
  const [categorias, setCategorias] = useState<any[]>(initialCategorias)
  const [filteredProductos, setFilteredProductos] = useState<any[]>(initialProductos)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoriaFilter, setCategoriaFilter] = useState("all")
  const [estadoFilter, setEstadoFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createBrowserSupabaseClient()

  // Efecto para cargar datos si no se proporcionaron inicialmente
  useEffect(() => {
    async function loadData() {
      if (initialProductos.length === 0 || initialCategorias.length === 0) {
        setIsLoading(true)
        try {
          // Cargar productos si no fueron proporcionados
          if (initialProductos.length === 0) {
            const { data: productosData, error: productosError } = await supabase
              .from("productos")
              .select(`
                *,
                categorias_productos (
                  id,
                  nombre
                )
              `)
              .order("code", { ascending: true })
            
            if (productosError) throw productosError
            setProductos(productosData || [])
            setFilteredProductos(productosData || [])
          }
          
          // Cargar categorías si no fueron proporcionadas
          if (initialCategorias.length === 0) {
            const { data: categoriasData, error: categoriasError } = await supabase
              .from("categorias_productos")
              .select("*")
              .order("nombre", { ascending: true })
            
            if (categoriasError) throw categoriasError
            setCategorias(categoriasData || [])
          }
        } catch (error) {
          console.error("Error al cargar datos:", error)
          toast({
            title: "Error",
            description: "No se pudieron cargar los datos de productos y categorías.",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
        }
      }
    }
    
    loadData()
  }, [initialProductos, initialCategorias])
  
  // Aplicar filtros y búsqueda
  useEffect(() => {
    let result = [...productos]

    // Aplicar filtro de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (producto) =>
          producto.nombre.toLowerCase().includes(term) ||
          producto.code?.toString().includes(term) ||
          (producto.descripcion && producto.descripcion.toLowerCase().includes(term))
      )
    }

    // Aplicar filtro de categoría
    if (categoriaFilter && categoriaFilter !== "all") {
      result = result.filter((producto) => producto.categoria_id === categoriaFilter)
    }

    // Aplicar filtro de estado
    if (estadoFilter !== "all") {
      const activo = estadoFilter === "activo"
      result = result.filter((producto) => producto.activo === activo)
    }

    setFilteredProductos(result)
  }, [productos, searchTerm, categoriaFilter, estadoFilter])

  // Función para cambiar el estado de un producto
  const toggleProductoEstado = async (id: string, activo: boolean) => {
    try {
      setIsLoading(true)
      
      const { error } = await supabase
        .from("productos")
        .update({ activo: !activo, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (error) throw error

      // Actualizar el estado local
      setProductos(
        productos.map((producto) =>
          producto.id === id ? { ...producto, activo: !activo, updated_at: new Date().toISOString() } : producto
        )
      )

      toast({
        title: "Estado actualizado",
        description: `El producto ha sido ${!activo ? "activado" : "desactivado"} correctamente.`,
      })
    } catch (error) {
      console.error("Error al cambiar estado del producto:", error)
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del producto.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && productos.length === 0) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando productos...</span>
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between md:block hidden">
          <div>
            <CardTitle className="text-2xl">Gestión de Productos</CardTitle>
            <CardDescription>Administra los productos disponibles en el sistema</CardDescription>
          </div>
          <Button className="flex items-center" asChild>
            <Link href="/dashboard/productos/nuevo">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar productos..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-2 lg:gap-4">
              <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="inactivo">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Encabezado móvil y botón */}
          <div className="flex flex-row items-center justify-between mb-4 md:hidden">
            <h3 className="text-lg font-semibold">Productos</h3>
            <Button className="flex items-center" size="sm" asChild>
              <Link href="/dashboard/productos/nuevo">
                <PlusCircle className="mr-1 h-4 w-4" />
                Nuevo
              </Link>
            </Button>
          </div>

          {/* Tabla de productos - Solo visible en pantallas medianas y grandes */}
          <div className="rounded-md border hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProductos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No se encontraron productos.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProductos.map((producto) => (
                    <TableRow key={producto.id}>
                      <TableCell className="font-medium">{producto.code}</TableCell>
                      <TableCell>{producto.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {producto.categorias_productos?.nombre || "Sin categoría"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(producto.precio)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={producto.activo}
                            onCheckedChange={() => toggleProductoEstado(producto.id, producto.activo)}
                          />
                          <Label>{producto.activo ? "Activo" : "Inactivo"}</Label>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/productos/${producto.id}/editar`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Vista de tarjetas para móvil */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredProductos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron productos.
              </div>
            ) : (
              filteredProductos.map((producto) => (
                <div key={producto.id} className="bg-white p-4 rounded-lg border shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <div className="font-semibold truncate mb-1">{producto.nombre}</div>
                      <div className="text-sm text-muted-foreground">Código: {producto.code || "N/A"}</div>
                    </div>
                    <Badge variant="outline">{producto.categorias_productos?.nombre || "Sin categoría"}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Precio:</div>
                    <div className="text-sm font-mono text-right">{formatCurrency(producto.precio)}</div>
                    
                    <div className="text-sm text-muted-foreground">Estado:</div>
                    <div className="text-sm text-right">
                      <div className="flex items-center justify-end">
                        <Switch
                          checked={producto.activo}
                          onCheckedChange={() => toggleProductoEstado(producto.id, producto.activo)}
                          className="mr-2"
                        />
                        <span>{producto.activo ? "Activo" : "Inactivo"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/productos/${producto.id}/editar`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{productos.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Productos Activos</CardTitle>
                <CircleCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {productos.filter((p) => p.activo).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Productos Inactivos</CardTitle>
                <CircleSlash className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {productos.filter((p) => !p.activo).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categorías</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categorias.length}</div>
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm text-blue-600"
                  asChild
                >
                  <Link href="/dashboard/configuracion?tab=categorias">
                    Ver categorías
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
