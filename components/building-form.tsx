"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { cleanCuit } from "@/lib/utils"
import { Loader2, MapPin, Save } from "lucide-react"

// Definir el esquema de validación
const formSchema = z.object({
  nombre: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  direccion: z.string().optional(),
  estado: z.enum(["activo", "en_obra", "finalizado", "inactivo"]).default("activo"),
  id_administrador: z.string().default("0"),
  cuit: z.string().optional(),
  mapa_url: z
    .string()
    .optional()
    .refine(
      (val) => {
        // Si está vacío o es null/undefined, es válido
        if (!val || val.trim() === "") return true
        // Si no está vacío, debe ser una URL válida
        try {
          new URL(val)
          return true
        } catch {
          return false
        }
      },
      {
        message: "Debe ser una URL válida o dejarse en blanco",
      },
    ),
  latitud: z.string().optional().nullable(),
  longitud: z.string().optional().nullable(),
})

interface Administrador {
  id: number
  nombre: string
}

interface BuildingFormProps {
  administradores: Administrador[];
  supabase: any; // O un tipo más específico si lo tienes definido
}

export function BuildingForm({ administradores, supabase }: BuildingFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessingMap, setIsProcessingMap] = useState(false)
  const [lastProcessedUrl, setLastProcessedUrl] = useState<string | null>(null)


  // Inicializar el formulario
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      direccion: "",
      estado: "activo",
      id_administrador: "0", // Sin administrador por defecto
      cuit: "",
      mapa_url: "",
      latitud: "",
      longitud: "",
    },
  })

  // Procesar automáticamente la URL cuando cambia
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "mapa_url" && value.mapa_url && value.mapa_url !== lastProcessedUrl) {
        // Solo procesar si la URL ha cambiado y tiene un valor
        if (value.mapa_url.startsWith("http")) {
          setLastProcessedUrl(value.mapa_url)
          processMapUrl(value.mapa_url)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [form.watch, lastProcessedUrl])

  // Función para procesar la URL del mapa
  const processMapUrl = async (url: string) => {
    if (!url) return

    setIsProcessingMap(true)
    toast({
      title: "Procesando URL",
      description: "Obteniendo información del mapa...",
    })

    try {
      // Enviar la URL al endpoint para procesarla
      const response = await fetch("/api/resolve-map-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error("Error al procesar la URL")
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.coordinates) {
        // Actualizar los campos del formulario
        form.setValue("latitud", data.coordinates.lat.toString())
        form.setValue("longitud", data.coordinates.lng.toString())

        if (data.address) {
          form.setValue("direccion", data.address)
        }

        // Si se usaron valores predeterminados, mostrar un mensaje diferente
        if (data.isDefault) {
          toast({
            title: "Información aproximada",
            description:
              "No se pudo obtener la ubicación exacta. Se han completado los campos con información aproximada.",
          })
        } else {
          toast({
            title: "Información obtenida",
            description: "Se han completado los campos con la información del mapa.",
          })
        }
      } else {
        throw new Error("No se pudieron obtener coordenadas")
      }
    } catch (error) {
      console.error("Error al procesar la URL del mapa:", error)
      toast({
        title: "Error",
        description: "No se pudo obtener información del mapa. Por favor, ingrese los datos manualmente.",
        variant: "destructive",
      })
    } finally {
      setIsProcessingMap(false)
    }
  }

  // Función para manejar el envío del formulario
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      // Insertar el edificio en la base de datos
      // Nota: Ya no generamos el código manualmente, dejamos que la base de datos use su valor DEFAULT
      const { data, error } = await supabase.from("edificios").insert({
        nombre: values.nombre,
        direccion: values.direccion || null,
        estado: values.estado,
        id_administrador: values.id_administrador === "0" ? null : Number.parseInt(values.id_administrador),
        // No incluimos el campo 'code' para que la base de datos use su valor DEFAULT
        cuit: values.cuit ? cleanCuit(values.cuit) : null,
        mapa_url: values.mapa_url || null,
        latitud: values.latitud ? Number.parseFloat(values.latitud) : null,
        longitud: values.longitud ? Number.parseFloat(values.longitud) : null,
      })

      if (error) {
        console.error("Error de Supabase:", error)
        throw new Error(`Error al crear el edificio: ${error.message}`)
      }

      toast({
        title: "Edificio creado",
        description: "El edificio ha sido creado exitosamente.",
      })

      // Redireccionar a la lista de edificios
      router.push("/dashboard/edificios")
      router.refresh()
    } catch (error) {
      console.error("Error al crear el edificio:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Ocurrió un error al crear el edificio. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para procesar manualmente la URL del mapa
  const handleProcessMapUrl = () => {
    const url = form.getValues("mapa_url")
    if (url) {
      setLastProcessedUrl(url)
      processMapUrl(url)
    } else {
      toast({
        title: "Error",
        description: "Por favor, ingrese una URL de mapa válida.",
        variant: "destructive",
      })
    }
  }

  // Función para limpiar el campo de URL del mapa
  const handleClearMapUrl = () => {
    form.setValue("mapa_url", "")
    form.clearErrors("mapa_url")
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre *</FormLabel>
              <FormControl>
                <Input placeholder="Nombre del edificio" {...field} />
              </FormControl>
              <FormDescription>Nombre o identificador del edificio (obligatorio).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mapa_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL del Mapa (opcional)</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="https://maps.app.goo.gl/..."
                      {...field}
                      onChange={(e) => {
                        field.onChange(e)
                      }}
                    />
                    {isProcessingMap && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleProcessMapUrl}
                    disabled={isProcessingMap || !field.value}
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    Obtener
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearMapUrl}
                    disabled={isProcessingMap || !field.value}
                  >
                    Limpiar
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                URL de Google Maps (puede dejarse en blanco). La información se obtendrá automáticamente al pegar la URL
                o al hacer clic en "Obtener".
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="direccion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Dirección del edificio" {...field} />
              </FormControl>
              <FormDescription>Dirección física del edificio.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="latitud"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitud (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="-34.6037" {...field} />
                </FormControl>
                <FormDescription>Coordenada de latitud.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="longitud"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Longitud (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="-58.3816" {...field} />
                </FormControl>
                <FormDescription>Coordenada de longitud.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="cuit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CUIT (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="XX-XXXXXXXX-X" {...field} />
              </FormControl>
              <FormDescription>CUIT del edificio. Se almacenará sin guiones ni espacios.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="estado"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado (opcional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un estado" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="en_obra">En Obra</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>Estado actual del edificio.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="id_administrador"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Administrador (opcional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un administrador" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">Sin administrador</SelectItem>
                  {administradores.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id.toString()}>
                      {admin.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Administrador asignado al edificio.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botón de guardar con espacio adicional */}
        <div className="mt-12 mb-24">
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-lg"
            disabled={isLoading || isProcessingMap}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" /> Guardar Edificio
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
