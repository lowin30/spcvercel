"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AssignWorkersForm } from "@/components/assign-workers-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"

interface AssignWorkersPageProps {
  params: {
    id: string
  }
}

export default function AssignWorkersPage({ params }: AssignWorkersPageProps) {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<any>(null)
  const [tarea, setTarea] = useState<any>(null)
  const [supervisorAsignado, setSupervisorAsignado] = useState<any>(null)
  const [trabajadoresActuales, setTrabajadoresActuales] = useState<any[]>([])
  const [trabajadores, setTrabajadores] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Verificar sesión de usuario
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }
        
        // Obtener detalles del usuario
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", session.user.id)
          .single()
          
        if (userError) {
          console.error("Error al obtener datos del usuario:", userError)
          router.push('/login')
          return
        }
        
        setUserDetails(userData)

        // Verificar permisos
        const esAdmin = userData?.rol === "admin"
        const esSupervisor = userData?.rol === "supervisor"

        if (!esAdmin && !esSupervisor) {
          router.push("/dashboard")
          return
        }
        
        try {
          // Obtener tarea
          const tareaResult = await supabase
            .from("tareas")
            .select("id, titulo")
            .eq("id", params.id)
            .single()
          
          // Manejar error de consulta de tarea
          if (tareaResult.error) {
            console.error("Error al obtener la tarea:", tareaResult.error)
            setError("No se pudo encontrar la tarea solicitada o hubo un error en la consulta")
            return
          }
          
          // Obtener supervisor asignado a esta tarea
          const supervisorResult = await supabase
            .from("supervisores_tareas")
            .select("id_supervisor")
            .eq("id_tarea", params.id)
            .maybeSingle()
          
          // Obtener trabajadores actuales
          const trabajadoresActualesResult = await supabase
            .from("trabajadores_tareas")
            .select("id_trabajador")
            .eq("id_tarea", params.id)
          
          // Consulta específica para trabajadores
          console.log("Obteniendo trabajadores...")
          // Obtener TODOS los usuarios para filtrar después
          const trabajadoresResult = await supabase
            .from("usuarios")
            .select("id, email, color_perfil, rol")

          // Si no hay tarea, mostrar mensaje amigable
          if (!tareaResult.data) {
            setError("La tarea que estás buscando no existe o ha sido eliminada")
            return
          }
          
          // Verificar los resultados de las consultas
          console.log("=== DEPURACIÓN ASIGNACIÓN TRABAJADORES ===")
          console.log("Tarea:", tareaResult?.data)
          console.log("Supervisor asignado:", supervisorResult?.data)
          console.log("Trabajadores actuales (raw):", trabajadoresActualesResult)
          
          // Asegurarse de que trabajadoresActualesResult es un objeto con propiedad data
          if ('data' in trabajadoresActualesResult) {
            console.log("Trabajadores actuales (data):", trabajadoresActualesResult.data)
          } else {
            console.log("Trabajadores actuales: formato de respuesta inesperado", trabajadoresActualesResult)
          }
          
          // Asegurarse de que trabajadoresResult es un objeto con propiedad data
          if ('data' in trabajadoresResult) {
            console.log("Trabajadores disponibles:", trabajadoresResult.data?.length, "trabajadores encontrados")
            console.log("Detalles de trabajadores:", trabajadoresResult.data)
          } else {
            console.log("Trabajadores disponibles: formato de respuesta inesperado", trabajadoresResult)
          }
          
          // Procesar y almacenar los datos de forma segura verificando que sean del tipo correcto
          if ('data' in tareaResult && tareaResult.data) {
            setTarea(tareaResult.data)
          }
          
          if ('data' in supervisorResult) {
            setSupervisorAsignado(supervisorResult.data)
          }
          
          // Verificar trabajadores actuales
          if ('data' in trabajadoresActualesResult) {
            console.log('Trabajadores actuales cargados:', trabajadoresActualesResult.data?.length || 0);
            setTrabajadoresActuales(trabajadoresActualesResult.data || [])
          } else {
            setTrabajadoresActuales([])
          }
          
          // Procesamiento normal inicial
          if ('data' in trabajadoresResult && trabajadoresResult.data) {
            console.log('Trabajadores iniciales:', trabajadoresResult.data.length)
          }
          
          // Consulta adicional para obtener TODOS los usuarios sin filtros
          try {
            const { data: todosUsuarios } = await supabase
              .from("usuarios")
              .select("id, email, color_perfil, rol")
            
            if (todosUsuarios) {
              console.log("TODOS LOS USUARIOS:", todosUsuarios.length)
              // Filtrar manualmente solo los trabajadores
              const trabajadoresCompletos = todosUsuarios.filter(u => u.rol === "trabajador")
              console.log("TRABAJADORES FILTRADOS:", trabajadoresCompletos.length)
              
              // Verificar si encontramos al trabajador que faltaba
              const encontradoMireTendencia = trabajadoresCompletos.some(t => 
                t.email === "miretendencia@gmail.com")
              console.log("¿Se encontró miretendencia@gmail.com?", encontradoMireTendencia)
              
              // Usar esta lista completa
              setTrabajadores(trabajadoresCompletos)
            }
          } catch (error) {
            console.error("Error al obtener usuarios adicionales:", error)
          }
          
          // Verificar si el supervisor actual está asignado a esta tarea
          const esSupervisorDeTarea = esSupervisor && 'data' in supervisorResult && supervisorResult.data?.id_supervisor === userData?.id
        
        // Verificar los resultados de las consultas
        console.log("=== DEPURACIÓN ASIGNACIÓN TRABAJADORES ===")
        console.log("Tarea:", tareaResult?.data)
        console.log("Supervisor asignado:", supervisorResult?.data)
        console.log("Trabajadores actuales (raw):", trabajadoresActualesResult)
        
        // Asegurarse de que trabajadoresActualesResult es un objeto con propiedad data
        if ('data' in trabajadoresActualesResult) {
          console.log("Trabajadores actuales (data):", trabajadoresActualesResult.data)
        } else {
          console.log("Trabajadores actuales: formato de respuesta inesperado", trabajadoresActualesResult)
        }
        
        // Asegurarse de que trabajadoresResult es un objeto con propiedad data
        if ('data' in trabajadoresResult) {
          console.log("Trabajadores disponibles:", trabajadoresResult.data?.length, "trabajadores encontrados")
          console.log("Detalles de trabajadores:", trabajadoresResult.data)
        } else {
          console.log("Trabajadores disponibles: formato de respuesta inesperado", trabajadoresResult)
        }
        
        // Procesar y almacenar los datos de forma segura verificando que sean del tipo correcto
        if ('data' in tareaResult && tareaResult.data) {
          setTarea(tareaResult.data)
        }
        
        if ('data' in supervisorResult) {
          setSupervisorAsignado(supervisorResult.data)
        }
        
        // Verificar trabajadores actuales
        if ('data' in trabajadoresActualesResult) {
          console.log('Trabajadores actuales cargados:', trabajadoresActualesResult.data?.length || 0);
          setTrabajadoresActuales(trabajadoresActualesResult.data || [])
        } else {
          setTrabajadoresActuales([])
        }
        
        // Verificar trabajadores disponibles
        if ('data' in trabajadoresResult) {
          console.log('Trabajadores disponibles cargados:', trabajadoresResult.data?.length || 0);
          console.log('Primer trabajador:', trabajadoresResult.data?.[0]);
          setTrabajadores(trabajadoresResult.data || [])
        } else {
          setTrabajadores([])
        }
        
        // Verificar si el supervisor actual está asignado a esta tarea
        const esSupervisorDeTarea = esSupervisor && 'data' in supervisorResult && supervisorResult.data?.id_supervisor === userData?.id

        // Si es supervisor pero no está asignado a esta tarea, redirigir
        if (esSupervisor && !esSupervisorDeTarea) {
          router.push("/dashboard/tareas")
          return
        }
        
        // Verificar que se carguen trabajadores
        if ('data' in trabajadoresResult && (!trabajadoresResult.data || trabajadoresResult.data.length === 0)) {
          console.warn('No se encontraron trabajadores con rol "trabajador"')
        }
      } catch (err) {
        console.error("Error inesperado:", err)
        setError("Ocurrió un error al cargar los datos")
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [params.id, router, supabase])
  
  // Consulta de diagnóstico para verificar usuarios por rol
  useEffect(() => {
    async function verificarUsuarios() {
      try {
        // Consultar todos los roles de usuario para diagnóstico
        const { data: usuariosData } = await supabase
          .from("usuarios")
          .select("rol")
        
        console.log("=== DIAGNÓSTICO DE ROLES DE USUARIO ===")
        console.log("Total usuarios:", usuariosData?.length || 0)
        
        // Contar usuarios por rol
        const roleCount: Record<string, number> = {};
        usuariosData?.forEach((user: { rol: string }) => {
          const rol = user.rol || 'desconocido';
          roleCount[rol] = (roleCount[rol] || 0) + 1;
        });
        
        // Log directo de todos los usuarios con rol trabajador para verificar exactamente qué está pasando
        console.log("USUARIOS TRABAJADORES:");
          // Obtener TODOS los trabajadores disponibles - consulta forzada sin filtros adicionales
          const { data: trabajadores } = await supabase
            .from("usuarios")
            .select("id, email, color_perfil");
        
        console.log(trabajadores);
        console.log("Usuarios por rol:", roleCount);
        console.log("=== FIN DIAGNÓSTICO ===")
      } catch (error) {
        console.error("Error en diagnóstico:", error);
      }
    }
    
    verificarUsuarios();
  }, [supabase]);
  
  // Extraer valores para usar en la renderización
  const esAdmin = userDetails?.rol === "admin"
  const esSupervisor = userDetails?.rol === "supervisor"
  
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-muted-foreground mb-6">
          {error}
        </p>
        <Button onClick={() => router.push("/dashboard/tareas")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la lista de tareas
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" className="mr-2" onClick={() => router.push(`/dashboard/tareas/${params.id}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver a la tarea
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Gestionar trabajadores</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asignar trabajadores a: {tarea.titulo}</CardTitle>
          <CardDescription>Selecciona los trabajadores que realizarán esta tarea</CardDescription>
        </CardHeader>
        <CardContent>
          <AssignWorkersForm
            taskId={tarea.id}
            currentWorkerEmails={[]}
            workers={trabajadores}
          />
          {/* Log para depuración */}
          <div className="hidden" suppressHydrationWarning>
            {typeof window !== 'undefined' && (() => {
              console.log('Datos pasados a AssignWorkersForm:', {
                taskId: tarea.id,
                workerCount: trabajadores?.length,
                workers: trabajadores,
                currentWorkerEmails: trabajadoresActuales.map((t) => t.usuarios?.email || '') || []
              });
              return null;
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
