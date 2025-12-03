"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import ConfiguracionTabs from "@/components/configuracion-tabs"
import { Loader2 } from "lucide-react"

export default function ConfiguracionPage() {
  // 1. Definición de estados
  const [userDetails, setUserDetails] = useState<any>(null)
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [combinedUsers, setCombinedUsers] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [administradores, setAdministradores] = useState<any[]>([])
  const [estadosTareas, setEstadosTareas] = useState<any[]>([])
  const [estadosPresupuestos, setEstadosPresupuestos] = useState<any[]>([])
  const [estadosFacturas, setEstadosFacturas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // 2. Efecto para cargar datos
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        
        // 3. Inicialización del cliente Supabase
        const supabase = createClient()
        
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
        console.log("Configuración - Usuario:", userData?.email, "Rol:", userData?.rol)
        
        // 6. Verificación de permisos
        if (userData?.rol !== "admin") {
          console.log("Usuario no es admin, redirigiendo al dashboard")
          router.push("/dashboard")
          return
        }

        // 7. Obtener todos los usuarios
        const { data: usuariosData, error: usuariosError } = await supabase
          .from("usuarios")
          .select("*")
          .order("email")
        
        if (usuariosError) {
          console.error("Error al obtener usuarios:", usuariosError)
          setError("Error al cargar usuarios")
          return
        }
        
        // 8. Obtener trabajadores
        const { data: trabajadoresData, error: trabajadoresError } = await supabase
          .from("usuarios")
          .select("*")
          .eq("rol", "trabajador")
          .order("email")
        
        if (trabajadoresError) {
          console.error("Error al obtener trabajadores:", trabajadoresError)
          setError("Error al cargar trabajadores")
          return
        }
        
        // 8.1 Obtener configuración de trabajadores por separado
        const trabajadoresIds = trabajadoresData?.map(t => t.id) || []
        let configTrabajadores = []
        
        if (trabajadoresIds.length > 0) {
          const { data: configData, error: configError } = await supabase
            .from("configuracion_trabajadores")
            .select("*")
            .in("id_trabajador", trabajadoresIds)
            
          if (!configError) {
            configTrabajadores = configData || []
          }
        }
        
        // 8.2 Combinar los datos manualmente
        const trabajadoresConConfig = trabajadoresData?.map(trabajador => {
          const config = configTrabajadores.find((c: any) => c.id_trabajador === trabajador.id)
          return {
            ...trabajador,
            configuracion_trabajadores: config ? {
              salario_diario: config.salario_diario,
              activo: config.activo
            } : null
          }
        }) || []
        
        // 9-10. Usar directamente los usuarios de la base de datos
        // Nota: No podemos usar auth.admin.listUsers() desde el cliente
        // porque requiere permisos especiales de administrador
        const combinedUsersData = usuariosData?.map((dbUser: any) => {
          return {
            id: dbUser.id,
            email: dbUser.email,
            rol: dbUser.rol || "sin_rol",
            color_perfil: dbUser.color_perfil || "#cccccc",
            last_sign_in_at: null, // No tenemos estos datos desde el cliente
            created_at: dbUser.created_at
          }
        })
        
        // Obtener productos y categorías
        try {
          // Cargar categorías
          const { data: categoriasData, error: categoriasError } = await supabase
            .from("categorias_productos")
            .select("*")
            .order("nombre")

          if (categoriasError) {
            console.error("Error al cargar categorías:", categoriasError)
          } else {
            setCategorias(categoriasData || [])
          }

          // Cargar productos con sus categorías
          const { data: productosData, error: productosError } = await supabase
            .from("productos")
            .select(`
              *,
              categorias_productos (id, nombre)
            `)
            .order("nombre")

          if (productosError) {
            console.error("Error al cargar productos:", productosError)
          } else {
            setProductos(productosData || [])
          }
        } catch (err) {
          console.error("Error al cargar productos o categorías:", err)
        }
        
        // Cargar administradores con conteo de edificios usando RPC
        try {
          // Usar SQL directo para hacer LEFT JOIN y obtener el conteo en una sola query
          const { data: administradoresData, error: administradoresError } = await supabase.rpc('obtener_administradores_con_edificios')
            
          if (administradoresError) {
            console.error("Error al cargar administradores con RPC:", administradoresError)
            // Fallback: cargar sin conteo
            const { data: fallbackData } = await supabase
              .from("administradores")
              .select(`
                id,
                code,
                nombre,
                telefono,
                estado,
                aplica_ajustes,
                porcentaje_default,
                email1,
                email2,
                created_at
              `)
              .order("nombre", { ascending: true })
            
            setAdministradores((fallbackData || []).map(admin => ({
              ...admin,
              total_edificios: 0
            })))
          } else {
            setAdministradores(administradoresData || [])
          }
        } catch (err) {
          console.error("Error al cargar administradores:", err)
          setAdministradores([])
        }
        
        // Cargar estados
        try {
          // 1. Estados de tareas
          const { data: tareaData, error: tareaError } = await supabase
            .from("estados_tareas")
            .select("*")
            .order("orden", { ascending: true })
          
          if (tareaError) {
            console.error("Error al cargar estados de tareas:", tareaError)
          } else {
            setEstadosTareas(tareaData || [])
          }
          
          // 2. Estados de presupuestos
          const { data: presupuestoData, error: presupuestoError } = await supabase
            .from("estados_presupuestos")
            .select("*")
            .order("orden", { ascending: true })
          
          if (presupuestoError) {
            console.error("Error al cargar estados de presupuestos:", presupuestoError)
          } else {
            setEstadosPresupuestos(presupuestoData || [])
          }
          
          // 3. Estados de facturas
          const { data: facturaData, error: facturaError } = await supabase
            .from("estados_facturas")
            .select("*")
            .order("orden", { ascending: true })
          
          if (facturaError) {
            console.error("Error al cargar estados de facturas:", facturaError)
          } else {
            setEstadosFacturas(facturaData || [])
          }
        } catch (err) {
          console.error("Error al cargar estados:", err)
        }
        
        // 11. Actualización del estado
        setTrabajadores(trabajadoresConConfig) // Usar los datos combinados con configuración
        setCombinedUsers(combinedUsersData || [])
        setLoading(false)
      } catch (err) {
        console.error("Error inesperado:", err)
        setError("Error inesperado al cargar la configuración")
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
          <span className="ml-2">Cargando configuración...</span>
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
    <div className="container mx-auto py-6 md:py-10 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">
            Configuración general del sistema y usuarios
          </p>
        </div>
      </div>

      {/* Pasamos los datos cargados al componente de pestañas */}
      <ConfiguracionTabs 
        trabajadores={trabajadores} 
        combinedUsers={combinedUsers}
        productos={productos}
        categorias={categorias}
        administradores={administradores}
        estadosTareas={estadosTareas}
        estadosPresupuestos={estadosPresupuestos}
        estadosFacturas={estadosFacturas}
      />
    </div>
  )
}
