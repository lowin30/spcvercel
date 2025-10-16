"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { PresupuestoDetailClient } from "./presupuesto-detail-client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase-client"

export default function PresupuestoBasePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [presupuesto, setPresupuesto] = useState<any>(null)
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargarDatos() {
      try {
        setLoading(true)
        setError(null)
        
        const supabase = createClient()
        
        // Verificar sesión
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          router.push("/login")
          return
        }
        
        // Verificar permisos del usuario
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("rol")
          .eq("id", session.user.id)
          .single()
        
        if (userError || !userData) {
          console.error("Error al obtener detalles del usuario:", userError)
          setError("No se pudieron cargar los detalles del usuario")
          return
        }
        
        setUserDetails(userData)
        
        // Solo supervisores y admins pueden acceder
        if (userData.rol !== "supervisor" && userData.rol !== "admin") {
          router.push("/dashboard")
          return
        }
        
        // Obtener presupuesto base con relación a supervisores_tareas
        const { data: presupuestoCompleto, error: presupuestoError } = await supabase
          .from("presupuestos_base")
          .select(`
            *,
            tareas (
              id,
              titulo,
              code,
              edificios (
                id,
                nombre
              )
            )
          `)
          .eq("id", params.id)
          .single()
        
        if (presupuestoError || !presupuestoCompleto) {
          console.error("Error al cargar el presupuesto base:", presupuestoError)
          setError("No se pudo encontrar el presupuesto solicitado")
          return
        }
        
        // Si es supervisor, verificar que está asignado a la tarea
        if (userData.rol === "supervisor") {
          const { data: supervisorAsignado, error: supervisorError } = await supabase
            .from("supervisores_tareas")
            .select("id")
            .eq("id_tarea", presupuestoCompleto.id_tarea)
            .eq("id_supervisor", session.user.id)
            .single()
          
          if (supervisorError || !supervisorAsignado) {
            setError("No tienes permiso para ver este presupuesto")
            return
          }
        }
        
        // El presupuesto ya viene con las relaciones correctas desde Supabase
        setPresupuesto(presupuestoCompleto)
        
      } catch (err: any) {
        console.error("Error inesperado:", err)
        setError(err.message || "Ocurrió un error inesperado")
      } finally {
        setLoading(false)
      }
    }
    
    cargarDatos()
  }, [params.id, router])
  
  // Mostrar pantalla de carga
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="mr-2" asChild>
            <Link href="/dashboard/presupuestos-base">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Cargando Presupuesto...</h1>
        </div>
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }
  
  // Mostrar errores
  if (error) {
    return renderError(error)
  }
  
  // Renderizar el presupuesto
  if (presupuesto && userDetails) {
    return <PresupuestoDetailClient presupuesto={presupuesto} userRole={userDetails.rol} />
  }
  
  return renderError("No se pudo cargar el presupuesto")
}

// Función auxiliar para renderizar errores
function renderError(message: string) {
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" className="mr-2" asChild>
          <Link href="/dashboard/presupuestos-base">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Error al Cargar</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">{message}</h2>
              <p className="text-muted-foreground">
                El presupuesto que buscas no está disponible o no tienes permiso para verlo.
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <Button variant="outline" asChild>
                <Link href="/dashboard/presupuestos-base">Ver todos los presupuestos</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
