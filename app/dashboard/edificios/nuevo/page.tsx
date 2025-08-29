"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { BuildingForm } from "@/components/building-form"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"

export default function NuevoEdificioPage() {
  // 1. Definición de estados
  const [userDetails, setUserDetails] = useState<any>(null)
  const [administradores, setAdministradores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // 2. Efecto para cargar datos
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        
        // 3. Inicialización del cliente Supabase
        
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
          router.push("/dashboard")
          return
        }

        // 7. Obtener administradores para el formulario
        const administradoresResponse = await supabase
          .from("administradores")
          .select("id, nombre")
          .order("nombre")
        
        if (administradoresResponse.error) {
          console.error("Error al cargar administradores:", administradoresResponse.error)
          setError("Error al cargar datos de administradores")
          return
        }
        
        setAdministradores(administradoresResponse.data || [])
        setLoading(false)
      } catch (err) {
        console.error("Error inesperado:", err)
        setError("Error inesperado al cargar datos")
        setLoading(false)
      }
    }
    
    loadData()
  }, [router])

  // 8. Renderizado condicional para estado de carga
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

  // 9. Renderizado condicional para errores
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

  // 10. Renderizado principal
  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-2">
            <Link href="/dashboard/edificios">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo Edificio</h1>
        </div>
      </div>

      <BuildingForm administradores={administradores} supabase={supabase} />
    </div>
  )
}
