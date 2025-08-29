"use client"

import { useState, useEffect } from "react"
import React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { TaskForm } from "@/components/task-form"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

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
  const [supervisores, setSupervisores] = useState<any[]>([])
  const [trabajadores, setTrabajadores] = useState<any[]>([])

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

        // Verificar si el usuario tiene permisos para editar tareas (solo admin)
        if (userData.rol !== 'admin') {
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

        // 3. Obtener datos de la tarea a editar usando la vista optimizada
        const { data: taskData, error: taskError } = await supabase
          .from('vista_tareas_completa')
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

        // Ahora debemos cargar información adicional relacionada con la tarea
        // 1. Obtener edificio
        if (taskData.id_edificio) {
          const { data: edificioData } = await supabase
            .from('edificios')
            .select('id, nombre')
            .eq('id', taskData.id_edificio)
            .single();
          
          if (edificioData) {
            taskData.edificio = edificioData;
          }
        }

        // 2. Obtener supervisor
        if (taskData.id_supervisor) {
          const { data: supervisorData } = await supabase
            .from('usuarios')
            .select('id, email, rol, color_perfil')
            .eq('id', taskData.id_supervisor)
            .single();
          
          if (supervisorData) {
            taskData.supervisor = supervisorData;
          }
        }

        // 3. Obtener trabajador asignado
        if (taskData.id_asignado) {
          const { data: trabajadorData } = await supabase
            .from('usuarios')
            .select('id, email, rol, color_perfil')
            .eq('id', taskData.id_asignado)
            .single();
          
          if (trabajadorData) {
            taskData.trabajador_asignado = trabajadorData;
          }
        }

        console.log('Datos de la tarea cargados:', taskData);
        setTask(taskData);

        // 4. Cargar supervisores y trabajadores para el formulario
        const [supervisoresResult, trabajadoresResult] = await Promise.all([
          supabase
            .from('usuarios')
            .select('id, email, code, color_perfil, rol')
            .eq('rol', 'supervisor'),
          supabase
            .from('usuarios')
            .select('id, email, code, color_perfil, rol')
            .eq('rol', 'trabajador')
        ]);

        if (supervisoresResult.error) {
          console.error('Error al cargar supervisores:', supervisoresResult.error);
          toast({
            title: 'Error',
            description: 'No se pudieron cargar los supervisores',
            variant: 'destructive'
          });
        } else {
          setSupervisores(supervisoresResult.data || []);
        }

        if (trabajadoresResult.error) {
          console.error('Error al cargar trabajadores:', trabajadoresResult.error);
          toast({
            title: 'Error',
            description: 'No se pudieron cargar los trabajadores',
            variant: 'destructive'
          });
        } else {
          setTrabajadores(trabajadoresResult.data || []);
        }

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

      {task && supervisores && trabajadores && (
        <TaskForm
          key={task.id} // Añadir key para forzar re-render cuando cambian los datos
          task={{
            ...task,
            id_estado_nuevo: task.id_estado_nuevo || 1 // Asegurar que siempre tenga un valor numérico
          }}
          supervisores={supervisores}
          trabajadores={trabajadores}
          isEditMode={true}
        />
      )}
    </div>
  );
}
