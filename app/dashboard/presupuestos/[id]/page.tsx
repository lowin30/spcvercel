"use client"

import { useEffect, useState } from "react"
import { notFound, useParams, useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function PresupuestoPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  
  const [presupuesto, setPresupuesto] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<any>(null)
  
  useEffect(() => {
    async function loadPresupuesto() {
      try {
        setLoading(true)
        const supabase = createBrowserSupabaseClient()
        
        if (!supabase) {
          setError("No se pudo inicializar el cliente de Supabase")
          return
        }
        
        // Verificar sesión
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session) {
          router.push("/login")
          return
        }
        
        // Obtener detalles del usuario
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", sessionData.session.user.id)
          .single()
        
        if (userError) {
          console.error("Error al obtener datos del usuario:", userError)
          setError("Error al obtener datos del usuario")
          return
        }
        
        setUserDetails(userData)
        
        // Intentar primero con presupuestos_finales
        let { data: presupuestoFinal, error: errorFinal } = await supabase
          .from("presupuestos_finales")
          .select(`
            *,
            estados_presupuestos:id_estado (id, nombre, color, codigo),
            tareas:id_tarea (id, titulo, descripcion, edificios:id_edificio (id, nombre))
          `)
          .eq("id", id)
          .single()
        
        if (errorFinal && errorFinal.code !== "PGRST116") { // No es un error de "no encontrado"
          setError(`Error al cargar presupuesto final: ${errorFinal.message}`)
          return
        }
        
        // Si no se encuentra en finales, intentar con presupuestos_base
        if (!presupuestoFinal) {
          const { data: presupuestoBase, error: errorBase } = await supabase
            .from("presupuestos_base")
            .select(`
              *,
              tareas:id_tarea (id, titulo, descripcion, edificios:id_edificio (id, nombre))
            `)
            .eq("id", id)
            .single()
          
          if (errorBase) {
            console.error("Error al cargar presupuesto base:", errorBase)
            setError(`Error al cargar presupuesto: ${errorBase.message}`)
            return
          }
          
          setPresupuesto({ ...presupuestoBase, tipo: "base" })
        } else {
          setPresupuesto({ ...presupuestoFinal, tipo: "final" })
        }
      } catch (err: any) {
        console.error("Error:", err)
        setError(`Error inesperado: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
    
    if (id) {
      loadPresupuesto()
    }
  }, [id, router])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
          <p className="text-lg text-gray-500">Cargando presupuesto...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-red-800">Error</h2>
        <p className="mt-2 text-red-700">{error}</p>
        <Button 
          onClick={() => router.push("/dashboard/presupuestos")} 
          className="mt-4"
          variant="outline"
        >
          Volver a Presupuestos
        </Button>
      </div>
    )
  }
  
  if (!presupuesto) {
    return notFound()
  }
  
  const esFinal = presupuesto.tipo === "final"
  const estaAprobado = presupuesto.estados_presupuestos?.codigo === "aceptado" ||
                      presupuesto.estados_presupuestos?.codigo === "facturado"
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Presupuesto {esFinal ? "Final" : "Base"}
          </h1>
          <p className="text-gray-500">
            Código: {presupuesto.code || "Sin código"}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {esFinal && presupuesto.estados_presupuestos && (
            <Badge 
              style={{
                backgroundColor: presupuesto.estados_presupuestos.color || "#888",
                color: "white"
              }}
            >
              {presupuesto.estados_presupuestos.nombre}
            </Badge>
          )}
          
          {(userDetails?.rol === "admin" || userDetails?.rol === "supervisor") && !estaAprobado && (
            <Button 
              variant="outline"
              onClick={() => router.push(`/dashboard/presupuestos/${id}/editar`)}
            >
              Editar
            </Button>
          )}
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{esFinal ? "Detalles del Presupuesto Final" : "Detalles del Presupuesto Base"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {presupuesto.tareas && (
            <div>
              <h3 className="font-medium mb-1">Tarea asociada</h3>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <p className="font-medium">{presupuesto.tareas.titulo}</p>
                <p className="text-sm text-gray-600">{presupuesto.tareas.descripcion}</p>
                {presupuesto.tareas.edificios && (
                  <p className="text-sm text-gray-500 mt-1">Edificio: {presupuesto.tareas.edificios.nombre}</p>
                )}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Materiales</h3>
              <p className="text-lg font-semibold">{formatCurrency(presupuesto.materiales || 0)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Mano de Obra</h3>
              <p className="text-lg font-semibold">{formatCurrency(presupuesto.mano_obra || 0)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total</h3>
              <p className="text-lg font-semibold">{formatCurrency(presupuesto.total || 0)}</p>
            </div>
          </div>
          
          {presupuesto.id_padre && esFinal && (
            <div className="mt-2">
              <h3 className="font-medium mb-1">Presupuesto Base</h3>
              <Button 
                variant="link" 
                className="p-0" 
                onClick={() => router.push(`/dashboard/presupuestos/${presupuesto.id_padre}`)}
              >
                Ver presupuesto base asociado
              </Button>
            </div>
          )}
          
          {presupuesto.observaciones && (
            <div>
              <h3 className="font-medium mb-1">Observaciones</h3>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm whitespace-pre-wrap">{presupuesto.observaciones}</p>
              </div>
            </div>
          )}
          
          {presupuesto.tipo === "base" && presupuesto.nota_pb && (
            <div>
              <h3 className="font-medium mb-1">Notas Internas</h3>
              <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
                <p className="text-sm">{presupuesto.nota_pb}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-start">
        <Button 
          variant="outline" 
          onClick={() => router.push("/dashboard/presupuestos")}
        >
          Volver a Presupuestos
        </Button>
      </div>
    </div>
  )
}
