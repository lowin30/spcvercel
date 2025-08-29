"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Edit, Trash, Plus, Save, X } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Categoria {
  id: string
  nombre: string
  descripcion: string | null
  created_at: string
  updated_at: string
}

interface CategoriasProductosListProps {
  initialCategorias: Categoria[]
  conteoProductos: Map<string, number>
}

export function CategoriasProductosList({ initialCategorias, conteoProductos }: CategoriasProductosListProps) {
  const [categorias, setCategorias] = useState<Categoria[]>(initialCategorias)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState("")
  const [editDescripcion, setEditDescripcion] = useState("")
  const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: "", descripcion: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  const startEditing = (categoria: Categoria) => {
    setEditingId(categoria.id)
    setEditNombre(categoria.nombre)
    setEditDescripcion(categoria.descripcion || "")
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditNombre("")
    setEditDescripcion("")
  }

  const saveEditing = async () => {
    if (!editNombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la categoría no puede estar vacío.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from("categorias_productos")
        .update({
          nombre: editNombre.trim(),
          descripcion: editDescripcion.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId)

      if (error) throw error

      // Actualizar estado local
      setCategorias(
        categorias.map((cat) =>
          cat.id === editingId
            ? {
                ...cat,
                nombre: editNombre.trim(),
                descripcion: editDescripcion.trim() || null,
                updated_at: new Date().toISOString(),
              }
            : cat,
        ),
      )

      toast({
        title: "Categoría actualizada",
        description: "La categoría ha sido actualizada correctamente.",
      })

      cancelEditing()
    } catch (error: any) {
      console.error("Error al actualizar categoría:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la categoría.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteCategoria = async (id: string) => {
    setIsSubmitting(true)

    try {
      // Verificar si hay productos asociados
      const count = conteoProductos.get(id) || 0
      if (count > 0) {
        throw new Error(`No se puede eliminar la categoría porque tiene ${count} productos asociados.`)
      }

      const { error } = await supabase.from("categorias_productos").delete().eq("id", id)

      if (error) throw error

      // Actualizar estado local
      setCategorias(categorias.filter((cat) => cat.id !== id))

      toast({
        title: "Categoría eliminada",
        description: "La categoría ha sido eliminada correctamente.",
      })
    } catch (error: any) {
      console.error("Error al eliminar categoría:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la categoría.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const addCategoria = async () => {
    if (!nuevaCategoria.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la categoría no puede estar vacío.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const { data, error } = await supabase
        .from("categorias_productos")
        .insert({
          nombre: nuevaCategoria.nombre.trim(),
          descripcion: nuevaCategoria.descripcion.trim() || null,
        })
        .select()
        .single()

      if (error) throw error

      // Actualizar estado local
      setCategorias([...categorias, data])
      setNuevaCategoria({ nombre: "", descripcion: "" })

      toast({
        title: "Categoría creada",
        description: "La categoría ha sido creada correctamente.",
      })
    } catch (error: any) {
      console.error("Error al crear categoría:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la categoría.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nueva Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={nuevaCategoria.nombre}
                onChange={(e) => setNuevaCategoria({ ...nuevaCategoria, nombre: e.target.value })}
                disabled={isSubmitting}
                placeholder="Nombre de la categoría"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={nuevaCategoria.descripcion}
                onChange={(e) => setNuevaCategoria({ ...nuevaCategoria, descripcion: e.target.value })}
                disabled={isSubmitting}
                placeholder="Descripción opcional"
                rows={2}
              />
            </div>
            <Button onClick={addCategoria} disabled={isSubmitting} className="w-full">
              <Plus className="mr-1 h-4 w-4" />
              Añadir Categoría
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border">
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
            {categorias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No hay categorías definidas.
                </TableCell>
              </TableRow>
            ) : (
              categorias.map((categoria) => (
                <TableRow key={categoria.id}>
                  <TableCell>
                    {editingId === categoria.id ? (
                      <Input
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        disabled={isSubmitting}
                      />
                    ) : (
                      categoria.nombre
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === categoria.id ? (
                      <Textarea
                        value={editDescripcion}
                        onChange={(e) => setEditDescripcion(e.target.value)}
                        disabled={isSubmitting}
                        rows={2}
                      />
                    ) : (
                      categoria.descripcion || "-"
                    )}
                  </TableCell>
                  <TableCell>{conteoProductos.get(categoria.id) || 0}</TableCell>
                  <TableCell className="text-right">
                    {editingId === categoria.id ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={saveEditing} disabled={isSubmitting}>
                          <Save className="h-4 w-4" />
                          <span className="sr-only">Guardar</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={cancelEditing} disabled={isSubmitting}>
                          <X className="h-4 w-4" />
                          <span className="sr-only">Cancelar</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(categoria)}
                          disabled={isSubmitting}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isSubmitting}>
                              <Trash className="h-4 w-4" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Solo se pueden eliminar categorías que no tengan
                                productos asociados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCategoria(categoria.id)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
