"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useSupabase } from "@/lib/supabase-provider"
import { Camera, Check, Loader2, Receipt, RotateCcw, Upload, Zap, Edit3, ScanLine, Target } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import Tesseract from "tesseract.js"

interface AdvancedDocumentOCRProps {
  tareaId: number
  tareaCodigo: string
  tareaTitulo: string
}

interface DatosOCR {
  monto: number | null
  confianza: number
  textoCompleto: string
  coordenadasDocumento?: { x: number; y: number }[]
}

interface DocumentoBordes {
  detectado: boolean
  confianza: number
  esquinas: { x: number; y: number }[]
}

export function AdvancedDocumentOCR({ tareaId, tareaCodigo, tareaTitulo }: AdvancedDocumentOCRProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [metodo, setMetodo] = useState<"ocr" | "manual">("ocr")
  const [paso, setPaso] = useState<"captura" | "detectando" | "procesando" | "confirmacion" | "guardando">("captura")

  // Estados para imágenes
  const [imagenOriginal, setImagenOriginal] = useState<string | null>(null)
  const [imagenProcesada, setImagenProcesada] = useState<string | null>(null)
  const [documentoDetectado, setDocumentoDetectado] = useState<DocumentoBordes | null>(null)

  // Estados para datos
  const [datosOCR, setDatosOCR] = useState<DatosOCR | null>(null)
  const [formData, setFormData] = useState({
    monto: "",
    descripcion: "",
    fecha_gasto: new Date().toISOString().split("T")[0],
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasDeteccionRef = useRef<HTMLCanvasElement>(null)
  const { supabase, user } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  // Cargar OpenCV cuando el componente se monta
  useEffect(() => {
    const loadOpenCV = async () => {
      if (typeof window !== "undefined" && !window.cv) {
        const script = document.createElement("script")
        script.src = "https://docs.opencv.org/4.8.0/opencv.js"
        script.async = true
        script.onload = () => {
          console.log("OpenCV.js cargado correctamente")
        }
        document.head.appendChild(script)
      }
    }
    loadOpenCV()
  }, [])

  // Detector de documentos con OpenCV
  const detectarDocumento = useCallback(async (imageElement: HTMLImageElement): Promise<DocumentoBordes> => {
    return new Promise((resolve) => {
      if (!window.cv) {
        resolve({ detectado: false, confianza: 0, esquinas: [] })
        return
      }

      try {
        const canvas = canvasDeteccionRef.current!
        const ctx = canvas.getContext("2d")!

        canvas.width = imageElement.width
        canvas.height = imageElement.height
        ctx.drawImage(imageElement, 0, 0)

        // Convertir a Mat de OpenCV
        const src = window.cv.imread(canvas)
        const gray = new window.cv.Mat()
        const blur = new window.cv.Mat()
        const edges = new window.cv.Mat()

        // Preprocesamiento
        window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY)
        window.cv.GaussianBlur(gray, blur, new window.cv.Size(5, 5), 0)
        window.cv.Canny(blur, edges, 50, 150)

        // Encontrar contornos
        const contours = new window.cv.MatVector()
        const hierarchy = new window.cv.Mat()
        window.cv.findContours(edges, contours, hierarchy, window.cv.RETR_EXTERNAL, window.cv.CHAIN_APPROX_SIMPLE)

        let mejorContorno = null
        let mayorArea = 0
        const areaMinima = imageElement.width * imageElement.height * 0.1 // 10% del área total

        // Buscar el contorno más grande que podría ser un documento
        for (let i = 0; i < contours.size(); i++) {
          const contorno = contours.get(i)
          const area = window.cv.contourArea(contorno)

          if (area > mayorArea && area > areaMinima) {
            // Aproximar contorno a polígono
            const epsilon = 0.02 * window.cv.arcLength(contorno, true)
            const approx = new window.cv.Mat()
            window.cv.approxPolyDP(contorno, approx, epsilon, true)

            // Si tiene 4 vértices, podría ser un documento
            if (approx.rows === 4) {
              mejorContorno = approx
              mayorArea = area
            }
          }
        }

        if (mejorContorno) {
          // Extraer esquinas
          const esquinas = []
          for (let i = 0; i < mejorContorno.rows; i++) {
            const punto = mejorContorno.data32S.slice(i * 2, i * 2 + 2)
            esquinas.push({ x: punto[0], y: punto[1] })
          }

          // Calcular confianza basada en el área
          const confianza = Math.min(95, (mayorArea / (imageElement.width * imageElement.height)) * 100)

          // Limpiar memoria
          src.delete()
          gray.delete()
          blur.delete()
          edges.delete()
          contours.delete()
          hierarchy.delete()

          resolve({
            detectado: true,
            confianza: confianza,
            esquinas: esquinas,
          })
        } else {
          // Limpiar memoria
          src.delete()
          gray.delete()
          blur.delete()
          edges.delete()
          contours.delete()
          hierarchy.delete()

          resolve({ detectado: false, confianza: 0, esquinas: [] })
        }
      } catch (error) {
        console.error("Error en detección de documento:", error)
        resolve({ detectado: false, confianza: 0, esquinas: [] })
      }
    })
  }, [])

  // Corregir perspectiva del documento
  const corregirPerspectiva = useCallback(
    (imageElement: HTMLImageElement, esquinas: { x: number; y: number }[]): string => {
      if (!window.cv || esquinas.length !== 4) {
        return imageElement.src
      }

      try {
        const canvas = canvasRef.current!
        const ctx = canvas.getContext("2d")!

        canvas.width = imageElement.width
        canvas.height = imageElement.height
        ctx.drawImage(imageElement, 0, 0)

        const src = window.cv.imread(canvas)

        // Ordenar esquinas: top-left, top-right, bottom-right, bottom-left
        const esquinasOrdenadas = esquinas.sort((a, b) => a.y - b.y)
        const arriba = esquinasOrdenadas.slice(0, 2).sort((a, b) => a.x - b.x)
        const abajo = esquinasOrdenadas.slice(2, 4).sort((a, b) => a.x - b.x)

        const puntosFuente = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
          arriba[0].x,
          arriba[0].y, // top-left
          arriba[1].x,
          arriba[1].y, // top-right
          abajo[1].x,
          abajo[1].y, // bottom-right
          abajo[0].x,
          abajo[0].y, // bottom-left
        ])

        // Calcular dimensiones del documento corregido
        const ancho = Math.max(
          Math.sqrt(Math.pow(arriba[1].x - arriba[0].x, 2) + Math.pow(arriba[1].y - arriba[0].y, 2)),
          Math.sqrt(Math.pow(abajo[1].x - abajo[0].x, 2) + Math.pow(abajo[1].y - abajo[0].y, 2)),
        )
        const alto = Math.max(
          Math.sqrt(Math.pow(abajo[0].x - arriba[0].x, 2) + Math.pow(abajo[0].y - arriba[0].y, 2)),
          Math.sqrt(Math.pow(abajo[1].x - arriba[1].x, 2) + Math.pow(abajo[1].y - arriba[1].y, 2)),
        )

        const puntosDestino = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [0, 0, ancho, 0, ancho, alto, 0, alto])

        // Aplicar transformación de perspectiva
        const matriz = window.cv.getPerspectiveTransform(puntosFuente, puntosDestino)
        const dst = new window.cv.Mat()
        window.cv.warpPerspective(src, dst, matriz, new window.cv.Size(ancho, alto))

        // Convertir resultado a canvas
        const canvasResultado = document.createElement("canvas")
        canvasResultado.width = ancho
        canvasResultado.height = alto
        window.cv.imshow(canvasResultado, dst)

        // Limpiar memoria
        src.delete()
        dst.delete()
        matriz.delete()
        puntosFuente.delete()
        puntosDestino.delete()

        return canvasResultado.toDataURL("image/jpeg", 0.9)
      } catch (error) {
        console.error("Error en corrección de perspectiva:", error)
        return imageElement.src
      }
    },
    [],
  )

  // Optimizar imagen para OCR
  const optimizarParaOCR = useCallback((imagenSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current!
        const ctx = canvas.getContext("2d")!

        // Redimensionar manteniendo aspecto (máximo 1200px)
        const maxSize = 1200
        let { width, height } = img

        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        // Mejorar contraste y nitidez
        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data

        for (let i = 0; i < data.length; i += 4) {
          // Convertir a escala de grises
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114

          // Aumentar contraste
          const contrasted = gray > 128 ? Math.min(255, gray * 1.3) : Math.max(0, gray * 0.7)

          data[i] = contrasted // R
          data[i + 1] = contrasted // G
          data[i + 2] = contrasted // B
          // Alpha se mantiene
        }

        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL("image/jpeg", 0.95))
      }
      img.src = imagenSrc
    })
  }, [])

  // Extraer monto total de la factura
  const extraerMontoTotal = useCallback((texto: string): { monto: number | null; confianza: number } => {
    const lineas = texto
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    // Patrones específicos para monto total
    const patronesTotal = [
      /(?:total|importe\s+total|suma\s+total|monto\s+total|gran\s+total)[\s:]*\$?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/i,
      /(?:^|\s)total[\s:]*\$?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/i,
      /\$\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)(?:\s*$|\s+total)/i,
    ]

    let montoEncontrado: number | null = null
    let confianzaMaxima = 0

    // Buscar en las últimas líneas (donde suele estar el total)
    const lineasFinales = lineas.slice(-8)

    for (const patron of patronesTotal) {
      for (const linea of lineasFinales) {
        const match = linea.match(patron)
        if (match) {
          const montoStr = match[1]
          const montoLimpio = montoStr.replace(/[^\d.,]/g, "").replace(/,/g, ".")
          const monto = Number.parseFloat(montoLimpio)

          if (monto > 0 && monto < 10000000) {
            // Límite razonable
            // Calcular confianza basada en la posición y patrón
            let confianza = 60
            if (linea.toLowerCase().includes("total")) confianza += 30
            if (linea.includes("$")) confianza += 10

            if (confianza > confianzaMaxima) {
              montoEncontrado = monto
              confianzaMaxima = confianza
            }
          }
        }
      }
    }

    // Si no encuentra con patrones específicos, buscar el monto más grande
    if (!montoEncontrado) {
      const patronGeneral = /\$?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/g
      let montoMaximo = 0

      for (const linea of lineasFinales) {
        const matches = [...linea.matchAll(patronGeneral)]
        for (const match of matches) {
          const montoStr = match[1]
          const montoLimpio = montoStr.replace(/[^\d.,]/g, "").replace(/,/g, ".")
          const monto = Number.parseFloat(montoLimpio)

          if (monto > montoMaximo && monto < 10000000) {
            montoMaximo = monto
          }
        }
      }

      if (montoMaximo > 0) {
        montoEncontrado = montoMaximo
        confianzaMaxima = 40 // Menor confianza para búsqueda general
      }
    }

    return { monto: montoEncontrado, confianza: confianzaMaxima }
  }, [])

  // Procesar imagen con OCR
  const procesarConOCR = useCallback(
    async (imagenOptimizada: string) => {
      setPaso("procesando")

      try {
        const {
          data: { text, confidence },
        } = await Tesseract.recognize(imagenOptimizada, "spa", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
            }
          },
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
          tessedit_char_whitelist:
            "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚáéíóúÑñ.,-$() \n",
          tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
        })

        const { monto, confianza } = extraerMontoTotal(text)

        const datosOCRCompletos: DatosOCR = {
          monto,
          confianza: Math.min(confidence, confianza),
          textoCompleto: text,
        }

        setDatosOCR(datosOCRCompletos)

        // Pre-llenar formulario
        setFormData((prev) => ({
          ...prev,
          monto: monto?.toString() || "",
          descripcion: prev.descripcion || "Material de construcción",
        }))

        setPaso("confirmacion")
      } catch (error) {
        console.error("Error en OCR:", error)
        toast({
          title: "Error en OCR",
          description: "No se pudo procesar la imagen. Intenta con otra foto más clara.",
          variant: "destructive",
        })
        setPaso("captura")
      }
    },
    [extraerMontoTotal, toast],
  )

  // Manejar captura de imagen
  const manejarCaptura = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Validaciones
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Archivo inválido",
          description: "Solo se permiten imágenes",
          variant: "destructive",
        })
        return
      }

      if (file.size > 15 * 1024 * 1024) {
        toast({
          title: "Imagen muy grande",
          description: "La imagen no puede ser mayor a 15MB",
          variant: "destructive",
        })
        return
      }

      const imagenUrl = URL.createObjectURL(file)
      setImagenOriginal(imagenUrl)

      if (metodo === "ocr") {
        setPaso("detectando")

        // Cargar imagen para procesamiento
        const img = new Image()
        img.onload = async () => {
          try {
            // Detectar documento
            const documento = await detectarDocumento(img)
            setDocumentoDetectado(documento)

            let imagenParaProcesar = imagenUrl

            // Si se detectó documento, corregir perspectiva
            if (documento.detectado && documento.esquinas.length === 4) {
              imagenParaProcesar = corregirPerspectiva(img, documento.esquinas)
              setImagenProcesada(imagenParaProcesar)
            }

            // Optimizar para OCR
            const imagenOptimizada = await optimizarParaOCR(imagenParaProcesar)

            // Procesar con OCR
            await procesarConOCR(imagenOptimizada)
          } catch (error) {
            console.error("Error procesando imagen:", error)
            toast({
              title: "Error",
              description: "Error al procesar la imagen",
              variant: "destructive",
            })
            setPaso("captura")
          }
        }
        img.src = imagenUrl
      } else {
        // Modo manual - ir directo a confirmación
        setPaso("confirmacion")
      }
    },
    [metodo, detectarDocumento, corregirPerspectiva, optimizarParaOCR, procesarConOCR, toast],
  )

  // Guardar gasto
  const guardarGasto = useCallback(async () => {
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
      // Subir imagen original
      const imagenParaSubir = imagenOriginal!
      const response = await fetch(imagenParaSubir)
      const blob = await response.blob()

      const extension = "jpg"
      const nombreArchivo = `gastos/${user?.id}/${Date.now()}.${extension}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("spc-files")
        .upload(nombreArchivo, blob)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from("spc-files").getPublicUrl(nombreArchivo)

      // Subir imagen procesada si existe
      let imagenProcesadaUrl = null
      if (imagenProcesada) {
        const responseProcesada = await fetch(imagenProcesada)
        const blobProcesada = await responseProcesada.blob()
        const nombreProcesada = `gastos/${user?.id}/${Date.now()}_procesada.${extension}`

        const { error: errorProcesada } = await supabase.storage
          .from("spc-files")
          .upload(nombreProcesada, blobProcesada)

        if (!errorProcesada) {
          const { data: urlProcesada } = supabase.storage.from("spc-files").getPublicUrl(nombreProcesada)
          imagenProcesadaUrl = urlProcesada.publicUrl
        }
      }

      // Guardar gasto en base de datos
      const { error } = await supabase.from("gastos_tarea").insert({
        id_tarea: tareaId,
        id_usuario: user?.id,
        tipo_gasto: "material",
        monto: Number.parseFloat(formData.monto),
        descripcion: formData.descripcion,
        comprobante_url: urlData.publicUrl,
        fecha_gasto: formData.fecha_gasto,
        metodo_registro: metodo === "ocr" ? "ocr_automatico" : "manual",
        datos_ocr: datosOCR
          ? JSON.stringify({
              ...datosOCR,
              documentoDetectado,
            })
          : null,
        confianza_ocr: datosOCR?.confianza || null,
        imagen_procesada_url: imagenProcesadaUrl,
      })

      if (error) throw error

      toast({
        title: "✅ Gasto registrado",
        description: `$${Number.parseFloat(formData.monto).toLocaleString()} registrado correctamente`,
      })

      // Resetear y cerrar
      reiniciar()
      setIsOpen(false)
      router.refresh()
    } catch (error: any) {
      console.error("Error guardando gasto:", error)
      toast({
        title: "Error",
        description: error.message || "Error al guardar el gasto",
        variant: "destructive",
      })
      setPaso("confirmacion")
    }
  }, [
    formData,
    imagenOriginal,
    imagenProcesada,
    datosOCR,
    documentoDetectado,
    metodo,
    tareaId,
    user?.id,
    supabase,
    toast,
    router,
  ])

  const reiniciar = useCallback(() => {
    setPaso("captura")
    setImagenOriginal(null)
    setImagenProcesada(null)
    setDocumentoDetectado(null)
    setDatosOCR(null)
    setFormData({
      monto: "",
      descripcion: "",
      fecha_gasto: new Date().toISOString().split("T")[0],
    })
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={canvasDeteccionRef} className="hidden" />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Receipt className="mr-2 h-4 w-4" />
            Registrar Gasto
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Gasto - {tareaCodigo}
            </DialogTitle>
            <DialogDescription>{tareaTitulo}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selección de método */}
            {paso === "captura" && (
              <div className="space-y-4">
                <Tabs value={metodo} onValueChange={(value) => setMetodo(value as "ocr" | "manual")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="ocr" className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      OCR Automático
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="flex items-center gap-2">
                      <Edit3 className="h-4 w-4" />
                      Manual
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="ocr" className="space-y-4">
                    <Card className="bg-blue-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-500" />
                          OCR con Detector de Documentos
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <ScanLine className="h-4 w-4" />
                          <span>Detecta automáticamente el documento</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          <span>Corrige la perspectiva</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          <span>Extrae el monto total automáticamente</span>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="manual" className="space-y-4">
                    <Card className="bg-green-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Edit3 className="h-4 w-4 text-green-500" />
                          Registro Manual
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          <span>Sube la foto del comprobante</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Edit3 className="h-4 w-4" />
                          <span>Ingresa el monto manualmente</span>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                <div className="text-center border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <Camera className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <h3 className="font-medium mb-2">
                    {metodo === "ocr" ? "Fotografía la factura" : "Sube el comprobante"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {metodo === "ocr"
                      ? "El sistema detectará y extraerá el monto automáticamente"
                      : "Luego ingresa el monto manualmente"}
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()} className="w-full">
                    <Camera className="mr-2 h-4 w-4" />
                    {metodo === "ocr" ? "Escanear con OCR" : "Subir Imagen"}
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
              </div>
            )}

            {/* Detectando documento */}
            {paso === "detectando" && (
              <div className="text-center py-8">
                <div className="relative">
                  <ScanLine className="mx-auto h-12 w-12 animate-pulse text-blue-500 mb-4" />
                  <div className="absolute inset-0 animate-ping">
                    <ScanLine className="mx-auto h-12 w-12 text-blue-300" />
                  </div>
                </div>
                <h3 className="font-medium mb-2">Detectando documento...</h3>
                <p className="text-sm text-muted-foreground">Analizando bordes y corrigiendo perspectiva</p>
              </div>
            )}

            {/* Procesando OCR */}
            {paso === "procesando" && (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500 mb-4" />
                <h3 className="font-medium mb-2">Extrayendo monto...</h3>
                <p className="text-sm text-muted-foreground">Procesando texto con OCR</p>
              </div>
            )}

            {/* Confirmación */}
            {paso === "confirmacion" && (
              <div className="space-y-4">
                {/* Imagen capturada */}
                {imagenOriginal && (
                  <div>
                    <Label>Imagen capturada</Label>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      <img
                        src={imagenOriginal || "/placeholder.svg"}
                        alt="Original"
                        className="w-full max-h-32 object-contain rounded-lg border"
                      />
                      {imagenProcesada && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Imagen procesada</Label>
                          <img
                            src={imagenProcesada || "/placeholder.svg"}
                            alt="Procesada"
                            className="w-full max-h-32 object-contain rounded-lg border"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Resultados de detección y OCR */}
                {metodo === "ocr" && (documentoDetectado || datosOCR) && (
                  <Card className="bg-blue-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Resultados del análisis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {documentoDetectado && (
                        <div className="flex justify-between text-sm">
                          <span>Documento detectado:</span>
                          <Badge variant={documentoDetectado.detectado ? "default" : "secondary"}>
                            {documentoDetectado.detectado ? "Sí" : "No"}
                          </Badge>
                        </div>
                      )}
                      {datosOCR && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Precisión OCR:</span>
                            <Badge variant={datosOCR.confianza > 70 ? "default" : "secondary"}>
                              {datosOCR.confianza.toFixed(0)}%
                            </Badge>
                          </div>
                          {datosOCR.monto && (
                            <div className="flex justify-between text-sm">
                              <span>Monto detectado:</span>
                              <span className="font-medium">${datosOCR.monto.toLocaleString()}</span>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Formulario editable */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="monto">Monto Total *</Label>
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
                      placeholder="Describe el material comprado..."
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="fecha_gasto">Fecha</Label>
                    <Input
                      id="fecha_gasto"
                      type="date"
                      value={formData.fecha_gasto}
                      onChange={(e) => setFormData({ ...formData, fecha_gasto: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={reiniciar} size="sm">
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Nueva foto
                  </Button>
                  <Button onClick={guardarGasto} className="flex-1" size="sm">
                    <Check className="mr-1 h-4 w-4" />
                    Guardar Gasto
                  </Button>
                </div>
              </div>
            )}

            {/* Guardando */}
            {paso === "guardando" && (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-green-500 mb-4" />
                <h3 className="font-medium mb-2">Guardando...</h3>
                <p className="text-sm text-muted-foreground">Subiendo comprobante y registrando gasto</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
