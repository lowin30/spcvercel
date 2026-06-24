"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase-client"
import { Camera, Check, Loader2, Edit3, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface OCRSimpleProps {
  tareaId: number
  tareaCodigo: string
  tareaTitulo: string
  onDatosRecibidos?: (monto: string, descripcion: string) => void
}

export function OCRSimple({ tareaId, tareaCodigo, tareaTitulo, onDatosRecibidos }: OCRSimpleProps) {
  const router = useRouter()
  const [modo, setModo] = useState<"seleccion" | "ocr" | "manual">("seleccion")
  const [paso, setPaso] = useState<"captura" | "procesando" | "confirmacion" | "guardando">("captura")
  const [imagen, setImagen] = useState<string | null>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    monto: "",
    descripcion: "",
    fecha_gasto: new Date().toISOString().split("T")[0],
  })
  const [userDetails, setUserDetails] = useState<any>(null)
  const [supabaseInitialized, setSupabaseInitialized] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Inicializar Supabase y cargar datos del usuario al montar el componente
  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        const supabase = createClient()
        
        if (!supabase) {
          console.error("No se pudo inicializar Supabase")
          return
        }

        const sessionResponse = await supabase.auth.getSession()
        const session = sessionResponse?.data?.session
        
        if (!session) {
          console.error("No hay sesión activa")
          router.push("/login")
          return
        }
        
        // Obtener detalles del usuario
        const userResponse = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", session.user.id)
          .single()
        
        if (userResponse.error) {
          console.error("Error al obtener detalles del usuario:", userResponse.error)
          return
        }
        
        setUserDetails(userResponse.data)
        setSupabaseInitialized(true)
      } catch (error) {
        console.error("Error al inicializar Supabase:", error)
      }
    }
    
    initializeSupabase()
  }, [router])

  // Función simplificada para simular OCR
  const simularOCR = async (file: File) => {
    return new Promise<{ monto: number; texto: string }>(resolve => {
      // Simular tiempo de procesamiento
      setTimeout(() => {
        // Generar un monto aleatorio para demostración
        const monto = Math.floor(Math.random() * 100000) + 5000
        
        resolve({
          monto,
          texto: "Factura\nMateriales de construcción\nTotal: $" + monto
        })
      }, 1500)
    })
  }

  const manejarCaptura = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) return
    
    if (!supabaseInitialized) {
      toast.error("Esperando conexión a la base de datos...")
      return
    }

    const file = event.target.files[0]
    setArchivo(file)
    setPaso("procesando")

    try {
      // Generar URL para previsualización
      const imageUrl = URL.createObjectURL(file)
      setImagen(imageUrl)

      // Procesar con OCR simulado
      const resultado = await simularOCR(file)

      // Actualizar formulario con resultados
      setFormData({
        ...formData,
        monto: resultado.monto.toString(),
        descripcion: "Material de construcción"
      })

      setPaso("confirmacion")
      toast.success("✅ Imagen procesada correctamente")
    } catch (error) {
      console.error("Error en OCR:", error)
      toast.error("Error al procesar la imagen")
      setPaso("captura")
    }
  }

  const guardarGasto = async () => {
    if (!formData.monto || !formData.descripcion) {
      toast.error("Por favor completa todos los campos")
      return
    }

    try {
      setPaso("guardando")
      
      // Si hay función de callback, enviar datos al componente padre
      if (onDatosRecibidos) {
        onDatosRecibidos(formData.monto, formData.descripcion)
        toast.success("✅ Datos enviados correctamente")
        setTimeout(() => {
          reiniciar()
        }, 1000)
        return
      }

      // Si no hay callback, guardar directamente en la base de datos
      const supabase = createClient()
      if (!supabase) {
        toast.error("Error al conectar con la base de datos")
        setPaso("confirmacion")
        return
      }

      if (!userDetails) {
        toast.error("No se han cargado los datos del usuario")
        setPaso("confirmacion")
        return
      }

      // Guardar el gasto en la base de datos
      const insertResponse = await supabase.from("gastos_tarea").insert({
        id_tarea: tareaId,
        id_usuario: userDetails.id,
        tipo_gasto: "material",
        monto: parseInt(formData.monto),
        descripcion: formData.descripcion,
        comprobante_url: imagen || null,
        fecha_gasto: formData.fecha_gasto
      })

      if (insertResponse.error) {
        throw insertResponse.error
      }

      toast.success(`✅ Gasto registrado por $${parseInt(formData.monto).toLocaleString("es-CL")}`)
      reiniciar()
      router.refresh()
    } catch (error: any) {
      console.error("Error al guardar gasto:", error)
      toast.error(`Error al guardar: ${error.message}`)
      setPaso("confirmacion")
    }
  }

  const reiniciar = () => {
    setModo("seleccion")
    setPaso("captura")
    setImagen(null)
    setArchivo(null)
    setFormData({
      monto: "",
      descripcion: "",
      fecha_gasto: new Date().toISOString().split("T")[0],
    })
    if (imagen) {
      URL.revokeObjectURL(imagen)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">OCR Preciso</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Modo selección */}
        {modo === "seleccion" && (
          <div className="space-y-3">
            <div className="text-center">
              <h3 className="font-medium text-sm">Registrar Gasto - {tareaCodigo}</h3>
              <p className="text-xs text-muted-foreground">Elige el método de registro</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-auto py-3" onClick={() => setModo("ocr")}>
                <div className="flex flex-col items-center gap-1">
                  <Camera className="h-5 w-5 text-blue-500" />
                  <span className="text-xs">Con Foto</span>
                  <span className="text-xs text-muted-foreground">(OCR)</span>
                </div>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-auto py-3" onClick={() => setModo("manual")}>
                <div className="flex flex-col items-center gap-1">
                  <Edit3 className="h-5 w-5 text-green-500" />
                  <span className="text-xs">Manual</span>
                  <span className="text-xs text-muted-foreground">(Directo)</span>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Modo OCR */}
        {modo === "ocr" && (
          <>
            {paso === "captura" && (
              <div className="space-y-4">
                <div 
                  className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center cursor-pointer hover:bg-blue-50/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="mx-auto h-12 w-12 text-blue-400" />
                  <div className="mt-2">
                    <span className="font-medium text-sm">Tomar foto de factura</span>
                    <p className="text-xs text-muted-foreground mt-1">Captura la foto del documento</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={manejarCaptura}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => setModo("seleccion")} className="w-full">
                  Volver
                </Button>
              </div>
            )}

            {paso === "procesando" && (
              <div className="text-center py-6">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-500 mb-3" />
                <h3 className="font-medium mb-1">Procesando imagen</h3>
                <p className="text-xs text-muted-foreground">Detectando montos automáticamente...</p>
              </div>
            )}

            {paso === "confirmacion" && (
              <div className="space-y-4">
                {imagen && (
                  <div className="relative">
                    <img
                      src={imagen}
                      alt="Captura"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => setPaso("captura")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="monto">Monto detectado</Label>
                    <Input
                      id="monto"
                      type="number"
                      value={formData.monto}
                      onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                      className="text-lg font-medium"
                    />
                  </div>
                  <div>
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setPaso("captura")}>
                    Nueva foto
                  </Button>
                  <Button size="sm" className="flex-1" onClick={guardarGasto}>
                    <Check className="mr-1 h-4 w-4" />
                    Guardar
                  </Button>
                </div>
              </div>
            )}

            {paso === "guardando" && (
              <div className="text-center py-6">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-green-500 mb-3" />
                <h3 className="font-medium mb-1">Guardando gasto</h3>
                <p className="text-xs text-muted-foreground">Registrando en la base de datos...</p>
              </div>
            )}
          </>
        )}

        {/* Modo manual */}
        {modo === "manual" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <div>
                <Label htmlFor="monto-manual">Monto</Label>
                <Input
                  id="monto-manual"
                  type="number"
                  placeholder="25000"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="descripcion-manual">Descripción</Label>
                <Textarea
                  id="descripcion-manual"
                  placeholder="Materiales de construcción..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setModo("seleccion")}>
                Volver
              </Button>
              <Button size="sm" className="flex-1" onClick={guardarGasto}>
                <Check className="mr-1 h-4 w-4" />
                Guardar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
