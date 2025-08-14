"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useToast } from "@/components/ui/use-toast"
import { getSupabaseClient } from "@/lib/supabase-client"

// UI Components
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

// Icons
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ChevronLeft,
  HelpCircle,
  Loader2,
  Phone,
  Plus,
  Save,
  Star,
  Trash2,
  User,
  Users,
} from "lucide-react"

// Esquema de validación para teléfonos
const telefonoSchema = z.object({
  id: z.string().optional(),
  nombre_contacto: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  relacion: z.string().min(1, "La relación es requerida"),
  numero: z.string()
    .min(8, "El número debe tener al menos 8 dígitos")
    .refine(val => /^\d+$/.test(val), "Solo se permiten números sin espacios ni guiones"),
  es_principal: z.boolean().default(false),
  notas: z.string().optional(),
});

// Esquema del formulario completo
const formSchema = z.object({
  edificio_id: z.string(),
  departamento_id: z.string(),
  telefonos: z.array(telefonoSchema).min(1, "Debe haber al menos un teléfono"),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditarContactoPage() {
  // Usar useParams para obtener los parámetros de la URL en componentes cliente
  const params = useParams();
  const id = params?.id as string;
  const { toast } = useToast();
  const router = useRouter();
  
  // Estados para los datos
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  
  // Estados para los datos relacionados
  const [edificios, setEdificios] = useState<any[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [edificioSeleccionado, setEdificioSeleccionado] = useState<any>(null);
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState<any>(null);

  // Inicialización del formulario
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      edificio_id: "",
      departamento_id: "",
      telefonos: [
        {
          nombre_contacto: "",
          relacion: "",
          numero: "",
          es_principal: true,
          notas: "",
        },
      ],
    },
    mode: "onBlur",
  });

  // Función para limpiar un número de teléfono (eliminar espacios, guiones, etc.)
  const limpiarNumero = (numero: string) => {
    return numero.replace(/\D/g, ''); // Elimina todo lo que no sea dígito
  };
  
  useEffect(() => {
    async function cargarDatos() {
      try {
        setLoading(true);
        const supabase = getSupabaseClient();
        
        // Verificar sesión de usuario
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast({
            title: "Sesión expirada",
            description: "Por favor inicia sesión nuevamente",
            variant: "destructive",
          });
          router.push("/login");
          return;
        }
        
        // Obtener detalles del usuario
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", session.user.id)
          .single();
          
        if (userError) {
          console.error("Error al obtener detalles del usuario:", userError);
          setError("Error al obtener detalles del usuario");
          return;
        }
        
        if (!userData) {
          setError("No se encontraron detalles del usuario");
          return;
        }
        
        setUserDetails(userData);
        
        // Verificar si el usuario tiene permisos para editar contactos (solo admin)
        if (userData.rol !== "admin") {
          toast({
            title: "Acceso denegado",
            description: "No tienes permisos para editar contactos",
            variant: "destructive",
          });
          router.push("/dashboard");
          return;
        }
        
        // Obtener todos los edificios
        const { data: edificiosData, error: edificiosError } = await supabase
          .from("edificios")
          .select("id, nombre");
          
        if (edificiosError) {
          console.error("Error al obtener edificios:", edificiosError);
          setError("Error al cargar la lista de edificios");
          return;
        }
        
        setEdificios(edificiosData || []);
        
        // Obtener todos los departamentos
        const { data: departamentosData, error: departamentosError } = await supabase
          .from("departamentos")
          .select("id, codigo, edificio_id, propietario");
          
        if (departamentosError) {
          console.error("Error al obtener departamentos:", departamentosError);
          setError("Error al cargar la lista de departamentos");
          return;
        }
        
        setDepartamentos(departamentosData || []);
        
        // Obtener los teléfonos del departamento usando el ID de la URL (departamento_id)
        const departamentoId = decodeURIComponent(id);
        
        const { data: telefonosData, error: telefonosError } = await supabase
          .from("telefonos_departamento")
          .select(`
            id,
            numero,
            nombre_contacto,
            relacion,
            es_principal,
            notas,
            departamento_id,
            departamentos(
              id,
              codigo,
              edificio_id,
              edificios(id, nombre)
            )
          `)
          .eq("departamento_id", departamentoId);
          
        if (telefonosError) {
          console.error("Error al obtener teléfonos:", telefonosError);
          setError("Error al cargar los datos de contacto");
          return;
        }
        
        if (!telefonosData || telefonosData.length === 0) {
          toast({
            title: "Contacto no encontrado",
            description: "No se encontraron datos para el contacto especificado",
            variant: "destructive",
          });
          router.push("/dashboard/contactos");
          return;
        }
        
        // Obtener edificio y departamento del primer teléfono
        const primerTelefono = telefonosData[0];
        const departamento = primerTelefono.departamentos;
        const edificioId = departamento.edificio_id.toString();
        const deptoId = primerTelefono.departamento_id.toString(); // Cambiado a deptoId para evitar duplicidad
        
        // Buscar los objetos completos
        const edificioSeleccionado = edificiosData.find(e => e.id.toString() === edificioId);
        const departamentoSeleccionado = departamentosData.find(d => d.id.toString() === deptoId);
        
        setEdificioSeleccionado(edificioSeleccionado);
        setDepartamentoSeleccionado(departamentoSeleccionado);
        
        // Formatear los teléfonos para el formulario
        const telefonosFormateados = telefonosData.map(tel => ({
          id: tel.id,
          nombre_contacto: tel.nombre_contacto,
          relacion: tel.relacion,
          numero: limpiarNumero(tel.numero), // Asegurar que no tenga formatos
          es_principal: tel.es_principal || false,
          notas: tel.notas || "",
        }));
        
        // Actualizar el formulario con los datos obtenidos
        form.reset({
          edificio_id: edificioId,
          departamento_id: deptoId, // Usar deptoId en lugar de departamentoId
          telefonos: telefonosFormateados,
        });
        
        // Imprimimos los valores para depuración
        console.log("Formulario inicializado con:", {
          edificioId,
          departamentoId: deptoId,
          telefonos: telefonosFormateados
        });
        
      } catch (err) {
        console.error("Error inesperado:", err);
        setError("Ocurrió un error inesperado al cargar los datos");
      } finally {
        setLoading(false);
      }
    }
    
    cargarDatos();
  }, [id, router, toast, form]);

  // Función para guardar los cambios
  const onSubmit = async (data: FormValues) => {
    try {
      setSaving(true);
      console.log("Form data submitted:", data);
      console.log("Form is valid:", form.formState.isValid);
      console.log("Form errors:", form.formState.errors);
      
      // Forzamos el ID del departamento desde la URL
      const departamentoId = id;
      console.log("Usando departamento_id desde URL:", departamentoId);
      
      if (!departamentoId) {
        throw new Error("ID del departamento no encontrado en la URL");
      }

      // Validación manual de los campos requeridos
      const telefonos = data.telefonos || [];
      if (telefonos.length === 0) {
        toast({
          title: "Error de validación",
          description: "Debe haber al menos un teléfono",
          variant: "destructive"
        });
        setSaving(false);
        return;
      }

      for (const tel of telefonos) {
        if (!tel.nombre_contacto || tel.nombre_contacto.length < 2) {
          toast({
            title: "Error de validación",
            description: "El nombre de contacto debe tener al menos 2 caracteres",
            variant: "destructive"
          });
          setSaving(false);
          return;
        }
        if (!tel.relacion) {
          toast({
            title: "Error de validación",
            description: "La relación es requerida",
            variant: "destructive"
          });
          setSaving(false);
          return;
        }
        if (!tel.numero || tel.numero.length < 8 || !/^\d+$/.test(tel.numero)) {
          toast({
            title: "Error de validación",
            description: "El número debe tener al menos 8 dígitos y contener solo números",
            variant: "destructive"
          });
          setSaving(false);
          return;
        }
      }
      
      const supabase = getSupabaseClient();
      
      // Procesar los teléfonos para asegurar que no tienen formato
      const telefonosProcesados = telefonos.map(tel => ({
        ...tel,
        numero: limpiarNumero(tel.numero)
      }));
      
      console.log("Guardando cambios para departamento_id:", departamentoId);
      console.log("Teléfonos procesados:", telefonosProcesados);
      
      // Primero procesamos todos los teléfonos existentes (con ID)
      for (const telefono of telefonosProcesados) {
        if (telefono.id) {
          const { error } = await supabase
            .from("telefonos_departamento")
            .update({
              nombre_contacto: telefono.nombre_contacto,
              relacion: telefono.relacion,
              numero: telefono.numero,
              es_principal: telefono.es_principal,
              notas: telefono.notas || null,
              departamento_id: parseInt(departamentoId)
            })
            .eq("id", telefono.id);
          
          if (error) {
            console.error("Error al actualizar teléfono:", error);
            throw new Error(`Error al actualizar teléfono: ${error.message}`);
          }
        } else {
          // Si no tiene ID, es un teléfono nuevo
          const { error } = await supabase
            .from("telefonos_departamento")
            .insert({
              nombre_contacto: telefono.nombre_contacto,
              relacion: telefono.relacion,
              numero: telefono.numero,
              es_principal: telefono.es_principal,
              notas: telefono.notas || null,
              departamento_id: parseInt(departamentoId)
            });
          
          if (error) {
            console.error("Error al insertar nuevo teléfono:", error);
            throw new Error(`Error al insertar nuevo teléfono: ${error.message}`);
          }
        }
      }
      
      toast({
        title: "Contacto actualizado",
        description: "Los cambios han sido guardados correctamente",
      });
      
      // Redirigir a la lista de contactos
      router.push("/dashboard/contactos");
      
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: error.message || "Ocurrió un error al guardar los cambios",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Función para eliminar un teléfono
  const eliminarTelefono = async (index: number, id?: string) => {
    // Si tiene ID, primero eliminar de la base de datos
    if (id) {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from("telefonos_departamento").delete().eq("id", id);
        
        if (error) {
          toast({
            title: "Error al eliminar",
            description: "No se pudo eliminar el teléfono",
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: "Teléfono eliminado",
          description: "El teléfono ha sido eliminado correctamente",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Ocurrió un error al eliminar el teléfono",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Eliminar del formulario
    const telefonos = form.getValues("telefonos");
    if (telefonos.length <= 1) {
      toast({
        title: "Acción no permitida",
        description: "Debe existir al menos un teléfono para el contacto",
        variant: "destructive",
      });
      return;
    }
    
    const nuevosTelefonos = [...telefonos];
    nuevosTelefonos.splice(index, 1);
    form.setValue("telefonos", nuevosTelefonos);
  };
  
  // Función para agregar un nuevo teléfono
  const agregarTelefono = () => {
    const telefonos = form.getValues("telefonos");
    const nombreContacto = telefonos[0]?.nombre_contacto || "";
    
    form.setValue("telefonos", [
      ...telefonos,
      {
        nombre_contacto: nombreContacto,
        relacion: "",
        numero: "",
        es_principal: false,
        notas: ""
      }
    ]);
  };
  
  // Renderizar estados de carga y error
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <Loader2 className="h-12 w-12 text-primary mb-4 animate-spin" />
        <h1 className="text-2xl font-bold mb-4">Cargando datos</h1>
        <p className="text-muted-foreground mb-6 text-center">
          Espera un momento mientras cargamos la información...
        </p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-muted-foreground mb-6 text-center">{error}</p>
        <Button asChild>
          <Link href="/dashboard/contactos">Volver a contactos</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link href="/dashboard/contactos">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Editar Contacto</h1>
      </div>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Edificio</Label>
              <div className="p-2 border rounded-md bg-muted">
                {edificioSeleccionado?.nombre || "No disponible"}
              </div>
            </div>
            <div>
              <Label>Departamento</Label>
              <div className="p-2 border rounded-md bg-muted">
                {departamentoSeleccionado?.codigo || "No disponible"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Debug del formulario */}
      <div className="mb-4 p-4 bg-gray-100 rounded-md">
        <p className="text-xs font-mono">Estado del formulario: {form.formState.isSubmitted ? "Enviado" : "No enviado"}</p>
        <p className="text-xs font-mono">ID del departamento: {id}</p>
      </div>
      
      <Form {...form}>
        {/* Usamos una etiqueta div en lugar de form para evitar problemas de submit */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold flex items-center">
                    <Phone className="mr-2 h-5 w-5" /> Teléfonos de contacto
                  </h2>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={agregarTelefono}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Añadir teléfono
                  </Button>
                </div>
                
                {form.watch("telefonos").map((telefono, index) => (
                  <div key={index} className="p-4 border rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <FormField
                        control={form.control}
                        name={`telefonos.${index}.nombre_contacto`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre del contacto</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`telefonos.${index}.relacion`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relación</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ej: Propietario, Encargado" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <FormField
                        control={form.control}
                        name={`telefonos.${index}.numero`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Solo números, sin espacios ni guiones"
                                onChange={(e) => {
                                  // Limpiar el número al ingresar
                                  const cleaned = limpiarNumero(e.target.value);
                                  field.onChange(cleaned);
                                }}
                              />
                            </FormControl>
                            <FormDescription>Formato: solo números (ej: 5491150055262)</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`telefonos.${index}.notas`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notas (opcional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Información adicional sobre este contacto"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <FormField
                        control={form.control}
                        name={`telefonos.${index}.es_principal`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox 
                                checked={field.value} 
                                onCheckedChange={field.onChange} 
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="flex items-center">
                                <Star className="h-4 w-4 mr-1 text-amber-500" />
                                Teléfono principal
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => eliminarTelefono(index, telefono.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end space-x-4">
            <Button variant="outline" type="button" asChild>
              <Link href="/dashboard/contactos">Cancelar</Link>
            </Button>
            <Button 
              type="button" 
              disabled={saving}
              onClick={async () => {
                try {
                  setSaving(true);
                  console.log("Botón guardar presionado directamente");
                  
                  // Obtener los valores actuales del formulario
                  const telefonosData = form.getValues("telefonos");
                  console.log("Teléfonos a guardar:", telefonosData);
                  
                  const supabase = getSupabaseClient();
                  const departamentoId = id;
                  
                  if (!departamentoId) {
                    throw new Error("ID de departamento no válido");
                  }
                  
                  // Iterar sobre los teléfonos y actualizar/insertar
                  for (const telefono of telefonosData) {
                    const telefonoLimpio = {
                      nombre_contacto: telefono.nombre_contacto,
                      relacion: telefono.relacion,
                      numero: limpiarNumero(telefono.numero),
                      es_principal: telefono.es_principal || false,
                      notas: telefono.notas || null,
                      departamento_id: parseInt(departamentoId)
                    };
                    
                    if (telefono.id) {
                      // Actualizar teléfono existente
                      const { error } = await supabase
                        .from("telefonos_departamento")
                        .update(telefonoLimpio)
                        .eq("id", telefono.id);
                      
                      if (error) {
                        throw new Error(`Error al actualizar: ${error.message}`);
                      }
                    } else {
                      // Insertar nuevo teléfono
                      const { error } = await supabase
                        .from("telefonos_departamento")
                        .insert(telefonoLimpio);
                      
                      if (error) {
                        throw new Error(`Error al insertar: ${error.message}`);
                      }
                    }
                  }
                  
                  // Notificar éxito
                  toast({
                    title: "Cambios guardados",
                    description: "Los contactos han sido actualizados exitosamente",
                  });
                  
                  // Redirigir a la página de contactos
                  router.push("/dashboard/contactos");
                } catch (error: any) {
                  console.error("Error al guardar contactos:", error);
                  toast({
                    title: "Error al guardar",
                    description: error.message || "Ocurrió un error inesperado",
                    variant: "destructive"
                  });
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar cambios
                </>
              )}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
