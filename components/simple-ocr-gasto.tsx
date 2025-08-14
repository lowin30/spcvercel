"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useSupabase } from "@/lib/supabase-provider"
import { Camera, Check, Loader2, Receipt, X, Edit3 } from "lucide-react"
import { useRouter } from "next/navigation"
import Tesseract from "tesseract.js"
import { toast } from "sonner"

interface SimpleOCRGastoProps {
  tareaId: number
  tareaCodigo: string
  tareaTitulo: string
}

export function SimpleOCRGasto({ tareaId, tareaCodigo, tareaTitulo }: SimpleOCRGastoProps) {
  const [modo, setModo] = useState<"seleccion" | "ocr" | "manual">("seleccion")
  const [paso, setPaso] = useState<"captura" | "procesando" | "confirmacion" | "guardando">("captura")
  const [imagen, setImagen] = useState<string | null>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [datosOCR, setDatosOCR] = useState<{ monto: number | null; confianza: number } | null>(null)
  const [formData, setFormData] = useState({
    monto: "",
    descripcion: "",
    fecha_gasto: new Date().toISOString().split("T")[0],
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { supabase, user } = useSupabase()
  const router = useRouter()

  // Extraer monto de texto OCR
  const extraerMonto = (texto: string): { monto: number | null; confianza: number } => {
    const lineas = texto.split("\n").filter((l) => l.trim().length > 0)
    const patrones = [/total[:\s]*\$?\s*([0-9.,]+)/i, /\$\s*([0-9.,]+)/g, /([0-9.,]+)\s*pesos/i]

    let montoEncontrado: number | null = null
    let confianza = 0

    for (const patron of patrones) {
      for (const linea of lineas) {
        const match = linea.match(patron)
        if (match) {
          const montoStr = match[1]
          const monto = Number.parseFloat(montoStr.replace(/[^\d.]/g, ""))
          if (monto > 0 && monto < 10000000) {
            montoEncontrado = monto
            confianza = linea.toLowerCase().includes("total") ? 80 : 60
            break
          }
        }
      }
      if (montoEncontrado) break
    }

    return { monto: montoEncontrado, confianza }
  }

  // Procesar imagen con OCR
  const procesarOCR = async (file: File) => {
    setPaso("procesando")
    try {
      const {
        data: { text, confidence },
      } = await Tesseract.recognize(file, "spa")
      const { monto, confianza } = extraerMonto(text)
      setDatosOCR({ monto, confianza: Math.min(confidence, confianza) })
      setFormData((prev) => ({
        ...prev,
        monto: monto?.toString() || "",
        descripcion: prev.descripcion || "Material de construcción",
      }))
      setPaso("confirmacion")
    } catch (error) {
      toast.error("Error en OCR")
      setPaso("captura")
    }
  }

  // Manejar captura de imagen
  const manejarCaptura = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes")
      return
    }
    setArchivo(file)
    setImagen(URL.createObjectURL(file))
    await procesarOCR(file)
  }

  // Guardar gasto
  const guardarGasto = async () => {
    if (!formData.monto || !formData.descripcion) {
      toast.error("El monto y descripción son obligatorios")
      return
    }

    setPaso("guardando")
    try {
      let comprobanteUrl = ""
      if (archivo) {
        const nombreArchivo = `gastos/${user?.id}/${Date.now()}.jpg`
        const { data, error } = await supabase.storage.from("spc-files").upload(nombreArchivo, archivo)
        if (error) throw error
        const { data: urlData } = supabase.storage.from("spc-files").getPublicUrl(nombreArchivo)
        comprobanteUrl = urlData.publicUrl
      }

      const { error } = await supabase.from("gastos_tarea").insert({
        id_tarea: tareaId,
        id_usuario: user?.id,
        tipo_gasto: "material",
        monto: Number.parseFloat(formData.monto),
        descripcion: formData.descripcion,
        comprobante_url: comprobanteUrl,
        fecha_gasto: formData.fecha_gasto,
        metodo_registro: modo === "ocr" ? "ocr_automatico" : "manual",
        confianza_ocr: datosOCR?.confianza || null,
        datos_ocr: datosOCR ? JSON.stringify(datosOCR) : null,
      })

      if (error) throw error
      toast.success(`✅ Gasto de $${Number.parseFloat(formData.monto).toLocaleString()} registrado`)
      reiniciar()
      router.refresh()
    } catch (error: any) {
      toast.error("Error al guardar")
      setPaso("confirmacion")
    }
  }

  const reiniciar = () => {
    setModo("seleccion")
    setPaso("captura")
    setImagen(null)
    setArchivo(null)
    setDatosOCR(null)
    setFormData({
      monto: "",
      descripcion: "",
      fecha_gasto: new Date().toISOString().split("T")[0],
    })
  }

  // Pantalla de selección
  if (modo === "seleccion") {
    return (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => setModo("ocr")}>
          <Camera className="mr-2 h-4 w-4" />
          Con Foto (OCR)
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => setModo("manual")}>
          <Edit3 className="mr-2 h-4 w-4" />
          Manual
        </Button>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {modo === "ocr" ? "Gasto con OCR" : "Gasto Manual"} - {tareaCodigo}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={reiniciar}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* MODO OCR */}
        {modo === "ocr" && (
          <>
            {paso === "captura" && (
              <div className="text-center border-2 border-dashed border-blue-300 rounded-lg p-6">
                <Camera className="mx-auto h-12 w-12 text-blue-500 mb-3" />
                <h3 className="font-medium mb-2">Fotografía la factura</h3>
                <p className="text-sm text-muted-foreground mb-4">El OCR extraerá el monto automáticamente</p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Camera className="mr-2 h-4 w-4" />
                  Tomar Foto
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={manejarCaptura}
                />
              </div>
            )}

            {paso === "procesando" && (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500 mb-4" />
                <h3 className="font-medium mb-2">Procesando imagen...</h3>
                <p className="text-sm text-muted-foreground">Extrayendo monto con OCR</p>
              </div>
            )}

            {paso === "confirmacion" && (
              <div className="space-y-4">
                {imagen && (
                  <div>
                    <Label>Imagen capturada</Label>
                    <img
                      src={imagen || "/placeholder.svg"}
                      alt="Factura"
                      className="w-full max-h-48 object-contain rounded-lg border mt-2"
                    />
                  </div>
                )}

                {datosOCR && (
                  <Card className="bg-blue-50">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">OCR detectó:</span>
                        <div className="flex gap-2">
                          {datosOCR.monto && <Badge variant="default">${datosOCR.monto.toLocaleString()}</Badge>}
                          <Badge variant="outline">{datosOCR.confianza.toFixed(0)}%</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="monto">Monto *</Label>
                    <Input
                      id="monto"
                      type="number"
                      placeholder="25000"
                      value={formData.monto}
                      onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="descripcion">Descripción *</Label>
                    <Textarea
                      id="descripcion"
                      placeholder="Describe el material..."
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fecha">Fecha</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={formData.fecha_gasto}
                      onChange={(e) => setFormData({ ...formData, fecha_gasto: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPaso("captura")} size="sm">
                    Nueva foto
                  </Button>
                  <Button onClick={guardarGasto} className="flex-1" size="sm">
                    <Check className="mr-1 h-4 w-4" />
                    Guardar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* MODO MANUAL */}
        {modo === "manual" && (
          <div className="space-y-4">
            <div className="text-center border-2 border-dashed border-green-300 rounded-lg p-4">
              <Edit3 className="mx-auto h-8 w-8 text-green-500 mb-2" />
              <h3 className="font-medium">Registro Manual</h3>
              <p className="text-sm text-muted-foreground">Ingresa los datos directamente</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="monto-manual">Monto *</Label>
                <Input
                  id="monto-manual"
                  type="number"
                  placeholder="25000"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="descripcion-manual">Descripción *</Label>
                <Textarea
                  id="descripcion-manual"
                  placeholder="Describe el gasto..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="fecha-manual">Fecha</Label>
                <Input
                  id="fecha-manual"
                  type="date"
                  value={formData.fecha_gasto}
                  onChange={(e) => setFormData({ ...formData, fecha_gasto: e.target.value })}
                />
              </div>
            </div>

            <Button onClick={guardarGasto} className="w-full" size="sm">
              <Check className="mr-1 h-4 w-4" />
              Guardar Gasto
            </Button>
          </div>
        )}

        {/* Guardando */}
        {paso === "guardando" && (
          <div className="text-center py-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-green-500 mb-4" />
            <h3 className="font-medium mb-2">Guardando...</h3>
            <p className="text-sm text-muted-foreground">Registrando gasto</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
