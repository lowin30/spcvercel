"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { TaskForm } from "@/components/task-form" // Asegúrate que la ruta sea correcta
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Loader2, Plus } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export default function NuevaTareaPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<any>(null)
  // const [edificios, setEdificios] = useState<any[]>([]) // Eliminado

  const [supervisores, setSupervisores] = useState<any[]>([])
  const [trabajadores, setTrabajadores] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null); // Reset error state at the beginning
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          console.error('Error fetching session or no session:', sessionError);
          router.push('/login');
          setLoading(false);
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userError) {
          console.error('Error al obtener datos del usuario:', userError);
          toast({
            title: 'Error de Autenticación',
            description: 'No se pudieron obtener los datos del usuario. ' + userError.message,
            variant: 'destructive',
          });
          router.push('/login');
          setLoading(false);
          return;
        }
        setUserDetails(userData);

        if (userData?.rol !== 'supervisor' && userData?.rol !== 'admin') {
          toast({
            title: 'Acceso Denegado',
            description: 'No tienes permisos para crear tareas.',
            variant: 'destructive',
          });
          router.push('/dashboard');
          setLoading(false);
          return;
        }

        // Cargar Supervisores
        let supervisoresData: any[] = [];
        try {
          const { data: supervisoresFetched, error: supervisoresError } = await supabase
            .from('usuarios')
            .select('id, email, rol, code, color_perfil')
            .eq('rol', 'supervisor')
            .order('email', { ascending: true });

          if (supervisoresError) {
            console.error('Error fetching supervisores:', supervisoresError);
            toast({
              title: 'Error Supervisores',
              description: 'No se pudieron cargar los supervisores. ' + supervisoresError.message,
              variant: 'destructive',
            });
            // Continue execution, TaskForm might still be usable with empty supervisors
          } else {
            supervisoresData = supervisoresFetched || [];
          }
        } catch (error: any) {
          console.error('Error catastrófico fetching supervisores:', error);
          toast({
            title: 'Error Crítico Supervisores',
            description: 'Error inesperado al cargar supervisores. ' + error.message,
            variant: 'destructive',
          });
        }

        // Cargar Trabajadores
        let trabajadoresDataMapped: any[] = [];
        try {
          const { data: trabajadoresFetched, error: trabajadoresError } = await (supabase
            .from('usuarios')
            .select('id, email, rol, color_perfil, configuracion_trabajadores!inner(activo)')
            .eq('rol', 'trabajador') // Filtro en la tabla usuarios
            .eq('configuracion_trabajadores.activo', true) // Filtro en la tabla join configuracion_trabajadores
            .order('email', { ascending: true }) as any);

          if (trabajadoresError) {
            console.error('Error fetching trabajadores:', trabajadoresError);
            toast({
              title: 'Error Trabajadores',
              description: 'No se pudieron cargar los trabajadores. ' + trabajadoresError.message,
              variant: 'destructive',
            });
            // Continue execution, TaskForm might still be usable with empty trabajadores
          } else {
            trabajadoresDataMapped = trabajadoresFetched?.map((t: {id: string; email: string; rol: string; color_perfil: string;}) => ({
              id: t.id,
              email: t.email,
              // nombre: t.nombre, // Columna no existe
              rol: t.rol,
              color_perfil: t.color_perfil,
            })) || [];
          }
        } catch (error: any) {
          console.error('Error catastrófico fetching trabajadores:', error);
          toast({
            title: 'Error Crítico Trabajadores',
            description: 'Error inesperado al cargar trabajadores. ' + error.message,
            variant: 'destructive',
          });
        }

        setSupervisores(supervisoresData);
        setTrabajadores(trabajadoresDataMapped);

      } catch (err: any) {
        console.error('Error general al cargar datos para nueva tarea:', err);
        setError('Ocurrió un error al cargar los datos necesarios: ' + err.message);
        toast({
          title: 'Error General',
          description: 'No se pudieron cargar todos los datos para el formulario. ' + err.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-md bg-destructive/15 p-4 text-center">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/tareas')}>
            Volver a tareas
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" className="mr-2" onClick={() => router.push("/dashboard/tareas")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Nueva Tarea</h1>
      </div>

      <TaskForm
        supervisores={supervisores}
        trabajadores={trabajadores}
      />
    </div>
  )
}