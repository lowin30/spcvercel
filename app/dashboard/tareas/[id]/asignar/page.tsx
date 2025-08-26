"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AssignWorkersForm } from "@/components/assign-workers-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"

export default function AssignWorkersPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = getSupabaseClient()
  
  // Extraer el ID de la tarea desde params
  const tareaId = params.id as string
  
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
        
        if (!tareaId) {
          setError("ID de tarea no encontrado")
          return
        }

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
        
        if (!userData) {
          setError("No se encontró el usuario")
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
        
        // Obtener tarea
        const { data: tareaData, error: tareaError } = await supabase
          .from("tareas")
          .select("*")
          .eq("id", tareaId)
          .single()
          
        // Manejar error de consulta de tarea
        if (tareaError) {
          console.error("Error al obtener la tarea:", tareaError)
          setError("No se pudo encontrar la tarea solicitada o hubo un error en la consulta")
          return
        }
          
        // Si no hay tarea, mostrar mensaje amigable
        if (!tareaData) {
          setError("La tarea que estás buscando no existe o ha sido eliminada")
          return
        }
        
        // Guardar tarea en estado
        setTarea(tareaData)
        
        // Verificación adicional para supervisores (solo pueden ver sus propias tareas)
        if (esSupervisor && tareaData.supervisor_id !== userData.id) {
          router.push('/dashboard/tareas')
          return
        }
        
        // Obtener supervisor asignado a esta tarea si existe
        if (tareaData.supervisor_id) {
          try {
            const { data: supData } = await supabase
              .from("usuarios")
              .select("id, email, nombre, apellido")
              .eq("id", tareaData.supervisor_id)
              .single()
              
            if (supData) {
              setSupervisorAsignado({
                id: supData.id,
                email: supData.email,
                nombre: supData.nombre,
                apellido: supData.apellido
              })
            }
          } catch (error) {
            console.error("Error al obtener supervisor:", error)
          }
        }
        
        // Obtener trabajadores actuales asignados a esta tarea
        try {
          const { data: asignados = [], error: asignadosError } = await supabase
            .from("trabajadores_tareas")
            .select("id_trabajador")
            .eq("id_tarea", params.id)
            
          if (asignadosError) {
            console.error("Error al obtener trabajadores asignados:", asignadosError)
          } else {
            setTrabajadoresActuales(asignados)
          }
        } catch (error) {
          console.error("Error al obtener trabajadores actuales:", error)
        }
        
        // Consulta para obtener TODOS los usuarios y filtrar trabajadores
        try {
          const { data: todosUsuarios = [] } = await supabase
            .from("usuarios")
            .select("id, email, nombre, apellido, rol, color_perfil")
            
          console.log("=== DEPURACIÓN ASIGNACIÓN TRABAJADORES ===")
          console.log("Total usuarios:", todosUsuarios.length)
          
          // Filtrar solo trabajadores
          const trabajadoresFiltrados = todosUsuarios
            .filter((user: { rol: string }) => user.rol === "trabajador")
            
          // Asignar a estado
          setTrabajadores(trabajadoresFiltrados)
          console.log(`Trabajadores filtrados por rol (${trabajadoresFiltrados.length}):`, trabajadoresFiltrados)
          
          // Verificación de diagnóstico
          const encontradoMireTendencia = trabajadoresFiltrados.some(
            (t: { email: string }) => t.email === "miretendencia@gmail.com")
          console.log("¿Se encontró miretendencia@gmail.com?", encontradoMireTendencia)
          
          // Verificar que se carguen trabajadores
          if (!trabajadoresFiltrados || trabajadoresFiltrados.length === 0) {
            console.warn("No se encontraron trabajadores disponibles")
          }
        } catch (error) {
          console.error("Error al obtener usuarios:", error)
        }
        
      } catch (err) {
        console.error("Error inesperado:", err)
        setError("Ocurrió un error al cargar los datos")
      } finally {
        setLoading(false)
      }
    }
    
    fetchData();
  }, [params.id, router, supabase]);
  
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
        const roleCount: Record<string, number> = {}
        usuariosData?.forEach((user: { rol: string }) => {
          const rol = user.rol || 'desconocido'
          roleCount[rol] = (roleCount[rol] || 0) + 1
        });
        
        // Log directo de todos los usuarios con rol trabajador para verificar exactamente qué está pasando
        console.log("USUARIOS TRABAJADORES:")
        try {
          // Obtener TODOS los trabajadores disponibles - consulta forzada sin filtros adicionales
          const { data: trabajadoresDiag } = await supabase
            .from("usuarios")
            .select("id, email, color_perfil")
          
          console.log(trabajadoresDiag)
          console.log("Usuarios por rol:", roleCount)
          console.log("=== FIN DIAGNÓSTICO ===")
        } catch (diagError) {
          console.error("Error en consulta de diagnóstico:", diagError)
        }
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
        <Button variant="ghost" size="sm" className="mr-2" onClick={() => router.push(`/dashboard/tareas/${tareaId}`)}>
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
