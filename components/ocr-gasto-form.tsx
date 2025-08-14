"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Camera, Upload, X, Check, Loader2, Scan } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Tesseract from "tesseract.js"

interface OCRGastoFormProps {
  tareaId: number
  tareaNombre: string
  tareaCode: string
  usuarioId: string
  onClose: () => void
  onSuccess: () => void
}

interface DatosOCR {
  monto: number | null
  descripcion: string
  confianza: number
  textoCompleto: string
}

export function OCRGastoForm({ tareaId, tareaNombre, tareaCode, usuarioId, onClose, onSuccess }: OCRGastoFormProps) {
  const [paso, setPaso] = useState<"captura" | "procesando" | "confirmacion" | "guardando">("captura")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [previsualizacion, setPrevisualizacion] = useState<string | null>(null)
  const [datosOCR, setDatosOCR] = useState<DatosOCR | null>(null)
  const [formData, setFormData] = useState({
    tipo_gasto: "material",
    monto: "",
    descripcion: "",
    fecha_gasto: new Date().toISOString().split("T")[0],
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientComponentClient()

  const tiposGasto = [
    { value: "material", label: "Material de construcción" },
    { value: "herramienta", label: "Herramientas" },
    { value: "transporte", label: "Transporte" },
    { value: "otro", label: "Otro" },
  ]

  // Procesar imagen con OCR
  const procesarImagenOCR = async (file: File) => {
    setPaso("procesando")

    try {
      // Configuración optimizada para facturas en español
      const {
        data: { text, confidence },
      } = await Tesseract.recognize(file, "spa", {
        logger: (m) => console.log(m),
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚáéíóúÑñ.,-$() \n",
      })

      // Extraer información relevante
      const datosExtraidos = extraerDatosFactura(text)

      setDatosOCR({
        ...datosExtraidos,
        confianza: confidence,
        textoCompleto: text,
      })

      // Pre-llenar formulario con datos detectados
      setFormData((prev) => ({
        ...prev,
        monto: datosExtraidos.monto?.toString() || "",
        descripcion: datosExtraidos.descripcion || "",
      }))

      setPaso("confirmacion")
    } catch (error) {
      console.error("Error en OCR:", error)
      toast({
        title: "Error en OCR",
        description: "No se pudo procesar la imagen. Intenta con otra foto.",
        variant: "destructive",
      })
      setPaso("captura")
    }
  }

  // Extraer datos relevantes de la factura
  const extraerDatosFactura = (texto: string): Omit<DatosOCR, "confianza" | "textoCompleto"> => {
    const lineas = texto
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    // Buscar monto total (patrones comunes)
    let monto: number | null = null
    const patronesMonto = [
      /total[:\s]*\$?\s*([0-9.,]+)/i,
      /importe[:\s]*\$?\s*([0-9.,]+)/i,
      /suma[:\s]*\$?\s*([0-9.,]+)/i,
      /\$\s*([0-9.,]+)/g,
      /([0-9.,]+)\s*pesos/i,
    ]

    for (const patron of patronesMonto) {
      const matches = texto.match(patron)
      if (matches) {
        const montoStr = matches[1] || matches[0]
        const montoNum = Number.parseFloat(montoStr.replace(/[.,]/g, "").replace(/[^0-9]/g, ""))
        if (montoNum > 0) {
          monto = montoNum
          break
        }
      }
    }

    // Buscar descripción (primeras líneas que no sean números)
    let descripcion = ""
    for (const linea of lineas.slice(0, 5)) {
      if (!/^[\d\s.,\-$]+$/.test(linea) && linea.length > 3) {
        descripcion = linea
        break
      }
    }

    return { monto, descripcion }
  }

  // Manejar selección de archivo
  const manejarArchivoSeleccionado = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validaciones
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Archivo inválido",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive",
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB
      toast({
        title: "Archivo muy grande",
        description: "El archivo no puede ser mayor a 10MB",
        variant: "destructive",
      })
      return
    }

    setArchivo(file)

    // Crear previsualización
    const reader = new FileReader()
    reader.onload = (e) => {
      setPrevisualizacion(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Procesar automáticamente
    procesarImagenOCR(file)
  }

  // Guardar gasto
  const guardarGasto = async () => {
    if (!formData.monto || !formData.descripcion) {
      toast({
        title: "Campos requeridos",
        description: "El monto y la descripción son obligatorios",
        variant: "destructive",
      })
      return
    }

    setPaso("guardando")

    try {
      // Subir imagen a Supabase Storage
      let comprobanteUrl = ""
      if (archivo) {
        const extension = archivo.name.split(".").pop()
        const nombreArchivo = `gastos/${usuarioId}/${Date.now()}.${extension}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("comprobantes")
          .upload(nombreArchivo, archivo)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from("comprobantes").getPublicUrl(nombreArchivo)

        comprobanteUrl = urlData.publicUrl
      }

      // Guardar gasto en la base de datos
      const { error } = await supabase.from("gastos_tarea").insert({
        id_tarea: tareaId,
        id_usuario: usuarioId,
        tipo_gasto: formData.tipo_gasto,
        monto: Number.parseFloat(formData.monto),
        descripcion: formData.descripcion,
        comprobante_url: comprobanteUrl,
        fecha_gasto: formData.fecha_gasto,
        metodo_registro: "ocr", // Nuevo campo para identificar origen
        datos_ocr: datosOCR ? JSON.stringify(datosOCR) : null, // Guardar datos OCR para auditoría
      })

      if (error) throw error

      toast({
        title: "Gasto registrado",
        description: "El gasto se ha registrado correctamente con OCR",
      })

      onSuccess()
    } catch (error: any) {
      console.error("Error guardando gasto:", error)
      toast({
        title: "Error",
        description: error.message || "Error al guardar el gasto",
        variant: "destructive",
      })
      setPaso("confirmacion")
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Registrar Gasto con OCR
            </CardTitle>
            <CardDescription>
              Tarea: {tareaCode} - {tareaNombre}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Paso 1: Captura */}
        {paso === "captura" && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Fotografía tu factura</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Toma una foto clara de la factura. El sistema detectará automáticamente el monto y descripción.
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Seleccionar Imagen
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={manejarArchivoSeleccionado}
                />
              </div>
            </div>
          </div>
        )}

        {/* Paso 2: Procesando */}
        {paso === "procesando" && (
          <div className="text-center py-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Procesando imagen...</h3>
            <p className="text-sm text-muted-foreground">Extrayendo información de la factura con OCR</p>
          </div>
        )}

        {/* Paso 3: Confirmación */}
        {paso === "confirmacion" && (
          <div className="space-y-6">
            {/* Previsualización de imagen */}
            {previsualizacion && (
              <div>
                <Label>Imagen capturada</Label>
                <img
                  src={previsualizacion || "/placeholder.svg"}
                  alt="Factura"
                  className="w-full max-h-64 object-contain rounded-lg border mt-2"
                />
              </div>
            )}

            {/* Datos detectados por OCR */}
            {datosOCR && (
              <Card className="bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Datos detectados automáticamente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Confianza OCR:</span>
                    <Badge variant={datosOCR.confianza > 80 ? "default" : "secondary"}>
                      {datosOCR.confianza.toFixed(1)}%
                    </Badge>
                  </div>
                  {datosOCR.monto && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Monto detectado:</span>
                      <span className="text-sm">${datosOCR.monto.toLocaleString()}</span>
                    </div>
                  )}
                  {datosOCR.descripcion && (
                    <div>
                      <span className="text-sm font-medium">Descripción detectada:</span>
                      <p className="text-sm text-muted-foreground">{datosOCR.descripcion}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Formulario editable */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo_gasto">Tipo de Gasto</Label>
                  <Select
                    value={formData.tipo_gasto}
                    onValueChange={(value) => setFormData({ ...formData, tipo_gasto: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposGasto.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Label htmlFor="monto">Monto *</Label>
                <Input
                  id="monto"
                  type="number"
                  placeholder="Ej: 25000"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="descripcion">Descripción *</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Describe el gasto realizado..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setPaso("captura")}>
                <Camera className="mr-2 h-4 w-4" />
                Tomar otra foto
              </Button>
              <Button onClick={guardarGasto} className="flex-1">
                <Check className="mr-2 h-4 w-4" />
                Confirmar y Guardar
              </Button>
            </div>
          </div>
        )}

        {/* Paso 4: Guardando */}
        {paso === "guardando" && (
          <div className="text-center py-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Guardando gasto...</h3>
            <p className="text-sm text-muted-foreground">Subiendo comprobante y registrando en la tarea</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
