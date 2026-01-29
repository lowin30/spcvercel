"use client"

import { useState, useEffect } from "react"
import React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { TaskWizard } from "@/components/tasks/task-wizard"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface EditarTareaPageProps {
  params: Promise<{ id: string }>
}

export default function EditarTareaPage({ params: paramsPromise }: EditarTareaPageProps) {
  // Usar React.use para desenvolver la promesa de params
  const { id } = React.use(paramsPromise);
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<any>(null)
  const [task, setTask] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Verificar la sesión del usuario
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          console.error('Error fetching session or no session:', sessionError);
          router.push('/login');
          setLoading(false);
          return;
        }

        // 2. Obtener datos del usuario actual
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userError) {
          console.error('Error al obtener datos del usuario:', userError);
          toast({
            title: 'Error',
            description: 'No se pudieron obtener los datos del usuario: ' + userError.message,
            variant: 'destructive'
          });
          router.push('/login');
          setLoading(false);
          return;
        }

        // Verificar si el usuario tiene permisos para editar tareas (admin o supervisor)
        if (userData.rol !== 'admin' && userData.rol !== 'supervisor') {
          toast({
            title: 'Error de permisos',
            description: 'No tienes permisos para editar tareas.',
            variant: 'destructive'
          });
          router.push('/dashboard/tareas');
          setLoading(false);
          return;
        }

        setUserDetails(userData);

        // 3. Obtener datos de la tarea a editar usando tabla base
        const { data: taskData, error: taskError } = await supabase
          .from('tareas')
          .select('*')
          .eq('id', id)
          .single();

        if (taskError || !taskData) {
          console.error('Error al cargar la tarea:', taskError);
          toast({
            title: 'Error',
            description: 'No se pudo cargar la tarea: ' + (taskError?.message || 'Tarea no encontrada'),
            variant: 'destructive'
          });
          router.push('/dashboard/tareas');
          setLoading(false);
          return;
        }

        // 4. Obtener relaciones de forma explícita y separada para máxima fiabilidad
        const [superRel, workRel, deptRel] = await Promise.all([
          supabase.from('supervisores_tareas').select('id_supervisor').eq('id_tarea', id).maybeSingle(),
          supabase.from('trabajadores_tareas').select('id_trabajador').eq('id_tarea', id).maybeSingle(),
          supabase.from('departamentos_tareas').select('id_departamento').eq('id_tarea', id)
        ]);

        // Mapear IDs para el Wizard de forma ultra-segura
        const mappedTask = {
          ...taskData,
          id_administrador: taskData.id_administrador?.toString() || "",
          id_edificio: taskData.id_edificio?.toString() || "",
          // Extraer IDs de departamentos
          departamentos_ids: (deptRel.data || [])
            .map((d: any) => d.id_departamento.toString())
            .filter(Boolean),
          id_supervisor: superRel.data?.id_supervisor || "",
          id_asignado: workRel.data?.id_trabajador || "",
          id_estado_nuevo: taskData.id_estado_nuevo?.toString() || "1",
          fecha_visita: taskData.fecha_visita ? new Date(taskData.fecha_visita) : null
        };

        console.log("Wizard Debug - Departments found:", mappedTask.departamentos_ids.length);
        setTask(mappedTask);
        setLoading(false);
      } catch (error: any) {
        console.error('Error al cargar datos:', error);
        setError(error.message || 'Error desconocido');
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase, router, id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Cargando datos de la tarea...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-destructive font-semibold">Error: {error}</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/tareas">Volver a Tareas</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/tareas">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver a Tareas
            </Link>
          </Button>
          <h1 className="text-xl font-bold">Editar Tarea: {task?.titulo}</h1>
        </div>
      </div>

      {task && (
        <TaskWizard
          mode="edit"
          taskId={Number(id)}
          defaultValues={task}
          onSuccess={() => {
            toast({ title: "Éxito", description: "Tarea actualizada correctamente" });
            router.push(`/dashboard/tareas/${id}`);
          }}
        />
      )}
    </div>
  );
}
