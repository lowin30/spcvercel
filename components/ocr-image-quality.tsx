"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, Camera, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface OCRImageQualityProps {
  onImageSelected: (selectedFile: File | null) => void
  maxAttempts?: number
}

export function OCRImageQuality({ onImageSelected, maxAttempts = 3 }: OCRImageQualityProps) {
  const [capturedImages, setCapturedImages] = useState<Array<{file: File, quality: number, timestamp: string}>>([])
  const [attempts, setAttempts] = useState<number>(0)
  const [bestImage, setBestImage] = useState<{file: File, quality: number, timestamp: string} | null>(null)
  const [feedback, setFeedback] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Función para evaluar la calidad de la imagen usando Canvas
  const evaluateImageQuality = async (file: File): Promise<{score: number, isGoodQuality: boolean, feedback: string}> => {
    return new Promise((resolve) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = () => {
        if (!ctx) {
          resolve({
            score: 0,
            isGoodQuality: false,
            feedback: "No se pudo analizar la imagen. Intenta nuevamente."
          })
          return
        }

        // Configurar el canvas para coincidir con el tamaño de la imagen
        canvas.width = img.width
        canvas.height = img.height
        
        // Dibujar la imagen en el canvas
        ctx.drawImage(img, 0, 0, img.width, img.height)
        
        // Obtener datos de la imagen
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // Análisis de brillo
        let brightness = 0
        let contrastValues: number[] = []
        
        // Calcular brillo promedio y recopilar valores para contraste
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          
          // Fórmula estándar para brillo percibido
          const pixelBrightness = (0.299 * r + 0.587 * g + 0.114 * b)
          brightness += pixelBrightness
          contrastValues.push(pixelBrightness)
        }
        
        // Brillo promedio (0-255)
        brightness = brightness / (data.length / 4)
        
        // Calcular varianza para estimar contraste
        let variance = 0
        for (const value of contrastValues) {
          variance += Math.pow(value - brightness, 2)
        }
        variance = variance / contrastValues.length
        const stdDeviation = Math.sqrt(variance)
        
        // Calcular índice de nitidez usando variaciones locales
        let sharpnessScore = 0
        const sample = Math.min(5000, canvas.width * canvas.height / 4) // Limitar muestreo para rendimiento
        
        for (let i = 0; i < sample; i++) {
          const x = Math.floor(Math.random() * (canvas.width - 1))
          const y = Math.floor(Math.random() * (canvas.height - 1))
          
          const idx = (y * canvas.width + x) * 4
          const idxRight = (y * canvas.width + (x + 1)) * 4
          const idxBelow = ((y + 1) * canvas.width + x) * 4
          
          const pixelDiffH = Math.abs(data[idx] - data[idxRight]) +
                            Math.abs(data[idx + 1] - data[idxRight + 1]) +
                            Math.abs(data[idx + 2] - data[idxRight + 2])
                            
          const pixelDiffV = Math.abs(data[idx] - data[idxBelow]) +
                            Math.abs(data[idx + 1] - data[idxBelow + 1]) +
                            Math.abs(data[idx + 2] - data[idxBelow + 2])
                            
          sharpnessScore += (pixelDiffH + pixelDiffV) / 6
        }
        
        sharpnessScore = sharpnessScore / sample
        
        // Determinar calidad general - Umbrales más permisivos
        const brightnessFactor = Math.max(0, 100 - Math.abs(brightness - 128) * 0.5)
        const contrastFactor = Math.min(100, stdDeviation * 2.0)
        const sharpnessFactor = Math.min(100, sharpnessScore * 12)
        
        // Ponderación: nitidez 50%, contraste 30%, brillo 20%
        const qualityScore = Math.round(
          (sharpnessFactor * 0.5) +
          (contrastFactor * 0.3) +
          (brightnessFactor * 0.2)
        )
        
        // Generar retroalimentación
        let feedbackMessage = ""
        const isSharp = sharpnessFactor > 25
        const hasGoodContrast = contrastFactor > 25
        const hasGoodBrightness = brightnessFactor > 25
        
        if (!isSharp && !hasGoodContrast && !hasGoodBrightness) {
          feedbackMessage = "La imagen está borrosa, con poco contraste y mal iluminada. Intenta buscar mejor luz y mantener el teléfono firme."
        } else if (!isSharp) {
          feedbackMessage = "La imagen está borrosa. Intenta mantener el teléfono más firme y asegúrate que el documento esté bien enfocado."
        } else if (!hasGoodContrast) {
          feedbackMessage = "La imagen tiene poco contraste. Intenta con mejor iluminación para que se distinga mejor el texto."
        } else if (!hasGoodBrightness) {
          feedbackMessage = brightness < 100 
            ? "La imagen está muy oscura. Busca un lugar con mejor luz."
            : "La imagen está muy clara. Evita reflejos y luz directa sobre el documento."
        } else {
          feedbackMessage = "La calidad de la imagen es buena. Asegúrate que todo el documento sea visible."
        }
        
        resolve({
          score: qualityScore,
          isGoodQuality: qualityScore > 50,
          feedback: feedbackMessage
        })
      }
      
      img.onerror = () => {
        resolve({
          score: 0,
          isGoodQuality: false,
          feedback: "No se pudo cargar la imagen. Intenta con otro archivo."
        })
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  // Manejar captura de imagen
  const handleCapture = async (file: File) => {
    if (!file) return
    
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
    
    setIsProcessing(true)
    
    try {
      // Evaluar calidad
      const qualityResult = await evaluateImageQuality(file)
      
      // Guardar imagen con su puntuación
      const newImage = {
        file,
        quality: qualityResult.score,
        timestamp: new Date().toISOString()
      }
      
      const updatedImages = [...capturedImages, newImage]
      setCapturedImages(updatedImages)
      setAttempts(attempts + 1)
      
      // Actualizar mejor imagen
      const currentBest = bestImage ? bestImage.quality : 0
      if (newImage.quality > currentBest) {
        setBestImage(newImage)
      }
      
      // Ofrecer retroalimentación basada en calidad
      if (!qualityResult.isGoodQuality && attempts < maxAttempts - 1) {
        setFeedback(qualityResult.feedback)
      } else if (!qualityResult.isGoodQuality && attempts >= maxAttempts - 1) {
        // Último intento permitido, usar la mejor imagen disponible
        setFeedback(`Hemos guardado la mejor imagen de los ${maxAttempts} intentos. La calidad podría afectar la precisión del OCR.`)
        onImageSelected(bestImage?.file || newImage.file)
      } else {
        // Buena calidad, proceder
        setFeedback("¡Excelente! La imagen tiene buena calidad.")
        onImageSelected(newImage.file)
      }
    } catch (error) {
      console.error("Error al procesar la imagen:", error)
      setFeedback("Ocurrió un error al analizar la imagen. Por favor, intenta nuevamente.")
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Reiniciar captura
  const resetCapture = () => {
    setCapturedImages([])
    setBestImage(null)
    setAttempts(0)
    setFeedback("")
    onImageSelected(null)
  }
  
  // Activar selección de archivo
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleCapture(file)
    }
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      
      {attempts < maxAttempts && (!bestImage || bestImage.quality <= 70) ? (
        <>
          <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
            <Camera className="mx-auto h-12 w-12 text-gray-400 mb-2" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              Captura el comprobante
            </h3>
            <p className="text-xs text-gray-500">
              Asegúrate que el documento esté bien iluminado y los textos legibles
            </p>
          </div>
          
          {feedback && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs">{feedback}</p>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Intento {attempts + 1} de {maxAttempts}
            </p>
            
            {attempts > 0 && (
              <Button variant="outline" size="sm" onClick={resetCapture}>
                Reiniciar
              </Button>
            )}
          </div>
          
          <Button 
            onClick={triggerFileInput} 
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? "Analizando calidad..." : "Capturar imagen"}
          </Button>
        </>
      ) : (
        bestImage && (
          <>
            <div className="relative">
              <img 
                src={URL.createObjectURL(bestImage.file)}
                alt="Imagen capturada"
                className="w-full h-auto rounded-md border"
              />
              <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </div>
            
            <div className="flex justify-between">
              <p className="text-xs text-green-700">
                Calidad: {bestImage.quality}%
              </p>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetCapture}
              >
                Tomar otra foto
              </Button>
            </div>
          </>
        )
      )}
    </div>
  )
}
