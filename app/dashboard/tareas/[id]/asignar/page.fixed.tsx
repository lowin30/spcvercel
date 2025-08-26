"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { getSupabaseClient } from "@/lib/supabase-singleton"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

const asignarFormSchema = z.object({
  usuario_asignado_id: z.string({
    required_error: "Por favor selecciona un usuario",
  }),
})

export default function AsignarTareaPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = getSupabaseClient()

  const [isLoading, setIsLoading] = useState(true)
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [tarea, setTarea] = useState<any>(null)
  const [userDetails, setUserDetails] = useState<{ rol: string; email: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [supervisoresIds, setSupervisoresIds] = useState<string[]>([])

  const form = useForm<z.infer<typeof asignarFormSchema>>({
    resolver: zodResolver(asignarFormSchema),
    defaultValues: {
      usuario_asignado_id: "",
    },
  })

  async function onSubmit(values: z.infer<typeof asignarFormSchema>) {
    try {
      setSaving(true)
      
      // Actualizar la tarea con el usuario asignado
      const { error } = await supabase
        .from('tareas')
        .update({ usuario_asignado_id: values.usuario_asignado_id })
        .eq('id', params.id)
      
      if (error) {
        toast.error("Error al asignar la tarea")
        console.error("Error:", error)
        setSaving(false)
        return
      }
      
      toast.success("Tarea asignada correctamente")
      router.push(`/dashboard/tareas/${params.id}`)
    } catch (error) {
      toast.error("Error al procesar la solicitud")
      console.error("Error:", error)
    } finally {
      setSaving(false)
    }
  }

  // Verificar si es un supervisor de tarea
  function esSupervisorDeTarea() {
    if (!userDetails) return false;
    return userDetails.rol === 'supervisor' || userDetails.rol === 'admin';
  }

  // Cargar datos iniciales: tarea, usuarios y rol del usuario actual
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Verificar sesión
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push("/login");
          return;
        }

        // Cargar detalles del usuario actual
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userData) {
          setUserDetails({
            rol: userData.rol,
            email: session.user.email || ""
          });
        }

        // Cargar la tarea
        const { data: tareaData, error: tareaError } = await supabase
          .from('tareas')
          .select(`
            *,
            proyecto:proyecto_id (nombre),
            creador:usuario_creador_id (nombre, email),
            asignado:usuario_asignado_id (nombre, email)
          `)
          .eq('id', params.id)
          .single();
        
        if (tareaError) {
          console.error("Error al cargar tarea:", tareaError);
          toast.error("Error al cargar la tarea");
          return;
        }
        
        setTarea(tareaData);

        // Cargar usuarios (técnicos y supervisores)
        const { data: usuariosData, error: usuariosError } = await supabase
          .from('usuarios')
          .select('*')
          .in('rol', ['tecnico', 'supervisor']);
        
        if (usuariosError) {
          console.error("Error al cargar usuarios:", usuariosError);
          return;
        }
        
        setUsuarios(usuariosData);

        // Establecer valor por defecto si ya hay un usuario asignado
        if (tareaData.usuario_asignado_id) {
          form.setValue('usuario_asignado_id', tareaData.usuario_asignado_id);
        }

        // Obtener IDs de supervisores para filtrado
        const supervisores = usuariosData.filter(u => u.rol === 'supervisor').map(s => s.id);
        setSupervisoresIds(supervisores);
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        toast.error("Error al cargar los datos necesarios");
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [params.id, router, supabase]);
  
  // Consulta de diagnóstico para verificar usuarios por rol
  useEffect(() => {
    const cargarRolesPorUsuario = async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, rol');
      
      if (error) {
        console.error("Error al cargar roles:", error);
        return;
      }
      
      console.log("Usuarios por rol:", data);
    };

    cargarRolesPorUsuario();
  }, [supabase]);

  // Verificar si el usuario actual puede realizar asignaciones
  function esSupervisorDeTarea() {
    if (!userDetails) return false;
    
    // Los administradores y supervisores pueden asignar tareas
    if (userDetails.rol === 'admin' || userDetails.rol === 'supervisor') {
      return true;
    }
    
    return false;
  }

  // Redireccionar si no tiene permisos para asignar
  useEffect(() => {
    if (!isLoading && userDetails && !esSupervisorDeTarea()) {
      toast.error("No tienes permisos para asignar tareas");
      router.push(`/dashboard/tareas/${params.id}`);
    }
  }, [userDetails, isLoading, params.id, router]);

  if (isLoading) {
    return (
      <DashboardShell userDetails={userDetails || { rol: "", email: "" }}>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Cargando...</span>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell userDetails={userDetails || { rol: "", email: "" }}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Asignar Tarea</h1>
            <p className="text-muted-foreground">Asigna esta tarea a un técnico o supervisor.</p>
          </div>
          <Link href={`/dashboard/tareas/${params.id}`}>
            <Button variant="outline">Volver a detalles</Button>
          </Link>
        </div>
        
        {tarea && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Información de la Tarea</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{tarea.titulo}</h3>
                  <p className="text-muted-foreground">{tarea.descripcion}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm font-medium">Estado</p>
                    <Badge variant={tarea.estado === "pendiente" ? "outline" : 
                               tarea.estado === "en_progreso" ? "default" :
                               tarea.estado === "completada" ? "success" : "secondary"}>
                      {tarea.estado.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Prioridad</p>
                    <Badge variant={tarea.prioridad === "alta" ? "destructive" :
                               tarea.prioridad === "media" ? "warning" : "secondary"}>
                      {tarea.prioridad}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Proyecto</p>
                  <p>{tarea.proyecto?.nombre || "Sin proyecto"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Creado por</p>
                  <p>{tarea.creador?.nombre || "Desconocido"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Fecha límite</p>
                  <p>{tarea.fecha_limite ? format(new Date(tarea.fecha_limite), "PPP") : "Sin fecha límite"}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Asignar Tarea</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="usuario_asignado_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asignar a</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={saving}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un técnico o supervisor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {usuarios.map((usuario) => (
                                <SelectItem 
                                  key={usuario.id} 
                                  value={usuario.id}
                                >
                                  {usuario.nombre} ({usuario.rol})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {saving ? "Asignando..." : "Asignar Tarea"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
