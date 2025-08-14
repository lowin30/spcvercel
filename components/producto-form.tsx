"use client"

import type React from "react"

import { useState } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, Plus } from "lucide-react"
import type { Producto } from "@/types/producto"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ProductoFormProps {
  producto?: Producto
  categorias: { id: string; nombre: string }[]
}

export function ProductoForm({ producto, categorias }: ProductoFormProps) {
  const [nombre, setNombre] = useState(producto?.nombre || "")
  const [descripcion, setDescripcion] = useState(producto?.descripcion || "")
  const [precio, setPrecio] = useState(producto?.precio?.toString() || "")
  const [categoriaId, setCategoriaId] = useState(producto?.categoria_id || "")
  const [activo, setActivo] = useState(producto?.activo !== false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState("")
  const [openDialog, setOpenDialog] = useState(false)

  const { supabase } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validar campos obligatorios
      if (!nombre || !precio || !categoriaId) {
        throw new Error("Por favor completa todos los campos obligatorios")
      }

      // Validar que el precio sea un número entero positivo
      const precioNum = Number.parseInt(precio)
      if (isNaN(precioNum) || precioNum <= 0 || precioNum.toString() !== precio) {
        throw new Error("El precio debe ser un número entero positivo")
      }

      const productoData = {
        nombre,
        descripcion,
        precio: precioNum,
        categoria_id: categoriaId,
        activo,
        updated_at: new Date().toISOString(),
      }

      if (producto) {
        // Actualizar producto existente
        const { error } = await supabase.from("productos").update(productoData).eq("id", producto.id)

        if (error) throw error

        toast({
          title: "Producto actualizado",
          description: "El producto ha sido actualizado correctamente.",
        })
      } else {
        // Crear nuevo producto
        const { error } = await supabase.from("productos").insert(productoData)

        if (error) throw error

        toast({
          title: "Producto creado",
          description: "El producto ha sido creado correctamente.",
        })
      }

      // Redirigir a la lista de productos
      router.push("/dashboard/productos")
      router.refresh()
    } catch (error: any) {
      console.error("Error al guardar producto:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el producto.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCrearCategoria = async () => {
    if (!nuevaCategoria.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para la categoría.",
        variant: "destructive",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from("categorias_productos")
        .insert({ nombre: nuevaCategoria.trim() })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Categoría creada",
        description: "La categoría ha sido creada correctamente.",
      })

      // Añadir la nueva categoría a la lista y seleccionarla
      categorias.push({ id: data.id, nombre: data.nombre })
      setCategoriaId(data.id)
      setOpenDialog(false)
      setNuevaCategoria("")
    } catch (error: any) {
      console.error("Error al crear categoría:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la categoría.",
        variant: "destructive",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{producto ? "Editar Producto" : "Nuevo Producto"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="precio">Precio (en pesos) *</Label>
            <Input
              id="precio"
              type="number"
              min="1"
              step="1"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <p className="text-sm text-muted-foreground">Ingresa el precio en pesos, sin decimales.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría *</Label>
            <div className="flex gap-2">
              <Select value={categoriaId} onValueChange={setCategoriaId} disabled={isSubmitting} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nueva Categoría</DialogTitle>
                    <DialogDescription>Crea una nueva categoría para los productos.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nuevaCategoria">Nombre de la categoría</Label>
                      <Input
                        id="nuevaCategoria"
                        value={nuevaCategoria}
                        onChange={(e) => setNuevaCategoria(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                      Cancelar
                    </Button>
                    <Button type="button" onClick={handleCrearCategoria}>
                      Crear Categoría
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="activo" checked={activo} onCheckedChange={setActivo} disabled={isSubmitting} />
            <Label htmlFor="activo">Producto activo</Label>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/productos")}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {producto ? "Guardar Cambios" : "Crear Producto"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
