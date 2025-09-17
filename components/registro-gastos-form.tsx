"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase-client"
import { X, Upload } from "lucide-react"
import { toast } from "sonner"

interface Tarea {
  id: number
  titulo: string
  code: string
}

interface Usuario {
  id: string
  email: string
  rol: string
}

interface RegistroGastosFormProps {
  tareas: Tarea[]
  usuario: Usuario | null
  onClose: () => void
  onSuccess: () => void
}

export function RegistroGastosForm({ tareas, usuario, onClose, onSuccess }: RegistroGastosFormProps) {
  const [formData, setFormData] = useState({
    id_tarea: "",
    tipo_gasto: "",
    monto: "",
    descripcion: "",
    fecha_gasto: new Date().toISOString().split("T")[0],
  })
  const [archivo, setArchivo] = useState<File | null>(null)
  const [previsualizacion, setPrevisualizacion] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const tareaSeleccionada = formData.id_tarea ? tareas.find(t => t.id === Number(formData.id_tarea)) : undefined

  const manejarArchivoSeleccionado = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Solo se permiten archivos de imagen")
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("El archivo no puede ser mayor a 5MB")
        return
      }
      setArchivo(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPrevisualizacion(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const subirArchivo = async (file: File): Promise<string> => {
    const supabase = createClient()
    if (!supabase) {
      throw new Error("Error al inicializar el cliente de Supabase")
    }
    if (!supabase.storage) {
      throw new Error("El cliente Supabase no tiene la funcionalidad de storage")
    }
    const extension = file.name.split(".").pop()
    const nombreArchivo = `gastos/${usuario?.id}/${Date.now()}.${extension}`
    try {
      const { data, error } = await supabase.storage.from("comprobantes").upload(nombreArchivo, file)
      if (error) {
        throw error
      }
      const { data: { publicUrl } } = supabase.storage.from("comprobantes").getPublicUrl(nombreArchivo)
      return publicUrl
    } catch (error) {
      throw new Error(`Error al subir archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  const guardarGasto = async () => {
    if (!usuario || !formData.id_tarea || !formData.tipo_gasto || !formData.monto || !formData.descripcion) {
      toast.error("Todos los campos son obligatorios")
      return
    }
    if (!archivo) {
      toast.error("Debes subir un comprobante fotográfico")
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error("Error al inicializar el cliente de Supabase")
      }
      const url_comprobante = await subirArchivo(archivo)
      const { error } = await supabase.from("gastos_trabajadores").insert([
        {
          id_usuario: usuario.id,
          id_tarea: Number(formData.id_tarea),
          tipo_gasto: formData.tipo_gasto,
          monto: Number(formData.monto),
          descripcion: formData.descripcion,
          url_comprobante,
          fecha_gasto: formData.fecha_gasto,
        },
      ])
      if (error) {
        throw error
      }
      toast.success("Gasto guardado correctamente")
      onSuccess()
    } catch (error) {
      console.error("Error al guardar el gasto:", error)
      toast.error(`Error al guardar el gasto: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Nuevo Gasto</CardTitle>
        <CardDescription>Completa los detalles del gasto que realizaste.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label htmlFor="tarea">Tarea Asociada</Label>
          <Select onValueChange={(value) => setFormData({ ...formData, id_tarea: value })} value={formData.id_tarea}>
            <SelectTrigger id="tarea">
              <SelectValue placeholder="Selecciona una tarea" />
            </SelectTrigger>
            <SelectContent>
              {tareas.map((tarea) => (
                <SelectItem key={tarea.id} value={String(tarea.id)}>
                  {tarea.code} - {tarea.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!tareaSeleccionada ? (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mt-4">
            <p className="text-amber-700">Selecciona una tarea para continuar</p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <Label>Categoría de Gasto</Label>
              <RadioGroup
                value={formData.tipo_gasto}
                onValueChange={(value) => setFormData({ ...formData, tipo_gasto: value })}
                className="flex items-center space-x-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="material" id="material" />
                  <Label htmlFor="material">Material</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mano de obra" id="mano_de_obra" />
                  <Label htmlFor="mano_de_obra">Mano de Obra</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="monto">Monto</Label>
                <Input
                  id="monto"
                  type="number"
                  placeholder="Ej: 25000"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="fecha_gasto">Fecha del Gasto</Label>
                <Input
                  id="fecha_gasto"
                  type="date"
                  value={formData.fecha_gasto}
                  onChange={(e) => setFormData({ ...formData, fecha_gasto: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                placeholder="Describe el gasto realizado..."
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="comprobante">Comprobante Fotográfico</Label>
              <div className="mt-2">
                {!previsualizacion ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-2">
                      <label htmlFor="comprobante" className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-500">Subir comprobante</span>
                        <input
                          id="comprobante"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={manejarArchivoSeleccionado}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG hasta 5MB</p>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={previsualizacion || "/placeholder.svg"}
                      alt="Previsualización"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setArchivo(null)
                        setPrevisualizacion(null)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={guardarGasto} disabled={loading || !formData.id_tarea}>
            {loading ? "Guardando..." : "Guardar Gasto"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
