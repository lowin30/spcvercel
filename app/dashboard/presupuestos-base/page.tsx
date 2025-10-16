"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
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
        const supabase = createClient();
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
  
        // Construir consulta según rol
        let presupuestosBase;
        let presupuestosError;
        
        if (userData?.rol === "admin") {
          // Admin ve todos los presupuestos con info de liquidación
          const result = await supabase
            .from("presupuestos_base")
            .select(`
              *,
              tareas (id, titulo, code),
              liquidaciones_nuevas!id_presupuesto_base (id)
            `)
            .order('created_at', { ascending: false })
            .limit(50)
          
          presupuestosBase = result.data
          presupuestosError = result.error
          
          // Filtrar por defecto: solo "por liquidar"
          if (presupuestosBase) {
            presupuestosBase = presupuestosBase.filter(pb => 
              !pb.liquidaciones_nuevas || pb.liquidaciones_nuevas.length === 0
            )
          }
          
        } else if (userData?.rol === "supervisor") {
          // Supervisor: obtener tareas asignadas y luego presupuestos
          const { data: tareasAsignadas, error: tareasError } = await supabase
            .from("supervisores_tareas")
            .select("id_tarea")
            .eq("id_supervisor", user.id)
          
          if (tareasError) {
            presupuestosError = tareasError
          } else if (tareasAsignadas && tareasAsignadas.length > 0) {
            const idsTareas = tareasAsignadas.map(t => t.id_tarea)
            
            const result = await supabase
              .from("presupuestos_base")
              .select(`
                *,
                tareas (id, titulo, code),
                liquidaciones_nuevas!id_presupuesto_base (id)
              `)
              .in('id_tarea', idsTareas)
              .order('created_at', { ascending: false })
              .limit(50)
            
            presupuestosBase = result.data
            presupuestosError = result.error
            
            // Filtrar por defecto: solo "por liquidar"
            if (presupuestosBase) {
              presupuestosBase = presupuestosBase.filter(pb => 
                !pb.liquidaciones_nuevas || pb.liquidaciones_nuevas.length === 0
              )
            }
          } else {
            // Supervisor sin tareas asignadas
            presupuestosBase = []
            presupuestosError = null
          }
        }
        
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
