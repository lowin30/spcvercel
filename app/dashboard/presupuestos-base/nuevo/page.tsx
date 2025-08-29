"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import PresupuestoBaseForm from "@/components/presupuesto-base-form"
import { createClient } from "@/lib/supabase-client"

export default function NuevoPresupuestoBasePage() {
  const [tareas, setTareas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const supabase = createClient()
        
        if (!supabase) {
          setError("No se pudo inicializar el cliente de Supabase")
          return
        }

        // Verificar sesión de usuario
        const sessionResponse = await supabase.auth.getSession()
        const session = sessionResponse.data.session
        
        if (!session) {
          router.push("/login")
          return
        }
        
        setUserId(session.user.id)
        
        // Obtener detalles del usuario
        const userResponse = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", session.user.id)
          .single()
          
        const userData = userResponse.data
        const userError = userResponse.error
          
        if (userError) {
          console.error("Error al obtener detalles del usuario:", userError)
          setError("Error al obtener detalles del usuario")
          return
        }
        
        setUserDetails(userData)
        
        // Solo supervisores y admins pueden acceder a esta página
        if (userData?.rol !== "supervisor" && userData?.rol !== "admin") {
          router.push("/dashboard")
          return
        }

        // Construir la consulta base
        const tareasBaseQuery = supabase.from("tareas").select("*")

        // Si es supervisor, filtrar solo sus tareas
        const filteredQuery = userData?.rol === "supervisor" 
          ? tareasBaseQuery.eq("id_supervisor", session.user.id)
          : tareasBaseQuery

        // Ejecutar la consulta
        const tareasResponse = await filteredQuery
        
        if (tareasResponse.error) {
          console.error("Error al cargar tareas:", tareasResponse.error)
          setError("Error al cargar tareas")
          return
        }
        
        setTareas(tareasResponse.data || [])
        setLoading(false)
      } catch (err) {
        console.error("Error al cargar datos:", err)
        setError("Error al cargar datos")
        setLoading(false)
      }
    }
    
    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-6">
        <div className="bg-red-50 p-4 rounded-md mb-4">
          <h2 className="text-red-800 text-lg font-medium">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/presupuestos-base">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo Presupuesto Base</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crear Presupuesto Base</CardTitle>
        </CardHeader>
        <CardContent>
          <PresupuestoBaseForm tareas={tareas} userId={userId || ""} />
        </CardContent>
      </Card>
    </div>
  )
}
