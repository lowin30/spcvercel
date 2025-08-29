"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AssignSupervisorForm } from "@/components/assign-supervisor-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import { UserSessionData } from "@/lib/types"

interface AssignSupervisorPageProps {
  params: {
    id: string
  }
}

export default function AssignSupervisorPage({ params }: AssignSupervisorPageProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<UserSessionData | null>(null)
  const [tarea, setTarea] = useState<any>(null)
  const [supervisorActual, setSupervisorActual] = useState<any>(null)
  const [supervisores, setSupervisores] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Verificar sesión de usuario
        const sessionResponse = await supabase.auth.getSession()
        const session = sessionResponse.data.session
        if (!session) {
          router.push('/login')
          return
        }
        
        // Obtener detalles del usuario
        const userResponse = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", session.user.id)
          .single()
        
        const userData = userResponse.data
        const userError = userResponse.error
          
        if (userError) {
          console.error("Error al obtener datos del usuario:", userError)
          router.push('/login')
          return
        }
        
        setUserDetails(userData)

        // Verificar permisos - solo admin puede asignar supervisor
        const esAdmin = userData?.rol === "admin"

        if (!esAdmin) {
          router.push("/dashboard")
          return
        }
        
        // Cargar datos en paralelo
        // Obtener tarea usando la vista optimizada
        const tareaResult = await supabase
          .from("vista_tareas_completa")
          .select("id, titulo")
          .eq("id", params.id)
          .single()
          
        // Obtener supervisor actual
        const supervisorActualResult = await supabase
          .from("supervisores_tareas")
          .select("id_supervisor")
          .eq("id_tarea", params.id)
          .maybeSingle()
          
        // Obtener supervisores disponibles
        const supervisoresResult = await supabase
          .from("usuarios")
          .select("id, email")
          .eq("rol", "supervisor")
        
        if (tareaResult.error) {
          console.error("Error al obtener la tarea:", tareaResult.error)
          setError("No se pudo encontrar la tarea solicitada")
          return
        }
        
        if (!tareaResult.data) {
          setError("La tarea que buscas no existe o ha sido eliminada")
          return
        }
        
        setTarea(tareaResult.data)
        setSupervisorActual(supervisorActualResult.data)
        setSupervisores(supervisoresResult.data || [])
        
      } catch (err) {
        console.error("Error inesperado:", err)
        setError("Ocurrió un error al cargar los datos")
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [params.id, router, supabase])
  
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
        <h1 className="text-2xl font-bold tracking-tight">Asignar supervisor a tarea</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asignar supervisor a: {tarea.titulo}</CardTitle>
          <CardDescription>Selecciona el supervisor que estará a cargo de esta tarea</CardDescription>
        </CardHeader>
        <CardContent>
          <AssignSupervisorForm
            taskId={tarea.id}
            currentSupervisorId={supervisorActual?.id_supervisor || null}
            supervisors={supervisores || []}
          />
        </CardContent>
      </Card>
    </div>
  )
}
