"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { PlusCircle, Tag, Package, Loader2, Pencil, Trash, AlertCircle, CheckCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface CategoriasTabProps {
  categorias: any[]
}

export function CategoriasTab({ categorias: initialCategorias }: CategoriasTabProps) {
  const [categorias, setCategorias] = useState<any[]>(initialCategorias)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredCategorias, setFilteredCategorias] = useState<any[]>(initialCategorias)

  // Estado para el formulario
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<any>(null)
  const [newCategoriaNombre, setNewCategoriaNombre] = useState("")
  const [newCategoriaDescripcion, setNewCategoriaDescripcion] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Estado para eliminación
  const [categoriaToDelete, setCategoriaToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [conteoProductos, setConteoProductos] = useState<Map<string, number>>(new Map())

  const supabase = createBrowserSupabaseClient()

  // Cargar datos si no se proporcionaron inicialmente
  useEffect(() => {
    async function loadData() {
      if (initialCategorias.length === 0) {
        setIsLoading(true)
        try {
          const { data, error } = await supabase
            .from("categorias_productos")
            .select("*")
            .order("nombre", { ascending: true })

          if (error) throw error
          setCategorias(data || [])
          setFilteredCategorias(data || [])

          // Cargar conteo de productos por categoría
          const { data: productos } = await supabase.from("productos").select("categoria_id")
          
          // Crear un mapa de conteo
          const nuevoConteo = new Map<string, number>()
          productos?.forEach((producto: { categoria_id?: string }) => {
            if (producto.categoria_id) {
              const count = nuevoConteo.get(producto.categoria_id) || 0
              nuevoConteo.set(producto.categoria_id, count + 1)
            }
          })
          setConteoProductos(nuevoConteo)
        } catch (error) {
          console.error("Error al cargar categorías:", error)
          toast({
            title: "Error",
            description: "No se pudieron cargar las categorías.",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
        }
      }
    }
    
    loadData()
  }, [initialCategorias])

  // Efecto para filtrar categorías
  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      setFilteredCategorias(
        categorias.filter(
          cat => cat.nombre.toLowerCase().includes(term) || 
                (cat.descripcion && cat.descripcion.toLowerCase().includes(term))
        )
      )
    } else {
      setFilteredCategorias(categorias)
    }
  }, [categorias, searchTerm])

  // Abrir el formulario para editar
  const handleEdit = (categoria: any) => {
    setEditingCategoria(categoria)
    setNewCategoriaNombre(categoria.nombre)
    setNewCategoriaDescripcion(categoria.descripcion || "")
    setIsDialogOpen(true)
  }

  // Abrir el formulario para crear una nueva categoría
  const handleNewCategoria = () => {
    setEditingCategoria(null)
    setNewCategoriaNombre("")
    setNewCategoriaDescripcion("")
    setIsDialogOpen(true)
  }

  // Guardar categoría (nueva o editada)
  const handleSaveCategoria = async () => {
    if (!newCategoriaNombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la categoría es obligatorio.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      if (editingCategoria) {
        // Actualizar categoría existente
        const { error } = await supabase
          .from("categorias_productos")
          .update({
            nombre: newCategoriaNombre,
            descripcion: newCategoriaDescripcion,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingCategoria.id)
          
        if (error) throw error
          
        // Actualizar estado local
        setCategorias(
          categorias.map(c => 
            c.id === editingCategoria.id 
              ? { 
                  ...c, 
                  nombre: newCategoriaNombre, 
                  descripcion: newCategoriaDescripcion,
                  updated_at: new Date().toISOString()
                } 
              : c
          )
        )
        
        toast({
          title: "Categoría actualizada",
          description: "La categoría ha sido actualizada correctamente."
        })
      } else {
        // Crear nueva categoría
        const { data, error } = await supabase
          .from("categorias_productos")
          .insert({
            nombre: newCategoriaNombre,
            descripcion: newCategoriaDescripcion,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          
        if (error) throw error
        
        // Actualizar estado local
        setCategorias([...(data || []), ...categorias])
        
        toast({
          title: "Categoría creada",
          description: "La nueva categoría ha sido creada correctamente."
        })
      }

      // Cerrar diálogo
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error al guardar categoría:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la categoría.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Eliminar categoría
  const handleDeleteCategoria = async () => {
    if (!categoriaToDelete) return

    setIsDeleting(true)

    try {
      // Comprobar si tiene productos asociados
      const count = conteoProductos.get(categoriaToDelete.id) || 0
      
      if (count > 0) {
        toast({
          title: "No se puede eliminar",
          description: `Esta categoría tiene ${count} productos asociados. Elimine o cambie los productos primero.`,
          variant: "destructive"
        })
        return
      }
      
      // Eliminar categoría
      const { error } = await supabase
        .from("categorias_productos")
        .delete()
        .eq("id", categoriaToDelete.id)
        
      if (error) throw error
      
      // Actualizar estado local
      setCategorias(categorias.filter(c => c.id !== categoriaToDelete.id))
      
      toast({
        title: "Categoría eliminada",
        description: "La categoría ha sido eliminada correctamente."
      })
    } catch (error) {
      console.error("Error al eliminar categoría:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la categoría.",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
      setCategoriaToDelete(null)
    }
  }

  if (isLoading && categorias.length === 0) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando categorías...</span>
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between md:block hidden">
          <div>
            <CardTitle className="text-2xl">Gestión de Categorías</CardTitle>
            <CardDescription>Administra las categorías de productos</CardDescription>
          </div>
          <Button onClick={handleNewCategoria}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Categoría
          </Button>
        </CardHeader>
        <CardContent>
          {/* Encabezado móvil y botón */}
          <div className="flex flex-row items-center justify-between mb-4 md:hidden">
            <h3 className="text-lg font-semibold">Categorías</h3>
            <Button onClick={handleNewCategoria} size="sm">
              <PlusCircle className="mr-1 h-4 w-4" />
              Nueva
            </Button>
          </div>

          {/* Búsqueda */}
          <div className="relative flex-grow mb-6">
            <Input 
              type="search" 
              placeholder="Buscar categorías..." 
              className="w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Tabla de categorías - Solo visible en pantallas medianas y grandes */}
          <div className="rounded-md border hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategorias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No se encontraron categorías.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategorias.map((categoria) => (
                    <TableRow key={categoria.id}>
                      <TableCell className="font-medium">{categoria.nombre}</TableCell>
                      <TableCell>{categoria.descripcion}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {conteoProductos.get(categoria.id) || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(categoria)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setCategoriaToDelete(categoria)}
                                disabled={(conteoProductos.get(categoria.id) || 0) > 0}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Eliminar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará la categoría "{categoria.nombre}" permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteCategoria} disabled={isDeleting}>
                                  {isDeleting ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Trash className="h-4 w-4 mr-2" />
                                  )}
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Vista de tarjetas para móvil */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredCategorias.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron categorías.
              </div>
            ) : (
              filteredCategorias.map((categoria) => (
                <div key={categoria.id} className="bg-white p-4 rounded-lg border shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-semibold">{categoria.nombre}</div>
                    <Badge variant="secondary">
                      {conteoProductos.get(categoria.id) || 0} productos
                    </Badge>
                  </div>
                  
                  {categoria.descripcion && (
                    <div className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {categoria.descripcion}
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(categoria)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setCategoriaToDelete(categoria)}
                          disabled={(conteoProductos.get(categoria.id) || 0) > 0}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará la categoría "{categoria.nombre}" permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteCategoria} disabled={isDeleting}>
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Trash className="h-4 w-4 mr-2" />
                            )}
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Categorías</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categorias.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categorías con Productos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Array.from(conteoProductos.entries()).filter(([_, count]) => count > 0).length}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo para crear/editar categoría */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategoria ? "Editar Categoría" : "Nueva Categoría"}
            </DialogTitle>
            <DialogDescription>
              {editingCategoria 
                ? "Modifica los detalles de la categoría seleccionada." 
                : "Crea una nueva categoría para clasificar productos."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input 
                id="nombre"
                value={newCategoriaNombre}
                onChange={(e) => setNewCategoriaNombre(e.target.value)}
                placeholder="Nombre de la categoría"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input 
                id="descripcion"
                value={newCategoriaDescripcion}
                onChange={(e) => setNewCategoriaDescripcion(e.target.value)}
                placeholder="Descripción (opcional)"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCategoria} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {editingCategoria ? "Actualizar" : "Crear"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
