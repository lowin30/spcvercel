"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { PresupuestosBaseClient } from "./presupuestos-base-client"

export default function PresupuestosBasePage() {
  const [presupuestos, setPresupuestos] = useState<any[]>([])
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function cargarPresupuestos() {
      try {
        setLoading(true);
        setError(null);
        const supabase = createBrowserSupabaseClient();
        const {
          data: sessionData,
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !sessionData.session) {
          setError("Error al obtener la sesión del usuario.")
          setLoading(false)
          return
        }

        const user = sessionData.session.user
        if (!user) {
          setError("Usuario no autenticado.")
          setLoading(false)
          return
        }

        // Obtener el rol del usuario
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("rol")
          .eq("id", user.id)
          .single()

        if (userError || !userData) {
          console.error("Error al obtener detalles del usuario:", userError)
          setError("No se pudieron cargar los detalles del usuario")
          setLoading(false)
          return
        }
        
        setUserDetails(userData)

        // Solo supervisores y admins pueden acceder a esta página
        if (userData?.rol !== "supervisor" && userData?.rol !== "admin") {
          router.push("/dashboard")
          return
        }
  
        // Construir consulta base
        let query = supabase
          .from("presupuestos_base")
          .select(`
            *,
            tareas (id, titulo, code)
          `)
          
        // Si es supervisor, filtrar solo sus presupuestos
        if (userData?.rol === "supervisor") {
          query = query.eq("id_supervisor", user.id)
        }
        
        // Ejecutar la consulta
        const { data: presupuestosBase, error: presupuestosError } = await query
          .order('created_at', { ascending: false })
          .limit(50) // Limitar resultados iniciales para mejor rendimiento
        
        // Manejar error en la consulta
        if (presupuestosError) {
          console.error("Error al cargar presupuestos base:", presupuestosError)
          setError("No se pudieron cargar los presupuestos base")
          setLoading(false)
          return
        }
        
        setPresupuestos(presupuestosBase || [])
        
      } catch (err: any) {
        console.error("Error inesperado:", err)
        setError(err.message || "Ocurrió un error inesperado")
      } finally {
        setLoading(false)
      }
    }
    
    cargarPresupuestos();
  }, [router]);
  
  // Mostrar pantalla de carga
  if (loading) {
    return (
      <div className="py-6 px-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando presupuestos...</span>
      </div>
    )
  }
  
  // Mostrar errores
  if (error) {
    return (
      <div className="py-4 px-2 sm:py-6 sm:px-4">
        <div className="bg-red-50 p-3 sm:p-4 rounded-md mb-4">
          <h2 className="text-red-800 text-base sm:text-lg font-medium">Error</h2>
          <p className="text-red-700 text-sm sm:text-base">{error}</p>
        </div>
      </div>
    )
  }
  
  // Pasar datos al componente cliente
  return (
    <PresupuestosBaseClient 
      initialData={presupuestos} 
      userRole={userDetails?.rol || ''}
      userId={userDetails?.id || ''}
    />
  )
}
