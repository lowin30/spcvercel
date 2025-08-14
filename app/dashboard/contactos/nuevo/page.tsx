"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { z } from "zod"
import { Loader2, Plus, Trash2, X, Save, ArrowLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getSupabaseClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

// Esquema de validación para contactos
const telefonoSchema = z.object({
  nombre_contacto: z.string().min(3, "El nombre del contacto es obligatorio"),
  relacion: z.string().min(1, "La relación es obligatoria"),
  numero: z.string()
    .min(8, "El número de teléfono debe tener al menos 8 caracteres")
    .refine((val) => /^(\+\d{1,3}\s?)?(\d\s?){8,}$/.test(val.replace(/[-\s]/g, "")), {
      message: "Formato de teléfono inválido (Ej: +54 9 11 5005-5262)",
    }),
  es_principal: z.boolean().default(false),
  notas: z.string().optional(),
});

// Esquema de validación para el formulario completo
const formSchema = z.object({
  edificio_id: z.string().min(1, "Debe seleccionar un edificio"),
  departamento_id: z.string().min(1, "Debe seleccionar un departamento"),
  telefonos: z.array(telefonoSchema).min(1, "Debe agregar al menos un teléfono"),
});

// Esquema para nuevo departamento
const nuevoDepartamentoSchema = z.object({
  edificio_id: z.string().min(1, "Debe seleccionar un edificio"),
  codigo: z.string().min(1, "El código del departamento es obligatorio"),
  propietario: z.string().optional(),
});

// Relaciones comunes para autocompletado
const relacionesComunes = [
  "Propietario",
  "Inquilino", 
  "Padre",
  "Madre",
  "Hijo",
  "Hija",
  "Hermano",
  "Hermana",
  "Tío",
  "Tía",
  "Abuelo",
  "Abuela",
  "Amigo",
  "Vecino",
  "Pareja",
  "Esposo",
  "Esposa",
  "Encargado",
  "Cuidador",
];

export default function NuevoContactoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Datos para selección
  const [edificios, setEdificios] = useState<any[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [departamentosFiltrados, setDepartamentosFiltrados] = useState<any[]>([]);
  const [busquedaDepartamento, setBusquedaDepartamento] = useState("");
  
  // Estado de usuario
  const [userDetails, setUserDetails] = useState<any>(null);
  
  // Estado para creación de nuevo departamento
  const [mostrarNuevoDepartamento, setMostrarNuevoDepartamento] = useState(false);
  const [nuevoDepartamento, setNuevoDepartamento] = useState({
    edificio_id: "",
    codigo: "",
    propietario: "",
  });
  const [guardandoDepartamento, setGuardandoDepartamento] = useState(false);
  
  // Configurar el formulario con react-hook-form y zod
  const form = useForm<z.infer<typeof formSchema>>({
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
  });
  
  // Configurar fieldArray para manejar múltiples teléfonos
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "telefonos",
  });
  
  // Carga inicial de datos
  useEffect(() => {
    async function cargarDatosIniciales() {
      try {
        setInitialLoading(true);
        const supabase = getSupabaseClient();
        
        if (!supabase) {
          setError("No se pudo inicializar el cliente de Supabase");
          return;
        }
        
        // Verificar sesión de usuario
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log("No se encontró sesión de usuario, redirigiendo al login");
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
        
        setUserDetails(userData);
        
        // Verificar si el usuario puede crear contactos (solo admin)
        const canCreateContact = userData?.rol === "admin";
        
        if (!canCreateContact) {
          toast({
            title: "Acceso denegado",
            description: "No tienes permisos para crear contactos",
            variant: "destructive",
          });
          router.push("/dashboard/contactos");
          return;
        }
        
        // Cargar edificios
        const { data: edificiosData, error: edificiosError } = await supabase
          .from("edificios")
          .select("id, nombre")
          .order("nombre");
        
        if (edificiosError) {
          console.error("Error al obtener edificios:", edificiosError);
          setError("Error al cargar edificios");
          return;
        }
        
        setEdificios(edificiosData || []);
        
        // Cargar departamentos
        const { data: departamentosData, error: deptosError } = await supabase
          .from("departamentos")
          .select(`
            id, 
            codigo,
            edificio_id,
            propietario,
            edificios(nombre)
          `)
          .order("codigo");
        
        if (deptosError) {
          if (deptosError.code === "42P01") {
            console.warn("La tabla departamentos no existe. Por favor, crea las tablas primero.");
          } else {
            console.error("Error al obtener departamentos:", deptosError);
          }
        } else {
          setDepartamentos(departamentosData || []);
          setDepartamentosFiltrados(departamentosData || []);
        }
        
      } catch (error) {
        console.error("Error inesperado:", error);
        setError("Ocurrió un error inesperado");
      } finally {
        setInitialLoading(false);
      }
    }
    
    cargarDatosIniciales();
  }, [router, toast]);
  
  // Filtrar departamentos cuando se selecciona un edificio
  useEffect(() => {
    const edificioId = form.getValues("edificio_id");
    
    if (edificioId && edificioId !== "todos") {
      const filtrados = departamentos.filter(
        (depto) => depto.edificio_id.toString() === edificioId
      );
      setDepartamentosFiltrados(filtrados);
      
      // Actualizar también el edificio del nuevo departamento
      setNuevoDepartamento(prev => ({
        ...prev,
        edificio_id: edificioId,
      }));
    } else {
      setDepartamentosFiltrados(departamentos);
    }
  }, [departamentos, form]);
  
  // Filtrar departamentos por búsqueda
  useEffect(() => {
    if (busquedaDepartamento.trim() !== "") {
      const busquedaLower = busquedaDepartamento.toLowerCase();
      const edificioId = form.getValues("edificio_id");
      let filtrados = departamentos;
      
      // Primero filtrar por edificio si está seleccionado
      if (edificioId && edificioId !== "todos") {
        filtrados = filtrados.filter(
          (depto) => depto.edificio_id.toString() === edificioId
        );
      }
      
      // Luego filtrar por texto de búsqueda
      filtrados = filtrados.filter(
        (depto) => 
          depto.codigo.toLowerCase().includes(busquedaLower) ||
          (depto.propietario && depto.propietario.toLowerCase().includes(busquedaLower))
      );
      
      setDepartamentosFiltrados(filtrados);
    } else {
      // Si no hay búsqueda, solo filtrar por edificio
      const edificioId = form.getValues("edificio_id");
      if (edificioId && edificioId !== "todos") {
        const filtrados = departamentos.filter(
          (depto) => depto.edificio_id.toString() === edificioId
        );
        setDepartamentosFiltrados(filtrados);
      } else {
        setDepartamentosFiltrados(departamentos);
      }
    }
  }, [busquedaDepartamento, departamentos, form]);
  
  // Para manejar la generación automática del nombre de contacto
  const [autoNamesGenerated, setAutoNamesGenerated] = useState(false);
  
  // Usamos un efecto separado para detectar cambios en edificio o departamento
  useEffect(() => {
    const edificioId = form.getValues("edificio_id");
    const departamentoId = form.getValues("departamento_id");
    const telefonos = form.getValues("telefonos");
    
    // Solo proceder si tenemos los datos necesarios y no hemos generado nombres para esta combinación
    if (edificioId && departamentoId && telefonos?.length > 0) {
      // Buscar los datos
      const edificio = edificios.find((e) => e.id.toString() === edificioId);
      const departamento = departamentos.find((d) => d.id.toString() === departamentoId);
      
      if (edificio && departamento) {
        // Actualizar los nombres de contactos que no tengan un nombre personalizado
        const updatedTelefonos = [...telefonos];
        let hasChanges = false;
        
        updatedTelefonos.forEach((telefono, index) => {
          // Solo actualizamos si el nombre está vacío o si parece ser un nombre generado automáticamente
          // No generamos nombres si el usuario ya los ha editado
          if (!telefono.nombre_contacto || 
              (telefono.nombre_contacto && telefono.nombre_contacto.includes(departamento.codigo))) {
            const relacion = telefono.relacion || "";
            const nombreGenerado = `${edificio.nombre} ${departamento.codigo}${relacion ? ' ' + relacion : ''}`;
            
            // Solo actualizar si el nombre ha cambiado para evitar loops infinitos
            if (nombreGenerado !== telefono.nombre_contacto) {
              updatedTelefonos[index] = {
                ...telefono,
                nombre_contacto: nombreGenerado
              };
              hasChanges = true;
            }
          }
        });
        
        // Solo actualizamos el formulario si hubo cambios
        if (hasChanges) {
          form.setValue("telefonos", updatedTelefonos, {
            shouldValidate: false,
            shouldDirty: true,
            shouldTouch: false
          });
        }
      }
    }
  }, [form.watch("edificio_id"), form.watch("departamento_id"), edificios, departamentos]);
  
  // Suscripción para actualizar nombres cuando cambia la relación
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Solo procesamos cambios en la relación de los teléfonos
      if (name && name.match(/^telefonos\.\d+\.relacion$/)) {
        const edificioId = form.getValues("edificio_id");
        const departamentoId = form.getValues("departamento_id");
        
        if (!edificioId || !departamentoId) return;
        
        const edificio = edificios.find((e) => e.id.toString() === edificioId);
        const departamento = departamentos.find((d) => d.id.toString() === departamentoId);
        
        if (!edificio || !departamento) return;
        
        // Obtener el índice del teléfono que cambió
        const match = name.match(/^telefonos\.(\d+)\.relacion$/);
        if (match && match[1]) {
          const index = parseInt(match[1]);
          const telefonos = form.getValues("telefonos");
          if (telefonos && telefonos[index]) {
            const telefono = telefonos[index];
            const relacion = telefono.relacion || "";
            const nombreGenerado = `${edificio.nombre} ${departamento.codigo}${relacion ? ' ' + relacion : ''}`;
            
            // Solo actualizamos si el nombre parece ser generado automáticamente
            if (!telefono.nombre_contacto || 
                telefono.nombre_contacto.startsWith(`${edificio.nombre} ${departamento.codigo}`)) {
              // Usamos setTimeout para evitar ciclos de actualización
              setTimeout(() => {
                form.setValue(`telefonos.${index}.nombre_contacto`, nombreGenerado, {
                  shouldValidate: false,
                  shouldDirty: true, 
                  shouldTouch: false
                });
              }, 0);
            }
          }
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, edificios, departamentos]);
  
  // Función para formatear número de teléfono
  const formatearTelefono = (numero: string): string => {
    // Eliminar cualquier caracter que no sea número o +
    let cleaned = numero.replace(/[^\d+]/g, "");
    
    // Formatear según patrón +54 9 11 5005-5262
    if (cleaned.startsWith("+")) {
      // Tiene código de país
      if (cleaned.length > 3) {
        cleaned = cleaned.substring(0, 3) + " " + cleaned.substring(3);
      }
      if (cleaned.length > 5) {
        cleaned = cleaned.substring(0, 5) + " " + cleaned.substring(5);
      }
      if (cleaned.length > 8) {
        cleaned = cleaned.substring(0, 8) + " " + cleaned.substring(8);
      }
      if (cleaned.length > 13) {
        cleaned = cleaned.substring(0, 13) + "-" + cleaned.substring(13);
      }
    } else {
      // Sin código de país, agregar espacios
      if (cleaned.length > 2) {
        cleaned = cleaned.substring(0, 2) + " " + cleaned.substring(2);
      }
      if (cleaned.length > 5) {
        cleaned = cleaned.substring(0, 5) + " " + cleaned.substring(5);
      }
      if (cleaned.length > 10) {
        cleaned = cleaned.substring(0, 10) + "-" + cleaned.substring(10);
      }
    }
    
    return cleaned;
  };
  
  // Manejar cambio en número de teléfono
  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const formateado = formatearTelefono(e.target.value);
    form.setValue(`telefonos.${index}.numero`, formateado);
  };
  
  // Crear nuevo departamento
  const handleCrearDepartamento = async () => {
    try {
      setGuardandoDepartamento(true);
      
      // Asegurarnos que el edificio_id está correctamente asignado
      const edificioId = form.getValues("edificio_id");
      const departamentoActualizado = {
        ...nuevoDepartamento,
        edificio_id: edificioId
      };
      
      // Validar datos
      const parsedData = nuevoDepartamentoSchema.safeParse(departamentoActualizado);
      if (!parsedData.success) {
        toast({
          title: "Error de validación",
          description: parsedData.error.issues[0].message,
          variant: "destructive",
        });
        return;
      }
      
      const supabase = getSupabaseClient();
      if (!supabase) {
        toast({
          title: "Error",
          description: "No se pudo inicializar el cliente de Supabase",
          variant: "destructive",
        });
        return;
      }
      
      console.log("Intentando crear departamento:", departamentoActualizado);
      
      // Verificar que no exista ya
      const { data: existente, error: errorBusqueda } = await supabase
        .from("departamentos")
        .select("id")
        .eq("edificio_id", departamentoActualizado.edificio_id)
        .eq("codigo", departamentoActualizado.codigo)
        .maybeSingle();
      
      if (existente) {
        toast({
          title: "Departamento duplicado",
          description: "Ya existe un departamento con este código en el edificio seleccionado",
          variant: "destructive",
        });
        return;
      }
      
      // Crear departamento
      const { data: nuevoDpto, error: errorCreacion } = await supabase
        .from("departamentos")
        .insert([departamentoActualizado])
        .select()
        .single();
      
      if (errorCreacion) {
        throw new Error(errorCreacion.message);
      }
      
      // Actualizar la lista de departamentos
      setDepartamentos(prevDepartamentos => [...prevDepartamentos, nuevoDpto]);
      
      // Seleccionar el nuevo departamento
      form.setValue("departamento_id", nuevoDpto.id.toString());
      
      // Cerrar formulario
      setMostrarNuevoDepartamento(false);
      
      // Limpiar formulario de nuevo departamento
      setNuevoDepartamento({
        edificio_id: edificioId,
        codigo: "",
        propietario: "",
      });
      
      toast({
        title: "Departamento creado",
        description: `El departamento ${nuevoDpto.codigo} ha sido creado correctamente`,
      });
      
    } catch (error: any) {
      console.error("Error al crear departamento:", error);
      toast({
        title: "Error",
        description: `No se pudo crear el departamento: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setGuardandoDepartamento(false);
    }
  };
  
  // Asegurar que solo un teléfono sea principal
  const handleEsPrincipalChange = (checked: boolean, index: number) => {
    if (checked) {
      // Desmarcar todos los demás
      const telefonos = form.getValues("telefonos");
      telefonos.forEach((_, i) => {
        if (i !== index) {
          form.setValue(`telefonos.${i}.es_principal`, false);
        }
      });
    }
    
    form.setValue(`telefonos.${index}.es_principal`, checked);
  };
  
    // Enviar formulario
    const onSubmit = async (data: z.infer<typeof formSchema>) => {
      try {
        setLoading(true);
        const supabase = getSupabaseClient();
        
        if (!supabase) {
          toast({
            title: "Error",
            description: "No se pudo inicializar el cliente de Supabase",
            variant: "destructive",
          });
          return;
        }
        
        // Verificar que al menos un teléfono sea principal
        const tienePrincipal = data.telefonos.some(tel => tel.es_principal);
        if (!tienePrincipal && data.telefonos.length > 0) {
          // Si no hay principal, marcar el primero
          form.setValue(`telefonos.0.es_principal`, true);
          data.telefonos[0].es_principal = true;
        }
        
        // Crear los contactos en la base de datos
        const contactosParaGuardar = data.telefonos.map(telefono => ({
          departamento_id: parseInt(data.departamento_id),
          nombre_contacto: telefono.nombre_contacto,
          relacion: telefono.relacion,
          numero: telefono.numero,
          es_principal: telefono.es_principal,
          notas: telefono.notas || null,
        }));
        
        const { data: resultado, error } = await supabase
          .from("telefonos_departamento")
          .insert(contactosParaGuardar)
          .select();
        
        if (error) {
          throw new Error(error.message);
        }
        
        toast({
          title: "Contactos guardados",
          description: `Se han guardado ${contactosParaGuardar.length} contactos correctamente`,
        });
        
        // Redireccionar a la lista de contactos
        router.push("/dashboard/contactos");
        
      } catch (error: any) {
        console.error("Error al guardar contactos:", error);
        toast({
          title: "Error",
          description: error.message || "No se pudieron guardar los contactos",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
  
    // Renderizar estado de carga
    if (initialLoading) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
            <p className="text-lg text-gray-500">Cargando...</p>
          </div>
        </div>
      );
    }
  
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Nuevo Contacto</h2>
            <p className="text-muted-foreground">Crea teléfonos de contacto para departamentos</p>
          </div>
          <Link href="/dashboard/contactos">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
        </div>
        
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md">
            {error}
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Selección de Edificio */}
                    <FormField
                      control={form.control}
                      name="edificio_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Edificio</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={loading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar edificio" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {edificios.map((edificio) => (
                                <SelectItem
                                  key={edificio.id}
                                  value={edificio.id.toString()}
                                >
                                  {edificio.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
  
                    {/* Selección de Departamento */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FormLabel>Departamento</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  // Asegurar que nuevoDepartamento tiene el edificio_id actual
                                  const edificioId = form.getValues("edificio_id");
                                  setNuevoDepartamento(prev => ({
                                    ...prev,
                                    edificio_id: edificioId,
                                    codigo: "",
                                    propietario: ""
                                  }));
                                  setMostrarNuevoDepartamento(!mostrarNuevoDepartamento);
                                  form.setValue("departamento_id", "");
                                }}
                                disabled={!form.getValues("edificio_id") || loading}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-4 w-4" />
                                <span className="sr-only">Crear departamento</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Crear nuevo departamento</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
  
                      {!mostrarNuevoDepartamento ? (
                        <FormField
                          control={form.control}
                          name="departamento_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  disabled={!form.getValues("edificio_id") || loading}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar departamento" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <div className="px-3 py-2">
                                      <Input
                                        placeholder="Buscar departamento..."
                                        value={busquedaDepartamento}
                                        onChange={(e) => setBusquedaDepartamento(e.target.value)}
                                        className="mb-2"
                                      />
                                    </div>
                                    {departamentosFiltrados.length === 0 ? (
                                      <div className="px-3 py-2 text-sm text-muted-foreground">
                                        No se encontraron departamentos
                                      </div>
                                    ) : (
                                      departamentosFiltrados.map((depto) => (
                                        <SelectItem
                                          key={depto.id}
                                          value={depto.id.toString()}
                                        >
                                          {depto.codigo}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <div className="border rounded-md p-3 space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="codigo-depto">Código</Label>
                            <Input
                              id="codigo-depto"
                              placeholder="Ej: 3B"
                              value={nuevoDepartamento.codigo}
                              onChange={(e) =>
                                setNuevoDepartamento({
                                  ...nuevoDepartamento,
                                  codigo: e.target.value,
                                })
                              }
                              disabled={guardandoDepartamento}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="propietario-depto">Propietario (opcional)</Label>
                            <Input
                              id="propietario-depto"
                              placeholder="Nombre del propietario"
                              value={nuevoDepartamento.propietario}
                              onChange={(e) =>
                                setNuevoDepartamento({
                                  ...nuevoDepartamento,
                                  propietario: e.target.value,
                                })
                              }
                              disabled={guardandoDepartamento}
                            />
                          </div>
                          <div className="flex justify-between pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setMostrarNuevoDepartamento(false)}
                              disabled={guardandoDepartamento}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleCrearDepartamento}
                              disabled={guardandoDepartamento}
                            >
                              {guardandoDepartamento ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="mr-2 h-4 w-4" />
                              )}
                              Guardar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
  
                  <Separator className="my-4" />
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Información de contactos</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          append({
                            nombre_contacto: "",
                            relacion: "",
                            numero: "",
                            es_principal: false,
                            notas: "",
                          });
                        }}
                        disabled={loading || !form.getValues("departamento_id")}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar contacto
                      </Button>
                    </div>
  
                    {fields.map((field, index) => (
                      <Card key={field.id} className="relative">
                        <CardContent className="pt-6">
                          {index > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-2"
                              onClick={() => remove(index)}
                              disabled={loading}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Eliminar contacto</span>
                            </Button>
                          )}
  
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <FormField
                                control={form.control}
                                name={`telefonos.${index}.nombre_contacto`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nombre del contacto</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="Nombre generado automáticamente"
                                        disabled={loading}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <FormField
                                control={form.control}
                                name={`telefonos.${index}.relacion`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Relación</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value}
                                      disabled={loading}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Seleccionar relación" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {relacionesComunes.map((relacion) => (
                                          <SelectItem
                                            key={relacion}
                                            value={relacion.toLowerCase()}
                                          >
                                            {relacion}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <FormField
                              control={form.control}
                              name={`telefonos.${index}.numero`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Número telefónico</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="+54 9 11 5005-5262"
                                      disabled={loading}
                                      onChange={(e) => handleTelefonoChange(e, index)}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Formato: +54 9 11 5005-5262
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2 mt-4">
                            <Checkbox
                              id={`es_principal_${index}`}
                              checked={form.watch(`telefonos.${index}.es_principal`)}
                              onCheckedChange={(checked) => handleEsPrincipalChange(!!checked, index)}
                              disabled={loading}
                            />
                            <Label
                              htmlFor={`es_principal_${index}`}
                              className="cursor-pointer"
                            >
                              Contacto principal
                            </Label>
                          </div>
                          
                          <div className="mt-4">
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
                                      disabled={loading}
                                      className="resize-none"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
  
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/contactos")}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar contactos
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  }