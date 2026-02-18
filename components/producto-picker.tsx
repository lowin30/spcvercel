"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Package } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Producto } from "@/types/producto"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface ProductoPickerProps {
  onSelect: (producto: Producto) => void
  buttonLabel?: string
  productosInyectados?: any[]
  categoriasInyectadas?: any[]
}


export function ProductoPicker({
  onSelect,
  buttonLabel = "Seleccionar Producto",
  productosInyectados,
  categoriasInyectadas
}: ProductoPickerProps) {

  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoriaFilter, setCategoriaFilter] = useState("all")
  const [productos, setProductos] = useState<Producto[]>(productosInyectados || [])
  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>(categoriasInyectadas || [])

  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClient()

  // Cargar productos y categorías al abrir el diálogo
  useEffect(() => {
    if (open && !productosInyectados) {
      loadProductos()
      loadCategorias()
    }
  }, [open, productosInyectados])


  // Filtrar productos cuando cambian los filtros
  useEffect(() => {
    if (!productos.length) return

    let result = [...productos]

    // Aplicar filtro de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (producto) =>
          producto.nombre.toLowerCase().includes(term) ||
          producto.code.toString().includes(term) ||
          (producto.descripcion && producto.descripcion.toLowerCase().includes(term)),
      )
    }

    // Aplicar filtro de categoría
    if (categoriaFilter && categoriaFilter !== "all") {
      result = result.filter((producto) => producto.categoria_id === categoriaFilter)
    }

    // Solo mostrar productos activos
    result = result.filter((producto) => producto.activo)

    setFilteredProductos(result)
  }, [productos, searchTerm, categoriaFilter])

  const loadProductos = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("productos")
        .select(`
          *,
          categorias_productos (
            id,
            nombre
          )
        `)
        .order("code", { ascending: true })

      if (error) throw error

      setProductos(data || [])
      setFilteredProductos(data?.filter((p) => p.activo) || [])
    } catch (error) {
      console.error("Error al cargar productos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from("categorias_productos")
        .select("id, nombre")
        .order("nombre", { ascending: true })

      if (error) throw error

      setCategorias(data || [])
    } catch (error) {
      console.error("Error al cargar categorías:", error)
    }
  }

  const handleSelect = (producto: Producto) => {
    onSelect(producto)
    setOpen(false)
    setSearchTerm("")
    setCategoriaFilter("all")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Package className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Seleccionar Producto</DialogTitle>
          <DialogDescription>Busca y selecciona un producto para añadir al presupuesto.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o nombre..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
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
          </div>

          <div className="max-h-[300px] overflow-y-auto rounded-md border">
            {isLoading ? (
              <div className="flex h-20 items-center justify-center">
                <p className="text-sm text-muted-foreground">Cargando productos...</p>
              </div>
            ) : filteredProductos.length === 0 ? (
              <div className="flex h-20 items-center justify-center">
                <p className="text-sm text-muted-foreground">No se encontraron productos.</p>
              </div>
            ) : (
              filteredProductos.map((producto) => (
                <div
                  key={producto.id}
                  className="flex cursor-pointer items-center justify-between border-b p-3 hover:bg-muted"
                  onClick={() => handleSelect(producto)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {producto.code} - {producto.nombre}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {producto.categorias_productos?.nombre}
                      </Badge>
                    </div>
                    {producto.descripcion && <p className="text-sm text-muted-foreground">{producto.descripcion}</p>}
                  </div>
                  <div className="text-right font-bold">{formatCurrency(producto.precio)}</div>
                </div>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
