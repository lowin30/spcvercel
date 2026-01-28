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
  }
  supabaseClient: any; // Cliente Supabase pasado como prop
  administradores: { id: number; nombre: string }[]
  edificios: { id: number; nombre: string; id_administrador: number | null }[]
  departamentos: { id: number; nombre: string }[] // Se recibirá vacío
  // Chat Integration Props (SPC v9.5)
  isChatVariant?: boolean
  onSuccess?: () => void
}

export function ContactoForm({ contacto, supabaseClient, administradores, edificios, departamentos, isChatVariant = false, onSuccess }: ContactoFormProps) {
  const router = useRouter()
  const supabase = supabaseClient // Usar el cliente Supabase de las props
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filteredEdificios, setFilteredEdificios] = useState(edificios)
  const [selectedAdministrador, setSelectedAdministrador] = useState<string | null>(null)
  const [selectedEdificio, setSelectedEdificio] = useState<string | null>(null)
  const [edificioNombre, setEdificioNombre] = useState<string>("")
  const [nombreSugerido, setNombreSugerido] = useState<string>("")
  const [existingNames, setExistingNames] = useState<string[]>([])
  const [isLoadingNames, setIsLoadingNames] = useState(false)

  // Valores por defecto para el formulario
  const defaultValues: Partial<ContactoFormValues> = {
    nombre: contacto?.nombre || "",
    nombreReal: contacto?.nombre || "",
    telefono: contacto?.telefono || "",
    email: contacto?.email || "",
    tipo_padre: (contacto?.tipo_padre as "administrador" | "edificio" | "departamento") || "edificio",
    id_padre: contacto ? String(contacto.id_padre) : "0",
    departamento: contacto?.departamento || "",
    notas: contacto?.notas || "",
    id_administrador: "",
    id_edificio: "",
    editarManualmente: false,
  }

  const form = useForm<ContactoFormValues>({
    resolver: zodResolver(contactoSchema),
    defaultValues,
  })

  // Obtener el tipo de padre seleccionado
  const tipoPadre = form.watch("tipo_padre")
  const idAdministrador = form.watch("id_administrador")
  const idEdificio = form.watch("id_edificio")
  const nombreReal = form.watch("nombreReal")
  const departamentoValue = form.watch("departamento")
  const editarManualmente = form.watch("editarManualmente")

  // Cargar nombres existentes para verificar unicidad
  useEffect(() => {
    const loadExistingNames = async () => {
      setIsLoadingNames(true)
      try {
        const { data, error } = await supabase.from("contactos").select("nombre")
        if (error) {
          console.error("Error al cargar nombres existentes:", error)
          return
        }

        if (data) {
          const names = data.map((item) => item.nombre)
          setExistingNames(names)
        }
      } catch (error) {
        console.error("Error al cargar nombres:", error)
      } finally {
        setIsLoadingNames(false)
      }
    }

    loadExistingNames()
  }, [supabase])

  // Filtrar edificios cuando cambia el administrador seleccionado
  useEffect(() => {
    if (idAdministrador) {
      setSelectedAdministrador(idAdministrador)
      const filtered = edificios.filter((edificio) => edificio.id_administrador === Number.parseInt(idAdministrador))
      setFilteredEdificios(filtered)

      // Resetear el edificio seleccionado si no está en la lista filtrada
      const edificioExiste = filtered.some((e) => String(e.id) === idEdificio)
      if (!edificioExiste && idEdificio) {
        form.setValue("id_edificio", "")
        setSelectedEdificio(null)
        setEdificioNombre("")
      }
    } else {
      setFilteredEdificios(edificios)
      setSelectedAdministrador(null)
    }
  }, [idAdministrador, edificios, form, idEdificio])

  // Actualizar el nombre del edificio cuando cambia el edificio seleccionado
  useEffect(() => {
    if (idEdificio) {
      setSelectedEdificio(idEdificio)
      const edificio = edificios.find((e) => String(e.id) === idEdificio)
      if (edificio) {
        setEdificioNombre(edificio.nombre)
      }
    } else {
      setSelectedEdificio(null)
      setEdificioNombre("")
    }
  }, [idEdificio, edificios])

  // Generar nombre automáticamente
  useEffect(() => {
    if (!editarManualmente && tipoPadre === "edificio" && edificioNombre && departamentoValue && nombreReal) {
      // Limpiar y normalizar los valores
      const edificioClean = edificioNombre.trim().replace(/\s+/g, "-").toLowerCase()
      const deptoClean = departamentoValue.trim().replace(/\s+/g, "-").toLowerCase()
      const nombreClean = nombreReal.trim().replace(/\s+/g, "-").toLowerCase()

      // Generar el nombre sugerido (sin espacios, todo de corrido con guiones)
      const nombreBase = `${edificioClean}-${deptoClean}-${nombreClean}`

      // Verificar si el nombre ya existe y añadir sufijo si es necesario
      let nombreFinal = nombreBase
      let contador = 1

      while (existingNames.includes(nombreFinal) && contacto?.nombre !== nombreFinal) {
        nombreFinal = `${nombreBase}-${contador}`
        contador++
      }

      setNombreSugerido(nombreFinal)

      // Actualizar el campo nombre en el formulario
      form.setValue("nombre", nombreFinal)
    }
  }, [tipoPadre, edificioNombre, departamentoValue, nombreReal, existingNames, editarManualmente, form, contacto])

  // Función para manejar el envío del formulario
  const onSubmit = async (data: ContactoFormValues) => {
    setIsSubmitting(true)
    try {
      // Verificar si el nombre ya existe (excepto si es el mismo contacto que estamos editando)
      if (existingNames.includes(data.nombre) && (!contacto || contacto.nombre !== data.nombre)) {
        toast({
          title: "Nombre duplicado",
          description: "Ya existe un contacto con este nombre. Por favor, modifique el nombre.",
          variant: "destructive",
        })
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
      }

      let response

      if (contacto) {
        // Actualizar contacto existente
        response = await supabase.from("contactos").update(formattedData).eq("id", contacto.id).select()
      } else {
        // Crear nuevo contacto
        response = await supabase.from("contactos").insert(formattedData).select()
      }

      if (response.error) {
        throw new Error(response.error.message)
      }

      toast({
        title: contacto ? "Contacto actualizado" : "Contacto creado",
        description: contacto
          ? `El contacto ${data.nombre} ha sido actualizado correctamente.`
          : `El contacto ${data.nombre} ha sido creado correctamente.`,
      })

      // Chat variant: trigger callback
      if (isChatVariant && onSuccess) {
        onSuccess()
      } else {
        // Redirigir a la lista de contactos
        router.push("/dashboard/contactos")
        router.refresh()
      }
    } catch (error) {
      console.error("Error al guardar el contacto:", error)
      toast({
        title: "Error al guardar",
        description: "Ha ocurrido un error al guardar el contacto. Inténtelo de nuevo.",
        variant: "destructive",
      })
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
