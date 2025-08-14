"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { AdminList } from "@/components/admin-list"
import Link from "next/link"
import { Plus, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Interfaz para el administrador
interface Administrador {
  id: number
  created_at: string
  aplica_ajustes: boolean
  porcentaje_default: number
  estado: string
  code: string
  nombre: string
  telefono: string
}

export default function AdministradoresPage() {
  // 1. Definición de estados
  const [administradores, setAdministradores] = useState<Administrador[]>([])
  const [administradoresActivos, setAdministradoresActivos] = useState<Administrador[]>([])
  const [administradoresInactivos, setAdministradoresInactivos] = useState<Administrador[]>([])
  const [conteoEdificios, setConteoEdificios] = useState<Record<number, number>>({})
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
        console.log("Administradores - Usuario:", userData?.email, "Rol:", userData?.rol)
        
        // 6. Verificación de permisos
        if (userData?.rol !== "admin") {
          console.log("Redirigiendo a dashboard porque el rol no es admin:", userData?.rol)
          router.push("/dashboard")
          return
        }

        // 7. Consulta principal de datos usando la vista optimizada
        const administradoresResponse = await supabase
          .from("vista_administradores")
          .select("*")
          .order("created_at", { ascending: false })
        
        const administradoresData = administradoresResponse.data
        const administradoresError = administradoresResponse.error
          
        if (administradoresError) {
          console.error("Error al cargar administradores:", administradoresError)
          setError("Error al cargar los datos de administradores")
          return
        }
        
        // 8. Filtrar administradores por estado
        const activos = administradoresData?.filter((admin: Administrador) => admin.estado === "activo") || []
        const inactivos = administradoresData?.filter((admin: Administrador) => admin.estado === "inactivo") || []
        
        // 9. Obtener edificios para cada administrador
        const edificiosResponse = await supabase
          .from("edificios")
          .select("id_administrador")
        
        const edificiosData = edificiosResponse.data
        const edificiosError = edificiosResponse.error
          
        if (edificiosError) {
          console.error("Error al cargar edificios:", edificiosError)
        }

        // 10. Contar edificios por administrador
        const conteo = edificiosData?.reduce(
          (acc: Record<number, number>, edificio: { id_administrador: number }) => {
            acc[edificio.id_administrador] = (acc[edificio.id_administrador] || 0) + 1
            return acc
          },
          {} as Record<number, number>,
        ) || {}
        
        // 11. Actualizar estados
        setAdministradores(administradoresData || [])
        setAdministradoresActivos(activos)
        setAdministradoresInactivos(inactivos)
        setConteoEdificios(conteo)
        setLoading(false)
      } catch (err) {
        console.error("Error inesperado:", err)
        setError("Error inesperado al cargar datos")
        setLoading(false)
      }
    }
    
    loadData()
  }, [router])

  // 12. Renderizado condicional para estado de carga
  if (loading) {
    return (
      <div className="container mx-auto py-6 md:py-10 space-y-8">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando administradores...</span>
        </div>
      </div>
    )
  }

  // 13. Renderizado condicional para errores
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

  // 14. Renderizado principal
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administradores</h1>
          <p className="text-xs text-muted-foreground">
            Usuario: {userDetails?.email} - Rol: {userDetails?.rol}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/administradores/nuevo">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Administrador
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de Administradores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg">
              <h3 className="font-medium">Activos</h3>
              <p className="text-2xl font-bold">{administradoresActivos.length}</p>
            </div>
            <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg">
              <h3 className="font-medium">Inactivos</h3>
              <p className="text-2xl font-bold">{administradoresInactivos.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AdminList admins={administradores || []} edificiosPorAdmin={conteoEdificios} />
    </div>
  )
}
