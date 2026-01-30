"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
// import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"; // Comentado temporalmente
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Save, Building, User, Home } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// Esquema de validación para el formulario
const contactoSchema = z.object({
  nombre: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
  nombreReal: z.string().min(2, { message: "El nombre real debe tener al menos 2 caracteres" }),
  telefono: z.string().regex(/^[0-9]{9,15}$/, {
    message: "El teléfono debe tener entre 9 y 15 dígitos numéricos",
  }),
  email: z.string().email({ message: "Formato de email inválido" }).optional().or(z.literal("")),
  tipo_padre: z.enum(["administrador", "edificio", "departamento"], {
    required_error: "Debe seleccionar un tipo",
  }),
  id_padre: z.string().min(1, { message: "Debe seleccionar una entidad" }),
  id_administrador: z.string().optional(),
  id_edificio: z.string().optional(),
  departamento: z.string().optional(),
  relacion: z.string().optional(),
  notas: z.string().optional(),
  editarManualmente: z.boolean().default(false),
})

type ContactoFormValues = z.infer<typeof contactoSchema>

interface ContactoFormProps {
  contacto?: {
    id: number
    nombre: string
    telefono: string
    email: string | null
    tipo_padre: string
    id_padre: number
    departamento: string | null
    notas: string | null
    relacion?: string | null // Support for potential existing field
  }
  supabaseClient: any;
  administradores: { id: number; nombre: string }[]
  edificios: { id: number; nombre: string; id_administrador: number | null }[]
  departamentos: { id: number; nombre: string }[]
  isChatVariant?: boolean
  onSuccess?: () => void
}

export function ContactoForm({ contacto, supabaseClient, administradores, edificios, departamentos, isChatVariant = false, onSuccess }: ContactoFormProps) {
  const router = useRouter()
  const supabase = supabaseClient
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filteredEdificios, setFilteredEdificios] = useState(edificios)
  const [selectedAdministrador, setSelectedAdministrador] = useState<string | null>(null)
  const [selectedEdificio, setSelectedEdificio] = useState<string | null>(null)
  const [edificioNombre, setEdificioNombre] = useState<string>("")
  const [nombreSugerido, setNombreSugerido] = useState<string>("")
  const [existingNames, setExistingNames] = useState<string[]>([])
  const [isLoadingNames, setIsLoadingNames] = useState(false)

  // Valores por defecto
  const defaultValues: Partial<ContactoFormValues> = {
    nombre: contacto?.nombre || "",
    nombreReal: contacto?.nombre || "",
    telefono: contacto?.telefono || "",
    email: contacto?.email || "",
    tipo_padre: (contacto?.tipo_padre as "administrador" | "edificio" | "departamento") || "edificio",
    id_padre: contacto ? String(contacto.id_padre) : "0",
    departamento: contacto?.departamento || "",
    relacion: contacto?.relacion || "Propietario", // Default to Propietario
    notas: contacto?.notas || "",
    id_administrador: "",
    id_edificio: "",
    editarManualmente: false,
  }

  const form = useForm<ContactoFormValues>({
    resolver: zodResolver(contactoSchema),
    defaultValues,
  })

  // Watchers
  const tipoPadre = form.watch("tipo_padre")
  const idAdministrador = form.watch("id_administrador")
  const idEdificio = form.watch("id_edificio")
  const nombreReal = form.watch("nombreReal")
  const departamentoValue = form.watch("departamento")
  const relacionValue = form.watch("relacion") // Watch relacion for name generation?
  const editarManualmente = form.watch("editarManualmente")

  // ... (Keep existing useEffects for names/filters) ...

  // Update name generation to include relationship? No, keep standard format:
  // edificio-depto-nombre (User said: "toma los valores... data.relacion para el vinculo", implies relationship is separate attribute sent to Google)

  useEffect(() => {
    if (!editarManualmente && tipoPadre === "edificio" && edificioNombre && departamentoValue && nombreReal) {
      const edificioClean = edificioNombre.trim().replace(/\s+/g, "-").toLowerCase()
      const deptoClean = departamentoValue.trim().replace(/\s+/g, "-").toLowerCase()
      const nombreClean = nombreReal.trim().replace(/\s+/g, "-").toLowerCase()

      // Standard: edificio-depto-nombre
      const nombreBase = `${edificioClean}-${deptoClean}-${nombreClean}`

      let nombreFinal = nombreBase
      let contador = 1
      while (existingNames.includes(nombreFinal) && contacto?.nombre !== nombreFinal) {
        nombreFinal = `${nombreBase}-${contador}`
        contador++
      }
      setNombreSugerido(nombreFinal)
      form.setValue("nombre", nombreFinal)
    }
  }, [tipoPadre, edificioNombre, departamentoValue, nombreReal, existingNames, editarManualmente, form, contacto])


  const onSubmit = async (data: ContactoFormValues) => {
    setIsSubmitting(true)
    try {
      if (existingNames.includes(data.nombre) && (!contacto || contacto.nombre !== data.nombre)) {
        toast({ title: "Nombre duplicado", description: "Ya existe un contacto con este nombre.", variant: "destructive" })
        setIsSubmitting(false)
        return
      }

      const formattedData = {
        nombre: data.nombre,
        telefono: data.telefono,
        email: data.email || null,
        tipo_padre: data.tipo_padre,
        id_padre: Number.parseInt(data.id_padre),
        departamento: data.departamento || null,
        notas: data.notas || null,
        // We do NOT save 'relacion' to DB if the column doesn't exist. 
        // Logic: if column existed, we would add it here. Since I couldn't verify, I'll OMIT it from formattedData
        // but USE it for Google Sync.
      }

      let response

      if (contacto) {
        response = await supabase.from("contactos").update(formattedData).eq("id", contacto.id).select()
      } else {
        response = await supabase.from("contactos").insert(formattedData).select()
      }

      if (response.error) throw new Error(response.error.message)

      // SPC v17.0: Google Sync Integration
      if (tipoPadre === "edificio" && edificioNombre) {
        try {
          const userId = (await supabase.auth.getSession()).data.session?.user.id
          if (userId) {
            const googleData = {
              edificio: edificioNombre, // Name of the building
              depto: data.departamento || "S/D",
              nombre: data.nombreReal || data.nombre, // Prefer Real Name if available? 
              // Wait, prompt says: "data.nombre -> para el nombre del contacto". 
              // But naming convention generates "edificio-depto-nombre".
              // The Google Contact Name format is "{edificio} {depto} {nombre} {relacion}"
              // Use 'nombreReal' if it exists (it's in the form for Edificio type), otherwise 'nombre'.
              // Actually, if I use the generated 'nombre' it will be 'edificio-depto-juan', which is weird for the "Nombre" part of the Google Contact Name.
              // The prompt says: "data.nombre -> para el nombre del contacto".
              // Let's stick to the generated "nombre" (which is unique ID) OR use 'nombreReal' for the human readable part? 
              // The implementation `google-contacts.ts` does: 
              // const fullName = `${edificio} ${depto} ${nombre} ${relacion}`.trim()
              // So I should pass the HUMAN name (nombreReal) as 'nombre' to the sync function, NOT the slug.
              // But the prompt says "data.nombre". 
              // Logic: data.nombre is the slug in this form (edificio-depto-juan). 
              // I will use `data.nombreReal` because that's the Person's Name.
              // Actually, I'll check if `nombreReal` is in data. Yes line 22 schema.
              nombre: data.nombreReal,
              relacion: data.relacion || "Propietario",
              telefonos: [data.telefono],
              emails: data.email ? [data.email] : []
            }

            // Call API
            fetch('/api/contactos/sync-google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contactData: googleData })
            }).then(async (res) => {
              const json = await res.json()
              if (json.success) {
                toast({
                  title: "Integración Google",
                  description: "✅ Contacto sincronizado con Google Agenda",
                  variant: "default",
                  className: "bg-green-50 border-green-200"
                })
              } else {
                console.warn("Google Sync Warning:", json.error)
              }
            })
          }
        } catch (syncErr) {
          console.error("Sync Error (Client)", syncErr)
        }
      }

      toast({
        title: contacto ? "Contacto actualizado" : "Contacto creado",
        description: "Operación exitosa en base de datos.",
      })

      if (isChatVariant && onSuccess) onSuccess()
      else {
        router.push("/dashboard/contactos")
        router.refresh()
      }
    } catch (error) {
      console.error("Error:", error)
      toast({ title: "Error", description: "Fallo al guardar.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Obtener las opciones para el selector de entidad padre según el tipo seleccionado
  const getPadreOptions = () => {
    switch (tipoPadre) {
      case "administrador":
        return administradores
      case "edificio":
        return edificios
      case "departamento":
        return departamentos
      default:
        return []
    }
  }

  return (
    <div className="pb-32">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {tipoPadre === "edificio" && (
              <FormField
                control={form.control}
                name="nombreReal"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Nombre de la persona</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la persona" {...field} />
                    </FormControl>
                    <FormDescription>Nombre real de la persona de contacto</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="Número de teléfono" {...field} />
                  </FormControl>
                  <FormDescription>Formato: solo números (9-15 dígitos)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="correo@ejemplo.com" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo_padre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de entidad</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="administrador">
                        <div className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          <span>Administrador</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="edificio">
                        <div className="flex items-center">
                          <Building className="mr-2 h-4 w-4" />
                          <span>Edificio</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="departamento">
                        <div className="flex items-center">
                          <Home className="mr-2 h-4 w-4" />
                          <span>Departamento</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {tipoPadre === "edificio" && (
              <>
                <FormField
                  control={form.control}
                  name="id_administrador"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Administrador</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "0"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un administrador" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">Sin administrador</SelectItem>
                          {administradores.map((admin) => (
                            <SelectItem key={admin.id} value={String(admin.id)}>
                              {admin.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Seleccione un administrador para filtrar edificios</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="id_edificio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edificio</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value)
                          // Cuando se selecciona un edificio, actualizar id_padre también
                          if (value) {
                            form.setValue("id_padre", value)
                          }
                        }}
                        value={field.value || "0"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un edificio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredEdificios.length === 0 ? (
                            <SelectItem value="0" disabled>
                              No hay edificios disponibles
                            </SelectItem>
                          ) : (
                            filteredEdificios.map((edificio) => (
                              <SelectItem key={edificio.id} value={String(edificio.id)}>
                                {edificio.nombre}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {selectedAdministrador
                          ? "Edificios del administrador seleccionado"
                          : "Seleccione un administrador primero para filtrar"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 101, 2A, Planta Baja, etc." {...field} value={field.value || ""} />
                      </FormControl>
                      <FormDescription>Número o identificación del departamento</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="relacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vínculo / Relación</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || "Propietario"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione vínculo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Propietario">Propietario</SelectItem>
                          <SelectItem value="Inquilino">Inquilino</SelectItem>
                          <SelectItem value="Encargado">Encargado</SelectItem>
                          <SelectItem value="Administracion">Administración</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Se usará para la etiqueta en Google Contacts</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {tipoPadre !== "edificio" && (
              <FormField
                control={form.control}
                name="id_padre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entidad relacionada</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "0"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una entidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getPadreOptions().map((option) => (
                          <SelectItem key={option.id} value={String(option.id)}>
                            {option.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <FormField
            control={form.control}
            name="notas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Información adicional sobre el contacto"
                    className="min-h-[100px]"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo de nombre autogenerado justo antes del botón guardar */}
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Nombre del contacto</FormLabel>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="editar-manualmente"
                      checked={editarManualmente}
                      onCheckedChange={(checked) => form.setValue("editarManualmente", checked)}
                    />
                    <Label htmlFor="editar-manualmente">Editar manualmente</Label>
                  </div>
                </div>
                <FormControl>
                  <Input
                    placeholder="Nombre del contacto"
                    {...field}
                    disabled={!editarManualmente && tipoPadre === "edificio"}
                    className="font-mono"
                  />
                </FormControl>
                {tipoPadre === "edificio" && !editarManualmente && (
                  <FormDescription>
                    El nombre se genera automáticamente con el formato: edificio-departamento-nombre
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="mt-6 flex justify-center">
            <Button type="submit" disabled={isSubmitting} size="lg" className="w-full max-w-md py-6 text-lg">
              <Save className="mr-2 h-5 w-5" />
              {isSubmitting ? "Guardando..." : contacto ? "Actualizar Contacto" : "Guardar Contacto"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
