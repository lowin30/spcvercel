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
import { X, Upload, Camera, CameraIcon, ScanText } from "lucide-react"
import { toast } from "sonner"
import { OCRSimple } from "@/components/ocr-simple"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  const [activeTab, setActiveTab] = useState<string>("manual") // manual u ocr

  const tareaSeleccionada = formData.id_tarea ? tareas.find(t => t.id === Number(formData.id_tarea)) : undefined

  

  const manejarArchivoSeleccionado = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith("image/")) {
        toast.error("Solo se permiten archivos de imagen")
        return
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("El archivo no puede ser mayor a 5MB")
        return
      }

      setArchivo(file)

      // Crear previsualización
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

    // Verificar que el cliente tenga la propiedad storage
    if (!supabase.storage) {
      throw new Error("El cliente Supabase no tiene la funcionalidad de storage")
    }

    // Generar nombre único para el archivo
    const extension = file.name.split(".").pop()
    const nombreArchivo = `gastos/${usuario?.id}/${Date.now()}.${extension}`

    try {
      console.log("Subiendo archivo a:", nombreArchivo)
      const uploadResponse = await supabase.storage.from("comprobantes").upload(nombreArchivo, file)
      const data = uploadResponse.data
      const error = uploadResponse.error

      if (error) {
        console.error("Error al subir archivo:", error)
        throw error
      }

      // Obtener URL pública
      const urlResponse = supabase.storage.from("comprobantes").getPublicUrl(nombreArchivo)
      const urlData = urlResponse.data

      console.log("URL pública generada:", urlData.publicUrl)
      return urlData.publicUrl
    } catch (error) {
      console.error("Error en subir archivo:", error)
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
        toast.error("Error al inicializar el cliente de Supabase")
        setLoading(false)
        return
      }

      // Validar que los valores sean correctos
      const idTarea = Number(formData.id_tarea)
      const monto = Number(formData.monto)
      
      if (isNaN(idTarea) || isNaN(monto)) {
        toast.error("El id de tarea y el monto deben ser valores numéricos válidos")
        setLoading(false)
        return
      }

      console.log("Subiendo archivo...")
      // Subir archivo
      const comprobanteUrl = await subirArchivo(archivo)
      console.log("Archivo subido: ", comprobanteUrl)

      console.log("Guardando gasto con datos:", {
        id_tarea: idTarea,
        id_usuario: usuario.id,
        tipo_gasto: formData.tipo_gasto,
        monto: monto,
        descripcion: formData.descripcion,
        comprobante_url: comprobanteUrl,
        fecha_gasto: formData.fecha_gasto,
      })

      // Guardar gasto
      const { error } = await supabase.from("gastos_tarea").insert({
        id_tarea: idTarea,
        id_usuario: usuario.id,
        tipo_gasto: formData.tipo_gasto,
        monto: monto,
        descripcion: formData.descripcion,
        comprobante_url: comprobanteUrl,
        fecha_gasto: formData.fecha_gasto,
        liquidado: false, // Inicializamos el gasto como no liquidado
        id_liquidacion: null // Sin liquidación asociada inicialmente
      })

      if (error) throw error

      toast.success("Gasto registrado correctamente")
      onSuccess()
    } catch (error: any) {
      console.error("Error guardando gasto:", error)
      toast.error(error.message || "Error al guardar el gasto")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-3">
        <CardTitle>Registrar Gasto de Material</CardTitle>
        <CardDescription>
          Completa el formulario para registrar un nuevo gasto relacionado con la tarea
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label htmlFor="id_tarea">Tarea</Label>
          <Select
            value={formData.id_tarea}
            onValueChange={(value) => setFormData({ ...formData, id_tarea: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tarea" />
            </SelectTrigger>
            <SelectContent>
              {tareas.map((tarea) => (
                <SelectItem key={tarea.id} value={tarea.id.toString()}>
                  {tarea.code} - {tarea.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!formData.id_tarea ? (
          <div className="text-center p-4 bg-yellow-50 rounded-lg mb-4">
            <p className="text-amber-700">Selecciona una tarea para continuar</p>
          </div>
        ) : (
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="mt-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">
                Manual
              </TabsTrigger>
              <TabsTrigger value="ocr">
                Escanear (OCR)
              </TabsTrigger>
            </TabsList>
            
            {/* Pestaña para ingreso manual */}
            <TabsContent value="manual" className="mt-4">
              <div className="mb-4">
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

              <div className="grid gap-4 md:grid-cols-2 mb-4">
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

              <div className="mb-4">
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
            </TabsContent>
            
            {/* Pestaña para OCR */}
            <TabsContent value="ocr" className="mt-4">
              {tareaSeleccionada && (
                <OCRSimple 
                  tareaId={Number(formData.id_tarea)} 
                  tareaCodigo={tareaSeleccionada.code}
                  tareaTitulo={tareaSeleccionada.titulo}
                  onDatosRecibidos={(monto, descripcion) => {
                    console.log("Datos recibidos del OCR:", monto, descripcion);
                    setFormData(prev => ({
                      ...prev,
                      monto,
                      descripcion
                    }));
                    setActiveTab("manual");
                    toast.success("Datos capturados con OCR. Por favor complete el formulario.");
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
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
