"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Camera, FileText, Check, X, ArrowLeft, Save, FileImage, Loader2, Upload, PencilRuler, Sparkles, BrainCircuit } from "lucide-react"

// Define los tipos de datos
interface ProcesadorImagenProps {
  tareaId: number;
  tareaCodigo?: string;
  tareaTitulo?: string;
  mode?: 'normal' | 'extra_pdf';
  facturaId?: number;
  onSuccess?: () => void; // Callback para integración con Chat
}

interface DatosGasto {
  monto: number;
  descripcion: string;
  fecha: string;
  tipoGasto: string;
  comprobante?: File;
  comprobante_url?: string;
  imagen_procesada_url?: string;
  metodo_registro: "camara" | "archivo" | "manual";
  categoria?: "materiales" | "mano_de_obra";
}

type PasoType = 'seleccion' | 'captura' | 'procesando' | 'confirmacion' | 'guardando' | 'completado' | 'error'
type ModoRegistroType = 'camara' | 'archivo' | 'manual'
type CategoriaGastoType = 'materiales' | 'mano_de_obra'
type ModoImagenType = 'original' | 'suave' | 'fuerte'

export function ProcesadorImagen({ tareaId, tareaCodigo = '', tareaTitulo = '', onSuccess, ...restProps }: ProcesadorImagenProps) {
  // Estado para controlar la pestaña activa
  const [modoRegistro, setModoRegistro] = useState<ModoRegistroType>('camara')

  // Estados para control de flujo
  const [paso, setPaso] = useState<PasoType>('seleccion')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewUrlProcesada, setPreviewUrlProcesada] = useState<string | null>(null)
  const [imagen, setImagen] = useState<File | null>(null)
  const [imagenProcesada, setImagenProcesada] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState<boolean>(false)
  const [analizandoIA, setAnalizandoIA] = useState<boolean>(false)

  // Estados para el formulario manual
  const [formData, setFormData] = useState({
    monto: "",
    descripcion: "",
    fecha_gasto: new Date().toISOString().split("T")[0],
    tipo_gasto: "material"
  })

  // Referencias a elementos DOM
  const fileInputRef = useRef<HTMLInputElement>(null)
  const capturaRef = useRef<HTMLInputElement>(null)

  // Obtener cliente de Supabase
  const supabase = createClient()
  const mode: 'normal' | 'extra_pdf' = (restProps as any)?.mode ?? 'normal'
  const facturaId: number | undefined = (restProps as any)?.facturaId
  const [user, setUser] = useState<any>(null)
  const [modoImagen, setModoImagen] = useState<ModoImagenType>('suave')

  // Obtener usuario actual
  async function getUser() {
    const { data } = await supabase.auth.getUser()
    if (data?.user) {
      setUser(data.user)
    }
  }

  useEffect(() => {
    getUser()
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('spc_modo_imagen')
      if (saved === 'original' || saved === 'suave' || saved === 'fuerte') {
        setModoImagen(saved as ModoImagenType)
      }
    } catch { }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('spc_modo_imagen', modoImagen)
    } catch { }
  }, [modoImagen])

  // Efecto para limpiar URLs al desmontar
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      if (previewUrlProcesada) {
        URL.revokeObjectURL(previewUrlProcesada)
      }
    }
  }, [previewUrl, previewUrlProcesada])

  // Iniciar captura con la cámara
  const iniciarCaptura = () => {
    setPaso('captura')
  }

  // Función auxiliar para calcular histograma de una imagen
  const calcularHistograma = (data: Uint8ClampedArray): number[] => {
    // Inicializar histograma (256 niveles de gris)
    const histograma = new Array(256).fill(0)

    // Contar frecuencias de cada nivel de gris
    for (let i = 0; i < data.length; i += 4) {
      // Solo usamos R ya que la imagen está en escala de grises
      histograma[data[i]]++
    }

    return histograma
  }

  // ✅ AJUSTADO: Contraste MUY suave preservando ABSOLUTAMENTE todos los detalles
  const aplicarUmbralizacionAdaptativa = (data: Uint8ClampedArray, umbral: number): void => {
    // ✅ Umbral ajustado para mejor separación blanco/negro
    const umbralAjustado = Math.min(200, umbral + 10)

    for (let i = 0; i < data.length; i += 4) {
      const valorOriginal = data[i]

      // ✅ CONTRASTE MUY SUAVE (NO binarización pura)
      // Preserva ABSOLUTAMENTE todos los bordes suaves y anti-aliasing de las letras
      if (valorOriginal < umbralAjustado) {
        // Píxeles oscuros (letras) → Oscurecer al 60% para máxima preservación
        // Esto mantiene TODOS los detalles finos, bordes y anti-aliasing
        const nuevoValor = Math.max(0, Math.floor(valorOriginal * 0.6))
        data[i] = data[i + 1] = data[i + 2] = nuevoValor
      } else {
        // Píxeles claros (fondo) → BLANCO PURO para contraste
        data[i] = data[i + 1] = data[i + 2] = 255
      }
      // El canal alpha (i+3) se mantiene igual
    }
  }

  const aplicarUmbralizacionSuave = (data: Uint8ClampedArray, umbral: number): void => {
    const u = Math.max(140, Math.min(185, umbral - 5))
    for (let i = 0; i < data.length; i += 4) {
      const v = data[i]
      if (v < u) {
        const nv = Math.max(0, Math.floor(v * 0.8 + 10))
        data[i] = data[i + 1] = data[i + 2] = nv
      } else {
        const nv = Math.min(242, Math.floor(v + 15))
        data[i] = data[i + 1] = data[i + 2] = nv
      }
    }
  }

  // Función para calcular umbral óptimo usando método de Otsu
  const calcularUmbralOtsu = (histograma: number[], pixelesTotales: number): number => {
    let sumaTotal = 0
    for (let i = 0; i < 256; i++) {
      sumaTotal += i * histograma[i]
    }

    let sumaBg = 0
    let pesoBg = 0
    let pesoFg = 0
    let varianzaMax = 0
    let umbralOptimo = 0

    // Calcular para cada umbral posible
    for (let t = 0; t < 256; t++) {
      // Actualizar pesos
      pesoBg += histograma[t]
      if (pesoBg === 0) continue

      pesoFg = pixelesTotales - pesoBg
      if (pesoFg === 0) break

      // Actualizar suma acumulada
      sumaBg += t * histograma[t]

      // Calcular medias
      const mediaBg = sumaBg / pesoBg
      const mediaFg = (sumaTotal - sumaBg) / pesoFg

      // Calcular varianza entre clases
      const varianza = pesoBg * pesoFg * (mediaBg - mediaFg) * (mediaBg - mediaFg)

      // Actualizar umbral si encontramos varianza mayor
      if (varianza > varianzaMax) {
        varianzaMax = varianza
        umbralOptimo = t
      }
    }

    return umbralOptimo
  }

  // Procesamiento real de la imagen - Conversión B/N + Detección de bordes
  const procesarArchivo = async (file: File): Promise<boolean> => {
    if (!file) return false
    setCargando(true)
    setPaso('procesando')
    setError(null)

    try {
      // Cargar imagen original
      setImagen(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)

      // VALIDACIÓN ESTRICTA: Solo permitir imágenes
      if (!file.type.startsWith('image/')) {
        toast.error("Solo se permiten archivos de imagen (JPG, PNG, WebP)")
        setError("El archivo seleccionado no es una imagen válida.")
        setPaso('seleccion')
        return false
      }

      // Cargar imagen en un elemento Image para procesarla con canvas
      const imagenOriginal = new Image()

      // Esperar a que se cargue la imagen
      await new Promise((resolve, reject) => {
        imagenOriginal.onload = () => resolve(true)
        imagenOriginal.onerror = () => reject(new Error('No se pudo cargar la imagen'))
        imagenOriginal.src = url
      })

      // Crear canvas para procesamiento
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('No se pudo crear el contexto de canvas')
      }

      // Dimensiones originales
      canvas.width = imagenOriginal.width
      canvas.height = imagenOriginal.height

      // Dibujar imagen original en el canvas
      ctx.drawImage(imagenOriginal, 0, 0)

      // Obtener datos de la imagen
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      if (modoImagen !== 'original') {
        for (let i = 0; i < data.length; i += 4) {
          const grayValue = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          const contrastFactor = modoImagen === 'fuerte' ? 1.3 : 1.1
          const brightness = modoImagen === 'fuerte' ? 10 : 2
          const contrastedValue = Math.min(255, Math.max(0, (grayValue - 128) * contrastFactor + 128 + brightness))
          data[i] = contrastedValue
          data[i + 1] = contrastedValue
          data[i + 2] = contrastedValue
        }
        ctx.putImageData(imageData, 0, 0)
      }

      let umbralOscuro = 128
      if (modoImagen !== 'original') {
        const histograma = calcularHistograma(data)
        const pixelesTotales = canvas.width * canvas.height
        umbralOscuro = calcularUmbralOtsu(histograma, pixelesTotales)
        console.log('Umbral adaptativo calculado:', umbralOscuro)
        if (modoImagen === 'suave') {
          aplicarUmbralizacionSuave(data, umbralOscuro)
        } else {
          aplicarUmbralizacionAdaptativa(data, umbralOscuro)
        }
        ctx.putImageData(imageData, 0, 0)
        console.log('Umbralización aplicada')
      } else {
        console.log('Modo imagen original: sin umbralización')
      }

      // 2.2 Buscar bordes (coordenadas donde comienza el contenido)
      let bordeSuperior = canvas.height
      let bordeInferior = 0
      let bordeIzquierdo = canvas.width
      let bordeDerecho = 0

      // Muestreo adaptativo basándonos en el tamaño de la imagen
      // Para imágenes grandes usamos un paso más grande, para imágenes pequeñas uno más fino
      const anchoNormalizado = Math.min(1600, canvas.width)
      const paso = Math.max(1, Math.floor(anchoNormalizado / 150))

      // Matrices para detección de bordes (encontrar cambios bruscos)
      // Primera pasada - detección de píxeles oscuros
      for (let y = 0; y < canvas.height; y += paso) {
        for (let x = 0; x < canvas.width; x += paso) {
          const idx = (y * canvas.width + x) * 4
          const valor = data[idx] // Solo R ya que convertimos a escala de grises

          if (valor < umbralOscuro) { // Si es un pixel oscuro (parte del contenido)
            bordeIzquierdo = Math.min(bordeIzquierdo, x)
            bordeDerecho = Math.max(bordeDerecho, x)
            bordeSuperior = Math.min(bordeSuperior, y)
            bordeInferior = Math.max(bordeInferior, y)
          }
        }
      }

      // Segunda pasada - detección de cambios de contraste (bordes)
      // Calcula la diferencia entre pixeles adyacentes para detectar bordes
      // Calculamos umbral de diferencia como un porcentaje del umbral principal
      const umbralDiferencia = Math.max(30, Math.floor(umbralOscuro * 0.4))
      console.log('Umbral de diferencia calculado:', umbralDiferencia)

      // Escanear para encontrar bordes horizontales (superior e inferior)
      for (let x = paso * 2; x < canvas.width - paso * 2; x += paso) {
        for (let y = paso; y < canvas.height - paso; y += paso) {
          const idxActual = (y * canvas.width + x) * 4
          const idxSuperior = ((y - paso) * canvas.width + x) * 4

          const valorActual = data[idxActual]
          const valorSuperior = data[idxSuperior]

          if (Math.abs(valorActual - valorSuperior) > umbralDiferencia) {
            bordeSuperior = Math.min(bordeSuperior, y - paso)
            break // Una vez encontrado un borde superior, pasamos a la siguiente columna
          }
        }

        for (let y = canvas.height - paso; y > paso; y -= paso) {
          const idxActual = (y * canvas.width + x) * 4
          const idxInferior = ((y + paso) * canvas.width + x) * 4

          const valorActual = data[idxActual]
          const valorInferior = y + paso < canvas.height ? data[idxInferior] : 255

          if (Math.abs(valorActual - valorInferior) > umbralDiferencia) {
            bordeInferior = Math.max(bordeInferior, y + paso)
            break // Una vez encontrado un borde inferior, pasamos a la siguiente columna
          }
        }
      }

      // Escanear para encontrar bordes verticales (izquierdo y derecho)
      for (let y = paso * 2; y < canvas.height - paso * 2; y += paso) {
        for (let x = paso; x < canvas.width - paso; x += paso) {
          const idxActual = (y * canvas.width + x) * 4
          const idxIzquierdo = (y * canvas.width + (x - paso)) * 4

          const valorActual = data[idxActual]
          const valorIzquierdo = data[idxIzquierdo]

          if (Math.abs(valorActual - valorIzquierdo) > umbralDiferencia) {
            bordeIzquierdo = Math.min(bordeIzquierdo, x - paso)
            break // Una vez encontrado un borde izquierdo, pasamos a la siguiente fila
          }
        }

        for (let x = canvas.width - paso; x > paso; x -= paso) {
          const idxActual = (y * canvas.width + x) * 4
          const idxDerecho = (y * canvas.width + (x + paso)) * 4

          const valorActual = data[idxActual]
          const valorDerecho = x + paso < canvas.width ? data[idxDerecho] : 255

          if (Math.abs(valorActual - valorDerecho) > umbralDiferencia) {
            bordeDerecho = Math.max(bordeDerecho, x + paso)
            break // Una vez encontrado un borde derecho, pasamos a la siguiente fila
          }
        }
      }

      // En caso de que los bordes no se hayan detectado correctamente, usar valores predeterminados
      if (bordeSuperior >= bordeInferior || bordeIzquierdo >= bordeDerecho) {
        // Valores predeterminados: recortar 10% de cada borde
        bordeSuperior = Math.floor(canvas.height * 0.1)
        bordeInferior = Math.floor(canvas.height * 0.9)
        bordeIzquierdo = Math.floor(canvas.width * 0.1)
        bordeDerecho = Math.floor(canvas.width * 0.9)
      }

      // Añadir margen de seguridad (3% de la dimensión, más ajustado que antes)
      const margenX = Math.floor(canvas.width * 0.03)
      const margenY = Math.floor(canvas.height * 0.03)

      bordeIzquierdo = Math.max(0, bordeIzquierdo - margenX)
      bordeDerecho = Math.min(canvas.width, bordeDerecho + margenX)
      bordeSuperior = Math.max(0, bordeSuperior - margenY)
      bordeInferior = Math.min(canvas.height, bordeInferior + margenY)

      // Asegurarse de que los bordes tienen dimensiones razonables
      const anchoBorde = bordeDerecho - bordeIzquierdo
      const altoBorde = bordeInferior - bordeSuperior

      // ✅ DESACTIVADO: NO recortar la imagen automáticamente
      // El usuario quiere ver la imagen completa sin recortes

      console.log('Recorte automático DESACTIVADO - manteniendo imagen completa')

      // Forzar que NO se recorte nada
      const recortarHorizontal = false
      const recortarVertical = false

      // ✅ SIMPLIFICADO: Como no recortamos, usamos el canvas original directamente
      // No se necesita crear un canvas final ni copiar regiones
      console.log('Usando imagen completa sin recorte:', canvas.width, 'x', canvas.height)

      // Convertir el canvas a Blob/File
      const nuevaImagenPromise = new Promise<File>((resolve, reject) => {
        canvas.toBlob((blob: Blob | null) => {
          if (!blob) {
            reject(new Error('No se pudo generar la imagen procesada'))
            return
          }

          // Crear un nuevo File con el mismo nombre pero con sufijo
          const nombreOriginal = file.name
          const partes = nombreOriginal.split('.')
          const extension = partes.pop() || 'jpg'
          const nombreBase = partes.join('.')
          const nombreProcesado = `${nombreBase}_procesado.${extension}`

          const imagenProcesadaFile = new File([blob], nombreProcesado, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })

          resolve(imagenProcesadaFile)
        }, 'image/jpeg', 0.92) // Calidad 92%
      })

      // Esperar a que se genere la imagen procesada
      const imagenProcesadaFile = await nuevaImagenPromise

      // Actualizar estado con la imagen procesada
      setImagenProcesada(imagenProcesadaFile)
      const urlProcesada = URL.createObjectURL(imagenProcesadaFile)
      setPreviewUrlProcesada(urlProcesada)

      toast.success("Imagen procesada correctamente")

      // ✨ AUTO-ANÁLISIS CON IA (GEMINI)
      // Iniciamos el análisis inmediatamente sin bloquear UI
      if (imagenProcesadaFile) {
        setTimeout(() => analizarImagenConIA(imagenProcesadaFile), 100)
      }

      setPaso('confirmacion')
      return true
    } catch (error) {
      console.error("Error al cargar imagen:", error)
      toast.error("Error al cargar la imagen")
      setError("No se pudo cargar la imagen. Por favor intenta con otra.")
      setPaso('seleccion')
      return false
    } finally {
      setCargando(false)
    }
  }

  // Función para subir a Cloudinary y obtener URL optimizada
  const subirACloudinaryOptimizado = async (file: File): Promise<string | null> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dyb0ui625";
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "spc";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Fallo subida a Cloudinary");

      const data = await response.json();

      // Aplicar filtros de mejora de OCR: mejorar contraste y enfocar agresivamente
      const originalUrl = data.secure_url;
      const optimizedUrl = originalUrl.replace("/upload/", "/upload/e_improve,e_sharpen:100/"); // Pipeline sugerido

      console.log("Imagen subida y optimizada:", optimizedUrl);
      return optimizedUrl;
    } catch (error) {
      console.error("Error subiendo a Cloudinary:", error);
      toast.error("Error subiendo imagen a la nube");
      return null;
    }
  };

  // Función para analizar imagen con IA
  const analizarImagenConIA = async (file: File) => {
    try {
      if (!file || !file.type.startsWith('image/')) {
        console.log("Omitiendo análisis IA: El archivo no es una imagen compatible.");
        return;
      }
      setAnalizandoIA(true);
      toast.info("🤖 Analizando comprobante con lA...", { duration: 2000 });

      // OPTIMIZACIÓN: Redimensionar imagen para no enviar un payload gigante (max 1024px)
      const imageBitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 1024;

      let width = imageBitmap.width;
      let height = imageBitmap.height;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = (height / width) * MAX_SIZE;
          width = MAX_SIZE;
        } else {
          width = (width / height) * MAX_SIZE;
          height = MAX_SIZE;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("No se pudo crear contexto de canvas");
      ctx.drawImage(imageBitmap, 0, 0, width, height);

      // Convertir a Base64 (JPEG 0.8 es buen balance calidad/peso)
      const base64data = canvas.toDataURL('image/jpeg', 0.8);

      try {
        // Enviar Base64 directo a la API. Backend gestiona Cloudinary.
        const response = await fetch('/api/analizar-gasto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagen: base64data }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Error servidor: ${response.status}`);
        }

        const data = await response.json();

        if (data.datos) {
          console.log("Datos IA:", data.datos);

          setFormData(prev => {
            const newData = { ...prev };
            let updated = false;

            if (data.datos.monto && parseFloat(data.datos.monto) > 0) {
              newData.monto = data.datos.monto.toString();
              updated = true;
            }
            if (data.datos.descripcion) {
              newData.descripcion = data.datos.descripcion;
              updated = true;
            }
            if (data.datos.fecha) {
              newData.fecha_gasto = data.datos.fecha;
              updated = true;
            }
            if (data.datos.tipo_gasto) {
              newData.tipo_gasto = data.datos.tipo_gasto;
              updated = true;
            }

            if (updated) {
              toast.success("✨ ¡Datos detectados!", {
                icon: <Sparkles className="h-4 w-4 text-green-500" />
              });
            }
            return newData;
          });
        }
      } catch (error: any) {
        console.error("Error API:", error);
        toast.error(`No se pudo analizar: ${error.message}`);
      } finally {
        setAnalizandoIA(false);
      }

    } catch (error: any) {
      console.error("Error preparando análisis IA:", error);
      setAnalizandoIA(false);
    }
  };

  // Reiniciar el proceso
  const reiniciarProceso = () => {
    // Revocar URLs de objeto
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    if (previewUrlProcesada) {
      URL.revokeObjectURL(previewUrlProcesada)
    }

    // Resetear estados
    setImagen(null)
    setImagenProcesada(null)
    setPreviewUrl(null)
    setPreviewUrlProcesada(null)
    setError(null)
    setFormData({
      monto: "",
      descripcion: "",
      fecha_gasto: new Date().toISOString().split("T")[0],
      tipo_gasto: "material"
    })
    setPaso('seleccion')
    setAnalizandoIA(false)
  }

  // Volver al paso anterior
  const volverPasoAnterior = () => {
    if (paso === 'confirmacion') {
      setPaso('captura')
    } else if (paso === 'captura') {
      setPaso('seleccion')
    }
  }

  // Guardar gasto con la información ingresada
  const guardarGasto = async () => {
    if (!formData.monto || !formData.descripcion) {
      toast.error("El monto y la descripción son obligatorios")
      return
    }

    try {
      setCargando(true)
      setPaso('guardando')
      setError(null)

      // Obtener fecha y hora actual para usar en los nombres de archivo
      const ahora = new Date()
      const timestamp = `${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, '0')}${String(ahora.getDate()).padStart(2, '0')}_${String(ahora.getHours()).padStart(2, '0')}${String(ahora.getMinutes()).padStart(2, '0')}${String(ahora.getSeconds()).padStart(2, '0')}`

      // Subir imágenes a Supabase Storage
      let comprobanteUrl = null
      let imagenProcesadaUrl = null

      // Asegurar estructura organizada
      if (imagen) {
        // Nombre de archivo con formato: tarea_timestamp.extension
        const extension = imagen.name.split('.').pop() || 'jpg'
        const nombreArchivo = `tarea${tareaId}_${timestamp}.${extension}`
        const basePath = mode === 'extra_pdf' && facturaId ? `comprobantes_extras/factura_${facturaId}` : `comprobantes/tarea_${tareaId}`
        const rutaArchivo = `${basePath}/${nombreArchivo}`

        const { data: uploadResult, error: uploadError } = await supabase.storage
          .from('comprobantes')
          .upload(rutaArchivo, imagen, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Error subiendo imagen original:', uploadError)
          toast.error('Error al subir imagen original, intentando continuar...')
        } else {
          // Obtener URL pública
          const { data: urlData } = supabase.storage
            .from('comprobantes')
            .getPublicUrl(rutaArchivo)

          comprobanteUrl = urlData.publicUrl
        }
      }

      // Como ya no procesamos imágenes, sólo guardamos la misma imagen en una carpeta separada
      // para mantener la estructura de la aplicación
      if (imagenProcesada) {
        // Usar el mismo nombre base pero añadiendo un sufijo
        const extension = imagen?.name.split('.').pop() || 'jpg'
        const nombreProcesado = `tarea${tareaId}_${timestamp}_procesado.${extension}`
        const basePathProcesado = mode === 'extra_pdf' && facturaId ? `comprobantes_extras/factura_${facturaId}` : `comprobantes/tarea_${tareaId}`
        const rutaProcesado = `${basePathProcesado}/procesados/${nombreProcesado}`

        const { data: uploadResult, error: uploadError } = await supabase.storage
          .from('comprobantes')
          .upload(rutaProcesado, imagenProcesada, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Error subiendo imagen procesada:', uploadError)
          toast.error('Error al subir imagen procesada, intentando continuar...')
        } else {
          // Obtener URL pública
          const { data: urlData } = supabase.storage
            .from('comprobantes')
            .getPublicUrl(rutaProcesado)

          imagenProcesadaUrl = urlData.publicUrl
        }
      }

      // Si ambas imágenes fallaron al subirse, no podemos continuar
      if (!comprobanteUrl && !imagenProcesadaUrl) {
        throw new Error('No se pudo subir ninguna de las imágenes')
      }

      // Incluir información del gasto en el campo descripcion para facilitar búsquedas posteriores
      const descripcionEnriquecida = `${formData.descripcion} [${formData.tipo_gasto}] [${formData.fecha_gasto}]`;

      let insertError: any = null
      if (mode === 'extra_pdf' && facturaId) {
        const { error } = await supabase.from('gastos_extra_pdf_factura').insert({
          id_factura: facturaId,
          id_tarea: tareaId,
          id_usuario: user?.id,
          monto: parseFloat(formData.monto),
          descripcion: formData.descripcion,
          fecha: formData.fecha_gasto,
          comprobante_url: comprobanteUrl,
          imagen_procesada_url: imagenProcesadaUrl
        })
        insertError = error
      } else {
        const { error } = await supabase.from('gastos_tarea').insert({
          id_tarea: tareaId,
          id_usuario: user?.id,
          monto: parseFloat(formData.monto),
          descripcion: descripcionEnriquecida,
          fecha_gasto: formData.fecha_gasto,
          tipo_gasto: formData.tipo_gasto,
          comprobante_url: comprobanteUrl,
          imagen_procesada_url: imagenProcesadaUrl,
          metodo_registro: modoRegistro,
          confianza_ocr: null,
          datos_ocr: null
        })
        insertError = error
      }

      if (insertError) {
        throw new Error(`Error al guardar en la base de datos: ${insertError.message}`)
      }

      // Notificar éxito
      toast.success(`Gasto de $${parseFloat(formData.monto).toLocaleString('es-CL')} guardado correctamente`)

      // Actualizar UI para mostrar éxito
      setPaso('completado')

      // Resetear el formulario para un nuevo ingreso
      setPaso('completado')

      // Si hay callback de éxito (Chat), llamarlo después de breve delay
      if (onSuccess) {
        setTimeout(() => {
          // No forzamos cierre automático para dejar leer el mensaje de éxito, 
          // el usuario usará el botón "Volver al chat"
        }, 2000)
      } else {
        setTimeout(() => {
          reiniciarProceso()
        }, 2000)
      }

    } catch (error) {
      console.error("Error:", error)
      setError(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      setPaso('confirmacion')
    } finally {
      setCargando(false)
    }
  }

  // Guardar gasto manual (sin imagen)
  const guardarGastoManual = async () => {
    // Validación de datos obligatorios
    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      setError("Debes ingresar un monto válido mayor a cero")
      return
    }

    if (!formData.descripcion) {
      setError("Debes ingresar una descripción del gasto")
      return
    }

    setError(null)
    setPaso('guardando')
    setCargando(true)

    try {
      // Crear descripción enriquecida
      const descripcionEnriquecida = {
        descripcion: formData.descripcion,
        categoria: formData.tipo_gasto === "material" ? "materiales" : "mano_de_obra"
      }

      // Insertar registro en la base de datos
      let insertError: any = null
      if (mode === 'extra_pdf' && facturaId) {
        const { error } = await supabase
          .from('gastos_extra_pdf_factura')
          .insert({
            id_factura: facturaId,
            id_tarea: tareaId,
            id_usuario: user?.id,
            monto: parseFloat(formData.monto),
            descripcion: formData.descripcion,
            fecha: formData.fecha_gasto,
            comprobante_url: null,
            imagen_procesada_url: null
          })
        insertError = error
      } else {
        const { error } = await supabase
          .from('gastos_tarea')
          .insert({
            id_tarea: tareaId,
            id_usuario: user?.id,
            monto: parseFloat(formData.monto),
            descripcion: formData.descripcion,
            fecha_gasto: formData.fecha_gasto,
            tipo_gasto: formData.tipo_gasto,
            comprobante_url: null,
            imagen_procesada_url: null,
            metodo_registro: modoRegistro,
            confianza_ocr: null,
            datos_ocr: descripcionEnriquecida
          })
        insertError = error
      }

      if (insertError) {
        throw new Error(`Error al guardar en la base de datos: ${insertError.message}`)
      }

      // Notificar éxito
      toast.success(`Gasto de $${parseFloat(formData.monto).toLocaleString('es-CL')} guardado correctamente`)

      // Actualizar UI para mostrar éxito
      setPaso('completado')

      // Resetear formulario para nuevo ingreso
      setFormData({
        monto: "",
        descripcion: "",
        fecha_gasto: new Date().toISOString().split("T")[0],
        tipo_gasto: "material"
      })

    } catch (error) {
      console.error("Error al guardar el gasto manual:", error)
      setError(error instanceof Error ? error.message : "Error desconocido al guardar")
      setPaso('seleccion')
    } finally {
      setCargando(false)
    }
  }

  // Función para cambiar el modo y reiniciar estados si es necesario
  const cambiarModo = (modo: ModoRegistroType) => {
    if (modoRegistro !== modo) {
      setModoRegistro(modo)
      // Solo reiniciar si estamos en selección o completado
      if (paso === 'seleccion' || paso === 'completado') {
        setPaso('seleccion')
        setError(null)
      }
    }
  }

  // Obtener el título según el estado
  const obtenerTitulo = () => {
    if (paso === 'procesando') return "Procesando imagen..."
    if (paso === 'guardando') return "Guardando comprobante..."
    if (paso === 'completado') return "¡Comprobante guardado!"

    switch (modoRegistro) {
      case 'camara': return "Capturar imagen"
      case 'archivo': return "Subir comprobante"
      case 'manual': return "Registro manual"
      default: return "Registro de comprobante"
    }
  }

  // Renderizado basado en el paso actual
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileImage className="h-4 w-4" />
            {obtenerTitulo()}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={reiniciarProceso}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Tarea: {tareaCodigo || tareaId} {tareaTitulo ? `- ${tareaTitulo}` : ''}
        </p>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md mb-3 text-sm">
            {error}
          </div>
        )}

        {/* Mostrar pestañas solo en modo selección o completado para poder volver a registrar */}
        {(paso === 'seleccion' || paso === 'completado') && (
          <Tabs
            value={modoRegistro}
            onValueChange={(v) => cambiarModo(v as ModoRegistroType)}
            className="mb-4"
          >
            <TabsList className="grid grid-cols-3 mb-2">
              <TabsTrigger value="camara">
                <Camera className="mr-2 h-4 w-4" />
                Cámara
              </TabsTrigger>
              <TabsTrigger value="archivo">
                <Upload className="mr-2 h-4 w-4" />
                Subir
              </TabsTrigger>
              <TabsTrigger value="manual">
                <PencilRuler className="mr-2 h-4 w-4" />
                Manual
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Modo selección con pestañas */}
        {paso === 'seleccion' && modoRegistro === 'camara' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 text-center">
              Toma una foto del comprobante con tu cámara
            </p>
            <div className="space-y-2">
              <Label className="text-xs">Modo de imagen</Label>
              <RadioGroup
                value={modoImagen}
                onValueChange={(v) => setModoImagen(v as ModoImagenType)}
                className="grid grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="original" id="modo_original" />
                  <Label htmlFor="modo_original" className="cursor-pointer text-xs">Original</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="suave" id="modo_suave" />
                  <Label htmlFor="modo_suave" className="cursor-pointer text-xs">Suave</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fuerte" id="modo_fuerte" />
                  <Label htmlFor="modo_fuerte" className="cursor-pointer text-xs">Fuerte</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex justify-center">
              <Button
                onClick={iniciarCaptura}
                size="lg"
                className="w-full sm:w-auto"
              >
                <Camera className="mr-2 h-5 w-5" />
                Abrir cámara
              </Button>
            </div>
          </div>
        )}

        {/* Modo archivo */}
        {paso === 'seleccion' && modoRegistro === 'archivo' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 text-center">
              Selecciona una imagen de comprobante desde tu dispositivo
            </p>
            <div className="space-y-2">
              <Label className="text-xs">Modo de imagen</Label>
              <RadioGroup
                value={modoImagen}
                onValueChange={(v) => setModoImagen(v as ModoImagenType)}
                className="grid grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="original" id="modo_original_archivo" />
                  <Label htmlFor="modo_original_archivo" className="cursor-pointer text-xs">Original</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="suave" id="modo_suave_archivo" />
                  <Label htmlFor="modo_suave_archivo" className="cursor-pointer text-xs">Suave</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fuerte" id="modo_fuerte_archivo" />
                  <Label htmlFor="modo_fuerte_archivo" className="cursor-pointer text-xs">Fuerte</Label>
                </div>
              </RadioGroup>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && procesarArchivo(e.target.files[0])}
            />
            <div className="flex justify-center">
              <Button
                onClick={() => fileInputRef.current?.click()}
                size="lg"
                className="w-full sm:w-auto"
              >
                <FileText className="mr-2 h-5 w-5" />
                Seleccionar imagen
              </Button>
            </div>
          </div>
        )}

        {/* Modo registro manual */}
        {paso === 'seleccion' && modoRegistro === 'manual' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 text-center mb-4">
              Ingresa los datos del gasto manualmente
            </p>

            <div className="space-y-3">
              <div>
                <Label htmlFor="categoria" className="text-sm">Categoría de gasto *</Label>
                <RadioGroup
                  defaultValue={formData.tipo_gasto}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2"
                  onValueChange={(value) => setFormData({ ...formData, tipo_gasto: value })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="material" id="material" />
                    <Label htmlFor="material" className="cursor-pointer">Materiales</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mano_de_obra" id="mano_de_obra" />
                    <Label htmlFor="mano_de_obra" className="cursor-pointer">Mano de obra</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="monto" className="text-sm">Monto *</Label>
                <Input
                  id="monto"
                  type="number"
                  placeholder="25000"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="descripcion" className="text-sm">Descripción *</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Descripción del gasto..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="fecha" className="text-sm">Fecha del gasto</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha_gasto}
                  onChange={(e) => setFormData({ ...formData, fecha_gasto: e.target.value })}
                  className="mt-1"
                />
              </div>

              <Button
                className="w-full mt-2"
                onClick={() => guardarGastoManual()}
              >
                <Save className="mr-2 h-4 w-4" />
                Guardar gasto
              </Button>
            </div>
          </div>
        )}

        {/* Paso: Captura de imagen */}
        {paso === 'captura' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Toma una foto clara del comprobante en una superficie bien iluminada
            </p>
            <div className="space-y-2">
              <Label className="text-xs">Modo de imagen</Label>
              <RadioGroup
                value={modoImagen}
                onValueChange={(v) => setModoImagen(v as ModoImagenType)}
                className="grid grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="original" id="modo_original_captura" />
                  <Label htmlFor="modo_original_captura" className="cursor-pointer text-xs">Original</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="suave" id="modo_suave_captura" />
                  <Label htmlFor="modo_suave_captura" className="cursor-pointer text-xs">Suave</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fuerte" id="modo_fuerte_captura" />
                  <Label htmlFor="modo_fuerte_captura" className="cursor-pointer text-xs">Fuerte</Label>
                </div>
              </RadioGroup>
            </div>
            <input
              ref={capturaRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && procesarArchivo(e.target.files[0])}
            />
            <div className="flex justify-center">
              <Button
                onClick={() => capturaRef.current?.click()}
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5" />
                Capturar Imagen
              </Button>
            </div>
            <div className="flex justify-start">
              <Button
                variant="ghost"
                size="sm"
                onClick={volverPasoAnterior}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Volver
              </Button>
            </div>
          </div>
        )}

        {/* Paso: Procesando */}
        {paso === 'procesando' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Preparando imagen...</p>
          </div>
        )}

        {/* Paso: Confirmación */}
        {paso === 'confirmacion' && (
          <div className="space-y-4">
            {/* Previsualización de imágenes */}
            <div className="grid grid-cols-2 gap-2">
              {previewUrl && (
                <div>
                  <Label className="text-xs text-muted-foreground">Imagen seleccionada</Label>
                  <img
                    src={previewUrl}
                    alt="Comprobante"
                    className="w-full h-36 object-contain bg-gray-50 border rounded"
                  />
                </div>
              )}

              {previewUrlProcesada && (
                <div className="text-center">
                  <Label className="text-xs text-muted-foreground">Vista previa</Label>
                  <img
                    src={previewUrlProcesada}
                    alt="Vista previa"
                    className="w-full h-36 object-contain bg-gray-50 border rounded"
                  />
                </div>
              )}
            </div>

            {/* Formulario de datos */}
            <div className="space-y-3 mt-2">
              <div>
                <Label htmlFor="monto" className="text-sm">Monto *</Label>
                <Input
                  id="monto"
                  type="number"
                  placeholder="25000"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="descripcion" className="text-sm">Descripción *</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Descripción del gasto..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="fecha" className="text-sm">Fecha del gasto</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha_gasto}
                  onChange={(e) => setFormData({ ...formData, fecha_gasto: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Botón manual para re-analizar con IA si el usuario quiere */}
            {!cargando && paso === 'confirmacion' && (
              <Button
                variant="outline"
                onClick={() => imagenProcesada && analizarImagenConIA(imagenProcesada)}
                disabled={analizandoIA}
                className="w-full mt-2 mb-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50"
              >
                {analizandoIA ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analizando imagen...
                  </>
                ) : (
                  <>
                    <BrainCircuit className="mr-2 h-4 w-4" />
                    Re-analizar con Inteligencia Artificial
                  </>
                )}
              </Button>
            )}

            {/* Botones de acción */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={volverPasoAnterior}
                className="flex-1"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Nueva foto
              </Button>
              <Button
                onClick={guardarGasto}
                className="flex-1"
              >
                <Save className="mr-1 h-4 w-4" />
                Guardar
              </Button>
            </div>
          </div>
        )}

        {/* Paso: Guardando */}
        {paso === 'guardando' && (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium">Guardando información...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Subiendo imágenes y registrando datos
            </p>
          </div>
        )}

        {/* Paso: Completado */}
        {paso === 'completado' && (
          <div className="py-8 text-center">
            <Check className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="text-lg font-medium text-green-600 mb-2">¡Gasto registrado correctamente!</p>
            <Button
              onClick={() => {
                if (onSuccess) onSuccess()
                else reiniciarProceso()
              }}
              variant="outline"
              className="mx-auto mt-2"
            >
              {onSuccess ? "Volver al chat" : "Registrar otro gasto"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card >
  );
}
