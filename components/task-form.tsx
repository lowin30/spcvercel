"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Plus, X } from "lucide-react";
// El componente ContactPicker ya no es necesario con la nueva estructura
import { MultiSelect, Option } from "@/components/ui/multi-select"
import { Badge } from "@/components/ui/badge"
import { DatePickerVisual } from "@/components/date-picker-visual"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

// Define the form schema with validation
const formSchema = z.object({
  id_administrador: z.string().min(1, { 
    message: "Debes seleccionar un administrador.",
  }),
  titulo: z.string().min(2, {
    message: "El título debe tener al menos 2 caracteres.",
  }),
  descripcion: z.string().min(10, {
    message: "La descripción debe tener al menos 10 caracteres.",
  }),
  id_edificio: z.string().min(1, {
    message: "Debes seleccionar un edificio.",
  }),
  id_estado_nuevo: z.string().min(1, {
    message: "Debe seleccionar un estado",
  }),
  departamentos_ids: z.array(z.string()).optional().default([]),
  id_supervisor: z.string().optional().default(""),
  id_asignado: z.string().optional().default(""),
  // id_contacto ya no es necesario, los contactos se manejan a través de departamentos
  fecha_visita: z.date().nullable(),
  prioridad: z.enum(["baja", "media", "alta"], {
    required_error: "Debes seleccionar una prioridad.",
  }),
  // Se eliminó la validación de 'estado' ya que ahora usamos 'id_estado_nuevo'
})

interface TaskFormValues extends z.infer<typeof formSchema> {
  fecha_visita: Date | null;
}

type Props = {
  task?: {
    id: number
    titulo: string
    descripcion: string
    id_administrador?: number | null // Añadido
    id_edificio: number
    id_departamento: number | null
    departamentos_ids?: string[] // Añadido para múltiples departamentos
    id_supervisor: string
    id_asignado: string
    id_contacto: number | null
    prioridad: string
    estado?: string
    id_estado_nuevo?: number
  }
  supervisores: { id: string; email: string; code: string; color_perfil: string; rol: string }[]
  trabajadores: { id: string; email: string; color_perfil: string; rol: string }[]
  contactoId?: number | null
  isEditMode?: boolean // Indica si el formulario está en modo edición
}

const taskStatuses = [
  { id: "1", nombre: "Organizar", color: "gray" },
  { id: "2", nombre: "Preguntar", color: "blue" },
  { id: "3", nombre: "Presupuestado", color: "purple" },
  { id: "4", nombre: "Enviado", color: "indigo" },
  { id: "5", nombre: "Aprobado", color: "green" },
  { id: "6", nombre: "Facturado", color: "orange" },
  { id: "7", nombre: "Terminado", color: "green" },
  { id: "8", nombre: "Reclamado", color: "red" },
  { id: "9", nombre: "Liquidada", color: "purple" },
  { id: "10", nombre: "Posible", color: "yellow" },
];

const statusStyles: { [key: string]: string } = {
  gray: "bg-gray-200 text-gray-800",
  blue: "bg-blue-200 text-blue-800",
  yellow: "bg-yellow-200 text-yellow-800",
  purple: "bg-purple-200 text-purple-800",
  indigo: "bg-indigo-200 text-indigo-800",
  green: "bg-green-200 text-green-800",
  orange: "bg-orange-200 text-orange-800",
  red: "bg-red-200 text-red-800",
};

export function TaskForm({
  task,
  supervisores,
  trabajadores,
  contactoId = null,
  isEditMode = false,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [administradoresList, setAdministradoresList] = useState<{ id: string; nombre: string }[]>([])
  const [selectedAdministradorId, setSelectedAdministradorId] = useState<string | null>(
    task?.id_administrador?.toString() || null
  )
  const [edificiosList, setEdificiosList] = useState<{ id: number; nombre: string; direccion?: string }[]>([])
  
  const [selectedEdificioId, setSelectedEdificioId] = useState<number | null>(task ? task.id_edificio : null)
  const [departamentosList, setDepartamentosList] = useState<{ id: string; codigo: string; propietario?: string }[]>([])
  const [selectedDepartamentosIds, setSelectedDepartamentosIds] = useState<string[]>(
    task?.departamentos_ids || []
  )
  const [telefonosList, setTelefonosList] = useState<{ id: string; numero: string; nombre_contacto?: string; departamento_id: string }[]>([])
  const [estadoTareasFromDb, setEstadoTareasFromDb] = useState<{ id: number; codigo: string; nombre: string }[]>([])
  const [departamentosDialogOpen, setDepartamentosDialogOpen] = useState(false)
  const [selectedDepartamentoId, setSelectedDepartamentoId] = useState<string | null>(null)
  const [nuevoDepartamento, setNuevoDepartamento] = useState({ codigo: "", propietario: "", notas: "" })
  const [creandoDepartamento, setCreandoDepartamento] = useState(false)

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id_administrador: task?.id_administrador?.toString() || "",
      titulo: task?.titulo || "",
      descripcion: task?.descripcion || "",
      id_edificio: task?.id_edificio?.toString() || "",
      departamentos_ids: task?.departamentos_ids || [],
      id_supervisor: task?.id_supervisor || "", // Valor por defecto vacío
      id_asignado: task?.id_asignado || "", // Valor por defecto vacío
      id_contacto: task?.id_contacto || contactoId || null,
      fecha_visita: task?.fecha_visita ? new Date(task.fecha_visita) : null,
      prioridad: (task?.prioridad as "baja" | "media" | "alta") || "media",
      id_estado_nuevo: task?.id_estado_nuevo?.toString() || "1",
    },
  })

  // Log de props y valores iniciales
  useEffect(() => {
    console.log('TaskForm recibió task:', task);
    console.log('Valor inicial de id_estado_nuevo:', form.getValues('id_estado_nuevo'));
    console.log('task.id_estado_nuevo:', task?.id_estado_nuevo);
  }, [task]);

  useEffect(() => {
    if (isEditMode) return;
    const current = form.getValues('id_supervisor');
    if (current && current.trim() !== '') return;
    const sup = (supervisores || []).find(s => (s.email || '').toLowerCase() === 'super1@gmail.com');
    if (sup?.id) {
      form.setValue('id_supervisor', sup.id);
    }
  }, [isEditMode, supervisores, form]);

  // Cargar administradores al montar
  useEffect(() => {
    const fetchAdministradores = async () => {
      const { data, error } = await supabase.from("administradores").select("id, nombre").order("nombre");
      if (error) {
        console.error("Error cargando administradores:", error);
        toast({ title: "Error", description: "No se pudieron cargar los administradores.", variant: "destructive" });
      } else {
        setAdministradoresList(data?.map(admin => ({ ...admin, id: admin.id.toString() })) || []);
        // Preseleccionar si estamos editando
        if (task?.id_administrador && data) {
          const adminExists = data.some(admin => admin.id.toString() === task.id_administrador!.toString());
          if (adminExists) {
            setSelectedAdministradorId(task.id_administrador!.toString());
            form.setValue("id_administrador", task.id_administrador!.toString());
          }
        }
      }
    };
    fetchAdministradores();
  }, [supabase, task?.id_administrador, form]);

  // Cargar estados de tarea al montar
  useEffect(() => {
    const fetchEstadoTareas = async () => {
      const { data, error } = await supabase.from("estados_tareas").select("id, codigo, nombre");
      if (error) {
        console.error("Error cargando estados de tarea:", error);
        toast({ title: "Error", description: "No se pudieron cargar los estados de tarea.", variant: "destructive" });
      } else {
        setEstadoTareasFromDb(data || []);
      }
    };
    fetchEstadoTareas();
  }, [supabase]);

  // Cargar edificios cuando cambia el administrador seleccionado
  useEffect(() => {
    const fetchEdificios = async () => {
      if (selectedAdministradorId) {
        // Solo resetear edificio si NO estamos en modo edición O si el admin cambió
        const isInitialLoad = task && selectedAdministradorId === task.id_administrador?.toString();
        if (!isInitialLoad) {
          form.setValue("id_edificio", ""); 
          setSelectedEdificioId(null);
          setSelectedDepartamentosIds([]);
          form.setValue("departamentos_ids", []);
        }
        
        const { data, error } = await supabase
          .from("edificios")
          .select("id, nombre, direccion")
          .eq("id_administrador", Number.parseInt(selectedAdministradorId))
          .order("nombre");
        
        if (error) {
          console.error("Error cargando edificios:", error);
          toast({ title: "Error", description: "No se pudieron cargar los edificios para el administrador.", variant: "destructive" });
          setEdificiosList([]);
        } else {
          setEdificiosList(data || []);
           // Si estamos editando y hay un id_edificio para el admin actual, lo preseleccionamos
           if (task?.id_edificio && data && selectedAdministradorId === task.id_administrador?.toString()) {
            const edificioExists = data.some(ed => ed.id.toString() === task.id_edificio!.toString());
            if (edificioExists) {
              form.setValue("id_edificio", task.id_edificio!.toString());
              setSelectedEdificioId(task.id_edificio);
            }
          }
        }
      } else {
        setEdificiosList([]);
        form.setValue("id_edificio", "");
        setSelectedEdificioId(null);
        setSelectedDepartamentosIds([]);
        form.setValue("departamentos_ids", []);
      }
    };
    fetchEdificios();
  }, [selectedAdministradorId, supabase, form, task?.id_edificio, task?.id_administrador]);

  // Función para ordenar departamentos según reglas específicas
  const ordenarDepartamentos = (departamentos: any[]) => {
    if (!departamentos) return [];
    
    return [...departamentos].sort((a, b) => {
      const codigoA = a.codigo.toLowerCase();
      const codigoB = b.codigo.toLowerCase();
      
      // Porterías primero
      if (codigoA.startsWith('port') && !codigoB.startsWith('port')) return -1;
      if (!codigoA.startsWith('port') && codigoB.startsWith('port')) return 1;
      
      // Plantas bajas después de porterías
      const esPBA = codigoA.startsWith('pb');
      const esPBB = codigoB.startsWith('pb');
      if (esPBA && !esPBB) return -1;
      if (!esPBA && esPBB) return 1;
      if (esPBA && esPBB) {
        // Si ambos son PB, ordenar por la letra
        return codigoA.localeCompare(codigoB);
      }
      
      // Extraer el número y la letra (si existe) de cada código
      const matchA = codigoA.match(/^(\d+)([a-z]*)$/);
      const matchB = codigoB.match(/^(\d+)([a-z]*)$/);
      
      if (matchA && matchB) {
        const numA = parseInt(matchA[1]);
        const numB = parseInt(matchB[1]);
        
        // Si los números son diferentes, ordenar por número
        if (numA !== numB) {
          return numA - numB;
        }
        
        // Si los números son iguales, ordenar por letra
        const letraA = matchA[2] || '';
        const letraB = matchB[2] || '';
        return letraA.localeCompare(letraB);
      }
      
      // Si no se puede aplicar lógica específica, usar orden alfabético
      return codigoA.localeCompare(codigoB);
    });
  };
  
  // Función para cargar departamentos del edificio seleccionado
  const fetchDepartamentos = async () => {
    if (selectedEdificioId) {
      setSelectedDepartamentosIds([]);
      form.setValue("departamentos_ids", []);
      
      const { data, error } = await supabase
        .from("departamentos")
        .select("id, codigo, propietario")
        .eq("edificio_id", selectedEdificioId)
        .order("codigo", { ascending: true });
      
      if (error) {
        console.error("Error cargando departamentos:", error);
        toast({ title: "Error", description: "No se pudieron cargar los departamentos para el edificio.", variant: "destructive" });
        setDepartamentosList([]);
      } else {
        // Aplicar ordenamiento personalizado a los departamentos
        const departamentosConIds = data?.map(dep => ({ ...dep, id: dep.id.toString() })) || [];
        setDepartamentosList(ordenarDepartamentos(departamentosConIds));
        
        // Si estamos editando y hay departamentos_ids para el edificio actual
        if (task?.departamentos_ids && task.departamentos_ids.length > 0 && data && selectedEdificioId === task.id_edificio) {
          const validDepartamentosIds = task.departamentos_ids.filter(id => 
            data.some(dep => dep.id.toString() === id)
          );
          if (validDepartamentosIds.length > 0) {
            setSelectedDepartamentosIds(validDepartamentosIds);
            form.setValue("departamentos_ids", validDepartamentosIds);
          }
        }
      }
    } else {
      setDepartamentosList([]);
      setSelectedDepartamentosIds([]);
      form.setValue("departamentos_ids", []);
    }
  };
  
  // Cargar departamentos cuando cambia el edificio seleccionado
  useEffect(() => {
    fetchDepartamentos();
  }, [selectedEdificioId, supabase, form, task?.id_edificio, task?.departamentos_ids]);

  // Cargar teléfonos cuando cambian los departamentos seleccionados
  useEffect(() => {
    const fetchTelefonos = async () => {
      if (selectedDepartamentosIds.length > 0) {
        const { data, error } = await supabase
          .from("telefonos_departamento")
          .select("id, numero, nombre_contacto, departamento_id")
          .in("departamento_id", selectedDepartamentosIds)
          .order("nombre_contacto", { ascending: true });
        
        if (error) {
          console.error("Error cargando teléfonos:", error);
          toast({ title: "Error", description: "No se pudieron cargar los teléfonos para los departamentos.", variant: "destructive" });
          setTelefonosList([]);
        } else {
          setTelefonosList(data?.map(tel => ({ ...tel, id: tel.id.toString() })) || []);
        }
      } else {
        setTelefonosList([]);
      }
    };
    fetchTelefonos();
  }, [selectedDepartamentosIds, supabase]);

  // Handle administrador change
  const handleAdministradorChange = (value: string) => {
    setSelectedAdministradorId(value);
    form.setValue("id_administrador", value);
    // El useEffect de selectedAdministradorId se encargará de recargar edificios y resetear campos dependientes
  };

  // Handle edificio change
  const handleEdificioChange = (value: string) => {
    const edificioId = value ? Number.parseInt(value) : null;
    setSelectedEdificioId(edificioId);
    form.setValue("id_edificio", value);
    setSelectedDepartamentosIds([]);
    form.setValue("departamentos_ids", []);

    if (edificioId) {
      const selectedEdificio = edificiosList.find(ed => ed.id === edificioId);
      if (selectedEdificio && selectedEdificio.nombre) {
        const currentTitle = form.getValues("titulo");
        if (currentTitle.trim() === "") {
          form.setValue("titulo", selectedEdificio.nombre + " - ");
        }
      }
    }
  };

  // Handle departamentos change
  const handleDepartamentosChange = (values: string[]) => {
    setSelectedDepartamentosIds(values);
    form.setValue("departamentos_ids", values);
    
    // Actualizar el título automáticamente con el edificio y departamentos ordenados
    if (values.length > 0 && selectedEdificioId) {
      const selectedEdificio = edificiosList.find(ed => ed.id === selectedEdificioId);
      
      if (selectedEdificio && selectedEdificio.nombre) {
        // Obtener códigos de departamentos ordenados de mayor a menor
        const departamentosCodigos = values.map(depId => {
          const dep = departamentosList.find(d => d.id === depId);
          return dep ? dep.codigo : "";
        }).filter(codigo => codigo !== "");
        
        // Ordenar códigos (asumiendo formato como "4B", "3B", etc.)
        departamentosCodigos.sort((a, b) => b.localeCompare(a));
        
        // Formato de título: "NombreEdificio DeptoCodigo1-DeptoCodigo2-..."
        const newTitle = `${selectedEdificio.nombre} ${departamentosCodigos.join("-")}`;
        form.setValue("titulo", newTitle);
      }
    }
  };

  // Handle form submission
  async function onSubmit(values: TaskFormValues) {
    console.log("Form values on submit:", values); // DEBUGGING
    console.log("Submitting task with supervisor ID:", values.id_supervisor);
    console.log("Submitting id_estado_nuevo:", values.id_estado_nuevo);
    setIsSubmitting(true);

    try {
      const { id_supervisor, id_asignado, id_estado_nuevo, departamentos_ids, ...otherFormValues } = values;

      // Construir el payload explícitamente
      const taskDataPayload: any = {
        titulo: otherFormValues.titulo,
        descripcion: otherFormValues.descripcion,
        id_administrador: Number.parseInt(values.id_administrador),
        id_edificio: Number.parseInt(values.id_edificio),
        prioridad: values.prioridad,
        id_estado_nuevo: Number.parseInt(id_estado_nuevo) // Usar directamente el valor del formulario
      };
      
      // Solo incluir fecha_visita si NO estamos en modo edición
      if (!isEditMode) {
        taskDataPayload.fecha_visita = values.fecha_visita;
      }

      let taskId: number;

      if (task) {
        // Update existing task
        const { data: updatedTask, error: updateError } = await supabase
          .from("tareas")
          .update(taskDataPayload)
          .eq("id", task.id)
          .select("id")
          .single();

        if (updateError) throw updateError;
        taskId = updatedTask.id;

        // Solo actualizar supervisor/trabajador si NO estamos en modo edición (isEditMode)
        if (!isEditMode) {
          // Update supervisor link
          await supabase.from("supervisores_tareas").delete().eq("id_tarea", taskId);
          if (id_supervisor && id_supervisor.trim() !== "") {
            const { error: supervisorError } = await supabase
              .from("supervisores_tareas")
              .insert({ id_tarea: taskId, id_supervisor: id_supervisor });
            if (supervisorError) throw supervisorError;
          }
          
          // Update trabajador link (tabla relacional)
          await supabase.from("trabajadores_tareas").delete().eq("id_tarea", taskId);
          if (id_asignado && id_asignado.trim() !== "") {
            const { error: trabajadorError } = await supabase
              .from("trabajadores_tareas")
              .insert({ id_tarea: taskId, id_trabajador: id_asignado });
            if (trabajadorError) throw trabajadorError;
          }
        }
      } else {
        // Create new task
        const { data: newTask, error: insertError } = await supabase
          .from("tareas")
          .insert(taskDataPayload)
          .select("id")
          .single();

        if (insertError) throw insertError;
        taskId = newTask.id;

        // Create supervisor link
        if (id_supervisor && id_supervisor.trim() !== "") {
          const { error: supervisorError } = await supabase
            .from("supervisores_tareas")
            .insert({ id_tarea: taskId, id_supervisor: id_supervisor });
          if (supervisorError) throw supervisorError;
        }
        
        // Create trabajador link (tabla relacional)
        if (id_asignado && id_asignado.trim() !== "") {
          const { error: trabajadorError } = await supabase
            .from("trabajadores_tareas")
            .insert({ id_tarea: taskId, id_trabajador: id_asignado });
          if (trabajadorError) throw trabajadorError;
        }
      }
      
      // Actualizar departamentos usando upsert para evitar conflictos
      if (task) {
        // Primero eliminar todos los departamentos existentes
        console.log('Eliminando departamentos existentes para tarea:', taskId);
        const { error: deleteDeptoError } = await supabase
          .from("departamentos_tareas")
          .delete()
          .eq("id_tarea", taskId);
        
        if (deleteDeptoError) {
          console.error("Error al eliminar departamentos:", deleteDeptoError);
          // No lanzar error, intentar continuar con upsert
        } else {
          console.log('Departamentos eliminados correctamente');
        }
      }
      
      // Insertar múltiples departamentos usando upsert
      if (departamentos_ids.length > 0) {
        // Eliminar duplicados
        const uniqueDepartamentos = [...new Set(departamentos_ids)];
        const departamentosInserts = uniqueDepartamentos.map(depId => ({
          id_tarea: taskId,
          id_departamento: Number.parseInt(depId)
        }));
        
        console.log('Upserting departamentos:', departamentosInserts);
        
        // Usar upsert para evitar conflictos de clave duplicada
        const { error: departamentosError } = await supabase
          .from("departamentos_tareas")
          .upsert(departamentosInserts, {
            onConflict: 'id_tarea,id_departamento',
            ignoreDuplicates: false
          });
        
        if (departamentosError) {
          console.error('Error al upsert departamentos:', departamentosError);
          throw departamentosError;
        }
        console.log('Departamentos actualizados correctamente');
      }

      toast({
        title: task ? "Tarea actualizada" : "Tarea creada",
        description: task ? "La tarea ha sido actualizada correctamente." : "La tarea ha sido creada correctamente.",
      });

      router.push("/dashboard/tareas");
      router.refresh();
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al guardar la tarea.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Crear opciones para el multiselect de departamentos
  const departamentosOptions: Option[] = departamentosList.map(dep => ({
    value: dep.id,
    label: dep.codigo + (dep.propietario ? ` (${dep.propietario})` : '')
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="id_administrador"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between w-full">
                  <FormLabel>Administrador</FormLabel>
                  <Link href="/dashboard/administradores/nuevo" passHref legacyBehavior>
                    <Button type="button" variant="ghost" size="sm" className="p-1 h-auto">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value); 
                    handleAdministradorChange(value); 
                  }}
                  value={field.value} 
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar administrador" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {administradoresList.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id.toString()}>
                        {admin.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="id_edificio"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between w-full">
                  <FormLabel>Edificio</FormLabel>
                  <Link href="/dashboard/edificios/nuevo" passHref legacyBehavior>
                    <Button type="button" variant="ghost" size="sm" className="p-1 h-auto">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleEdificioChange(value);
                  }}
                  value={field.value}
                  disabled={isSubmitting || !selectedAdministradorId || edificiosList.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={!selectedAdministradorId ? "Seleccione un administrador" : (edificiosList.length === 0 ? "No hay edificios para este admin" : "Seleccionar edificio")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {edificiosList.map((edificio) => (
                      <SelectItem key={edificio.id} value={edificio.id.toString()}>
                        {edificio.nombre} {edificio.direccion ? `(${edificio.direccion})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

                {/* Nuevo campo para selección múltiple de departamentos */}
                <FormField
          control={form.control}
          name="departamentos_ids"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between w-full">
                <FormLabel>Departamentos</FormLabel>
                <Dialog open={departamentosDialogOpen} onOpenChange={setDepartamentosDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="p-1 h-auto">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Departamento</DialogTitle>
                      <DialogDescription>
                        Complete los datos para crear un nuevo departamento en el edificio
                      </DialogDescription>
                    </DialogHeader>
                    
                    {!form.getValues('id_edificio') ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Seleccione un edificio primero para crear un departamento
                      </div>
                    ) : (
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label htmlFor="codigo">Código *</Label>
                          <Input 
                            id="codigo" 
                            value={nuevoDepartamento.codigo} 
                            onChange={(e) => setNuevoDepartamento({...nuevoDepartamento, codigo: e.target.value})}
                            placeholder="Ej: 1A, 2B, PB"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="propietario">Propietario</Label>
                          <Input 
                            id="propietario" 
                            value={nuevoDepartamento.propietario} 
                            onChange={(e) => setNuevoDepartamento({...nuevoDepartamento, propietario: e.target.value})}
                            placeholder="Nombre del propietario"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="notas">Notas</Label>
                          <Input 
                            id="notas" 
                            value={nuevoDepartamento.notas} 
                            onChange={(e) => setNuevoDepartamento({...nuevoDepartamento, notas: e.target.value})}
                            placeholder="Información adicional"
                          />
                        </div>
                        
                        <DialogFooter>
                          <Button 
                            type="button" 
                            disabled={!nuevoDepartamento.codigo || creandoDepartamento} 
                            onClick={async () => {
                              if (!nuevoDepartamento.codigo || !form.getValues('id_edificio')) return;
                              
                              setCreandoDepartamento(true);
                              const supabase = createClient();
                              
                              try {
                                const { data, error } = await supabase
                                  .from("departamentos")
                                  .insert({
                                    edificio_id: parseInt(form.getValues('id_edificio')),
                                    codigo: nuevoDepartamento.codigo,
                                    propietario: nuevoDepartamento.propietario || null,
                                    notas: nuevoDepartamento.notas || null
                                  })
                                  .select();
                                  
                                if (error) throw error;
                                
                                toast({
                                  title: "Departamento creado",
                                  description: `El departamento ${nuevoDepartamento.codigo} ha sido creado correctamente`,
                                });
                                
                                // Actualizar lista de departamentos
                                await fetchDepartamentos();
                                
                                // Resetear formulario y cerrar diálogo
                                setNuevoDepartamento({ codigo: "", propietario: "", notas: "" });
                                setDepartamentosDialogOpen(false);
                                
                              } catch (error: any) {
                                console.error("Error al crear departamento:", error);
                                toast({
                                  title: "Error al crear departamento",
                                  description: error.message || "Ha ocurrido un error al crear el departamento",
                                  variant: "destructive",
                                });
                              } finally {
                                setCreandoDepartamento(false);
                              }
                            }}
                          >
                            {creandoDepartamento ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creando...
                              </>
                            ) : "Crear departamento"}
                          </Button>
                        </DialogFooter>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
              <FormControl>
                <MultiSelect
                  options={departamentosOptions}
                  selected={field.value}
                  onChange={(values) => {
                    field.onChange(values);
                    handleDepartamentosChange(values);
                  }}
                  placeholder={!selectedEdificioId ? "Seleccione un edificio" : (departamentosOptions.length === 0 ? "No hay departamentos para este edificio" : "Seleccionar departamentos")}
                  disabled={isSubmitting || !selectedEdificioId || departamentosOptions.length === 0}
                  className="w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Mostrar teléfonos asociados (solo informativo) */}
        {telefonosList.length > 0 && (
          <div className="bg-muted p-3 rounded-md">
            <h4 className="text-sm font-semibold mb-2">Teléfonos asociados:</h4>
            <div className="flex flex-wrap gap-2">
              {telefonosList.map(tel => (
                <Badge key={tel.id} variant="secondary" className="text-xs">
                  {tel.numero} {tel.nombre_contacto && `(${tel.nombre_contacto})`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="titulo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <FormControl>
                  <Input placeholder="Título de la tarea" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe la tarea detalladamente" className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="id_estado_nuevo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      {(() => {
                        const selectedStatus = taskStatuses.find(status => status.id === field.value);
                        if (!selectedStatus) {
                          return <span className="text-muted-foreground">Seleccionar estado</span>;
                        }
                        return (
                          <div
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              statusStyles[selectedStatus.color] || 'bg-gray-200 text-gray-800'
                            }`}>
                            {selectedStatus.nombre}
                          </div>
                        );
                      })()}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {taskStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        <div
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status.color] || 'bg-gray-200 text-gray-800'}`}>
                          {status.nombre}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Ocultar Supervisor, Trabajador y Fecha de visita en modo edición */}
          {!isEditMode && (
            <>
              <FormField
                control={form.control}
                name="id_supervisor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supervisor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar supervisor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {supervisores.map((supervisor) => (
                          <SelectItem key={supervisor.id} value={supervisor.id}>
                            {supervisor.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>

        {!isEditMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="id_asignado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asignar a</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar trabajador" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {trabajadores.map((trabajador) => (
                        <SelectItem key={trabajador.id} value={trabajador.id}>
                          {trabajador.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fecha_visita"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de visita</FormLabel>
                  <FormControl>
                    <DatePickerVisual
                      date={field.value}
                      onDateChange={(date) => {
                        field.onChange(date);
                      }}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/tareas">
              Cancelar
            </Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Guardar cambios" : (task ? "Actualizar tarea" : "Crear tarea")}
          </Button>
        </div>
      </form>
    </Form>
  )
}