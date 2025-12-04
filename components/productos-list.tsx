"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { SuperIntelligentSearch } from "@/components/super-intelligent-search"
import { SearchHighlight } from "@/components/search-highlight"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Edit, Package, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import type { Producto } from "@/types/producto"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ProductosListProps {
  initialProductos: Producto[]
  categorias: { id: string; nombre: string }[]
}

export function ProductosList({ initialProductos, categorias }: ProductosListProps) {
  const [productos, setProductos] = useState<Producto[]>(initialProductos)
  const [searchResults, setSearchResults] = useState<Producto[]>(initialProductos)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoriaFilter, setCategoriaFilter] = useState<string | null>(null)
  const [estadoFilter, setEstadoFilter] = useState<boolean | null>(null)
  const [searching, setSearching] = useState(false)

  const supabase = createClient()

  // Usar resultados de búsqueda inteligente o productos iniciales
  const filteredProductos = searchQuery ? searchResults : initialProductos

  // Función para cambiar el estado de un producto
  const toggleProductoEstado = async (id: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from("productos")
        .update({ activo: !activo, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (error) throw error

      // Actualizar el estado local
      setProductos(
        productos.map((producto) =>
          producto.id === id ? { ...producto, activo: !activo, updated_at: new Date().toISOString() } : producto,
        ),
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
    }
  }

  // Vista para dispositivos móviles
  const MobileView = () => (
    <div className="space-y-4">
      {filteredProductos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h3 className="font-medium">No se encontraron productos</h3>
          <p className="text-sm text-muted-foreground">Intenta con otros filtros o crea un nuevo producto.</p>
        </div>
      ) : (
        filteredProductos.map((producto) => (
          <Card key={producto.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  <span className="mr-2 text-sm font-normal text-muted-foreground">#{producto.code}</span>
                  {producto.nombre}
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Acciones</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <Link href={`/dashboard/productos/${producto.id}`} passHref legacyBehavior>
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalles
                      </DropdownMenuItem>
                    </Link>
                    <Link href={`/dashboard/productos/${producto.id}/editar`} passHref legacyBehavior>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    </Link>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Categoría</p>
                  <Badge variant="outline" className="mt-1">
                    {producto.categorias_productos?.nombre || "Sin categoría"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Precio</p>
                  <p className="mt-1 font-medium">{formatCurrency(producto.precio)}</p>
                </div>
                <div className="col-span-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={producto.activo}
                      onCheckedChange={() => toggleProductoEstado(producto.id, producto.activo)}
                    />
                    <Label>{producto.activo ? "Activo" : "Inactivo"}</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )

  // Vista para escritorio
  const DesktopView = () => (
    <div className="rounded-md border">
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
                <TableCell>
                  <SearchHighlight text={producto.nombre} query={searchQuery} />
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{producto.categorias_productos?.nombre || "Sin categoría"}</Badge>
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
                  <div className="flex justify-end gap-2">
                    <Link href={`/dashboard/productos/${producto.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver</span>
                      </Button>
                    </Link>
                    <Link href={`/dashboard/productos/${producto.id}/editar`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:w-96">
          <SuperIntelligentSearch
            rpcFunction="buscar_productos_super_inteligente"
            placeholder="Buscar productos por nombre, código, descripción o categoría..."
            additionalParams={{
              p_categoria_id: categoriaFilter || undefined,
              p_activo: estadoFilter ?? undefined,
              p_limit: 100
            }}
            onResults={(results) => {
              setSearchResults(results)
              setSearchQuery(results.length > 0 ? "searching" : "")
            }}
            onLoading={setSearching}
            minChars={2}
            debounceMs={300}
            showRelevanceInfo={true}
            showStats={true}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
          <Select 
            value={categoriaFilter || "all"} 
            onValueChange={(value) => setCategoriaFilter(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Categoría" />
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
          <Select 
            value={estadoFilter === null ? "all" : estadoFilter ? "activo" : "inactivo"} 
            onValueChange={(value) => setEstadoFilter(value === "all" ? null : value === "activo")}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="inactivo">Inactivos</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/dashboard/productos/categorias" className="col-span-2 sm:col-span-1">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Package className="mr-1 h-4 w-4" />
              Categorías
            </Button>
          </Link>
        </div>
      </div>

      {/* Vista responsiva: móvil vs escritorio */}
      <div className="hidden md:block">
        <DesktopView />
      </div>
      <div className="md:hidden">
        <MobileView />
      </div>
    </div>
  )
}
