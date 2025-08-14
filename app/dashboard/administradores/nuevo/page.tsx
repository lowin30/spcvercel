"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { AdminForm } from "@/components/admin-form"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"

export default function NuevoAdministradorPage() {
  // 1. Definición de estados
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // 2. Efecto para cargar datos
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        
        // 3. Inicialización del cliente Supabase
        const supabase = createBrowserSupabaseClient()
        
        if (!supabase) {
          setError("No se pudo inicializar el cliente de Supabase")
          return
        }

        // 4. Verificación de sesión
        const sessionResponse = await supabase.auth.getSession()
        const session = sessionResponse.data.session
        
        if (!session) {
          router.push("/login")
          return
        }
        
        // 5. Obtención de datos del usuario
        const userResponse = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", session.user.id)
          .single()
        
        const userData = userResponse.data
        const userError = userResponse.error
        
        if (userError) {
          console.error("Error al obtener datos del usuario:", userError)
          setError("Error al obtener datos del usuario")
          return
        }
        
        setUserDetails(userData)
        
        // 6. Verificación de permisos
        if (userData?.rol !== "admin") {
          console.log("Redirigiendo a dashboard porque el rol no es admin:", userData?.rol)
          router.push("/dashboard")
          return
        }

        setLoading(false)
      } catch (err) {
        console.error("Error inesperado:", err)
        setError("Error inesperado al cargar datos")
        setLoading(false)
      }
    }
    
    loadData()
  }, [router])

  // 7. Renderizado condicional para estado de carga
  if (loading) {
    return (
      <div className="container mx-auto py-6 md:py-10 space-y-8">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando...</span>
        </div>
      </div>
    )
  }

  // 8. Renderizado condicional para errores
  if (error) {
    return (
      <div className="container mx-auto py-6 md:py-10 space-y-8">
        <div className="bg-red-50 p-4 rounded-md mb-4">
          <h2 className="text-red-800 text-lg font-medium">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }
  
  // 9. Renderizado principal
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link href="/dashboard/administradores">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo Administrador</h1>
      </div>

      <AdminForm />
    </div>
  )
}
