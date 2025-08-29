"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { getColorClase } from "@/lib/estados-utils"
import { Loader2 } from "lucide-react"

export default function EstadosPage() {
  // 1. Definición de estados
  const [userDetails, setUserDetails] = useState<any>(null)
  const [estadosTareas, setEstadosTareas] = useState<any[]>([])
  const [estadosPresupuestos, setEstadosPresupuestos] = useState<any[]>([])
  const [estadosFacturas, setEstadosFacturas] = useState<any[]>([])
  const [conteoTareas, setConteoTareas] = useState<any[]>([])
  const [conteoPresupuestos, setConteoPresupuestos] = useState<any[]>([])
  const [conteoFacturas, setConteoFacturas] = useState<any[]>([])
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
        
        // 6. Verificación de permisos
        if (userData?.rol !== "admin") {
          router.push("/dashboard")
          return
        }

        // 7. Consultas principales de datos
        // Obtener estados de tareas
        const tareaResponse = await supabase
          .from("estados_tareas")
          .select("*")
          .order("orden", { ascending: true })
        
        if (tareaResponse.error) {
          console.error("Error al cargar estados de tareas:", tareaResponse.error)
          setError("Error al cargar estados de tareas")
          return
        }
        
        // Obtener estados de presupuestos
        const presupuestosResponse = await supabase
          .from("estados_presupuestos")
          .select("*")
          .order("orden", { ascending: true })
        
        if (presupuestosResponse.error) {
          console.error("Error al cargar estados de presupuestos:", presupuestosResponse.error)
          setError("Error al cargar estados de presupuestos")
          return
        }

        // Obtener estados de facturas
        const facturasResponse = await supabase
          .from("estados_facturas")
          .select("*")
          .order("orden", { ascending: true })
        
        if (facturasResponse.error) {
          console.error("Error al cargar estados de facturas:", facturasResponse.error)
          setError("Error al cargar estados de facturas")
          return
        }

        // Obtener conteo de tareas por estado
        const conteoTareasResponse = await supabase.rpc("contar_tareas_por_estado")
        
        if (conteoTareasResponse.error) {
          console.error("Error al cargar conteo de tareas:", conteoTareasResponse.error)
        }

        // Obtener conteo de presupuestos por estado
        const conteoPresupuestosResponse = await supabase.rpc("contar_presupuestos_por_estado")
        
        if (conteoPresupuestosResponse.error) {
          console.error("Error al cargar conteo de presupuestos:", conteoPresupuestosResponse.error)
        }

        // Obtener conteo de facturas por estado
        const conteoFacturasResponse = await supabase.rpc("contar_facturas_por_estado")
        
        if (conteoFacturasResponse.error) {
          console.error("Error al cargar conteo de facturas:", conteoFacturasResponse.error)
        }

        // 8. Actualizar estados
        setEstadosTareas(tareaResponse.data || [])
        setEstadosPresupuestos(presupuestosResponse.data || [])
        setEstadosFacturas(facturasResponse.data || [])
        setConteoTareas(conteoTareasResponse.data || [])
        setConteoPresupuestos(conteoPresupuestosResponse.data || [])
        setConteoFacturas(conteoFacturasResponse.data || [])
        setLoading(false)
      } catch (err) {
        console.error("Error inesperado:", err)
        setError("Error inesperado al cargar datos")
        setLoading(false)
      }
    }
    
    loadData()
  }, [router])

  // 9. Renderizado condicional para estado de carga
  if (loading) {
    return (
      <div className="container mx-auto py-6 md:py-10 space-y-8">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando estados...</span>
        </div>
      </div>
    )
  }

  // 10. Renderizado condicional para errores
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

  // 11. Renderizado principal
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard de Estados</h1>
        <p className="text-muted-foreground">Visualiza y gestiona los estados del sistema</p>
      </div>

      <Tabs defaultValue="tareas">
        <TabsList>
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
          <TabsTrigger value="presupuestos">Presupuestos</TabsTrigger>
          <TabsTrigger value="facturas">Facturas</TabsTrigger>
        </TabsList>
        <TabsContent value="tareas" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {estadosTareas?.map((estado) => {
              const conteo = conteoTareas?.find((c) => c.id_estado === estado.id)?.conteo || 0
              return (
                <Card key={estado.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{estado.nombre}</CardTitle>
                      <Badge className={`${getColorClase(estado.color)} text-white`}>{conteo}</Badge>
                    </div>
                    <CardDescription>{estado.descripcion || "Sin descripción"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p>Código: {estado.codigo}</p>
                      <p>Orden: {estado.orden}</p>
                    </div>
                    {conteo > 0 && (
                      <div className="mt-2">
                        <Link
                          href={`/dashboard/tareas?estado=${estado.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          Ver tareas en este estado
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
        <TabsContent value="presupuestos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {estadosPresupuestos?.map((estado) => {
              const conteo = conteoPresupuestos?.find((c) => c.id_estado === estado.id)?.conteo || 0
              return (
                <Card key={estado.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{estado.nombre}</CardTitle>
                      <Badge className={`${getColorClase(estado.color)} text-white`}>{conteo}</Badge>
                    </div>
                    <CardDescription>{estado.descripcion || "Sin descripción"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p>Código: {estado.codigo}</p>
                      <p>Orden: {estado.orden}</p>
                    </div>
                    {conteo > 0 && (
                      <div className="mt-2">
                        <Link
                          href={`/dashboard/presupuestos?estado=${estado.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          Ver presupuestos en este estado
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
        <TabsContent value="facturas" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {estadosFacturas?.map((estado) => {
              const conteo = conteoFacturas?.find((c) => c.id_estado === estado.id)?.conteo || 0
              return (
                <Card key={estado.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{estado.nombre}</CardTitle>
                      <Badge className={`${getColorClase(estado.color)} text-white`}>{conteo}</Badge>
                    </div>
                    <CardDescription>{estado.descripcion || "Sin descripción"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p>Código: {estado.codigo}</p>
                      <p>Orden: {estado.orden}</p>
                    </div>
                    {conteo > 0 && (
                      <div className="mt-2">
                        <Link
                          href={`/dashboard/facturas?estado=${estado.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          Ver facturas en este estado
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
