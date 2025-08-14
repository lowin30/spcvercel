"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { BudgetList } from "@/components/budget-list"
import Link from "next/link"
import { Plus, Search, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PresupuestosPage() {
  const [presupuestos, setPresupuestos] = useState<any[]>([])
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useSearchParams()
  const searchQuery = params.get('q') || ''

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
          console.error("Error al obtener datos del usuario:", userError)
          setError(
            `Error al obtener datos del usuario: ${userError?.message || "No se encontraron datos."}`
          )
          setLoading(false)
          return
        }

        const userRole = userData.rol
        setUserDetails(userData) // Establecer userDetails con los datos del usuario

        // Lógica para que solo los administradores vean presupuestos finales
        if (userRole !== "admin") {
          setPresupuestos([]) // Asumiendo que 'setPresupuestos' es el setter del estado combinado
          setLoading(false)
          console.log("Acceso denegado: Solo los administradores pueden ver presupuestos finales.")
          return
        }
        
        // Garantizar que userDetails está establecido correctamente
        console.log("Usuario autenticado como admin:", userData)

        // Consultar solo presupuestos_finales para admin
        let queryFinal = supabase
          .from("presupuestos_finales")
          .select(
            `
            *,
            estados_presupuestos:id_estado (id, nombre, color, codigo),
            tareas:id_tarea (id, titulo, edificios:id_edificio (id, nombre))
          `
          )

        // Los filtros anteriores para 'cliente' y 'trabajador' se mantienen comentados 
        // ya que ahora solo 'admin' llega a este punto.

        const { data: presupuestosFinalesData, error: errorFinal } = await queryFinal

        if (errorFinal) {
          console.error("Error al cargar presupuestos finales:", errorFinal)
          setError(
            `Error al cargar presupuestos finales: ${errorFinal.message}`
          )
          setLoading(false)
          return
        }

        const presupuestosFinales = (presupuestosFinalesData || []).map((p: any) => ({ ...p, tipo: 'final' }))

        // Ahora 'todosLosPresupuestos' solo contendrá presupuestos finales si el rol es admin
        // o estará vacío si el rol no es admin (debido al return anterior)
        let todosLosPresupuestos = [...presupuestosFinales]

        // Apply search filter locally
        let filteredData = todosLosPresupuestos;
        if (searchQuery) {
          filteredData = todosLosPresupuestos.filter((p: any) =>
            p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        // Sort data by creation date
        filteredData.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setPresupuestos(filteredData);
      } catch (error: any) {
        console.error("Error al obtener presupuestos:", error);
        setError(`No se pudieron cargar los presupuestos: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }

    cargarPresupuestos()
  }, [router, searchQuery])

  // Filtrar presupuestos
  const filterByEstado = (codigo: string) => presupuestos?.filter(p => p.estados_presupuestos?.codigo === codigo) || [];

  const presupuestosBorrador = filterByEstado('borrador');
  const presupuestosEnviado = filterByEstado('enviado');
  const presupuestosAceptado = filterByEstado('aceptado');
  const presupuestosFacturado = filterByEstado('facturado');
  const presupuestosRechazado = filterByEstado('rechazado');

  // Estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
          <p className="text-lg text-gray-500">Cargando presupuestos...</p>
        </div>
      </div>
    )
  }
  
  // Estado de error
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-red-800">Error</h2>
        <p className="mt-2 text-red-700">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Presupuestos</h1>
        {userDetails?.rol === "admin" && (
          <div className="flex gap-2">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/dashboard/presupuestos/nuevo?tipo=final">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Presupuesto (Sin tarea)
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/dashboard/tareas?crear_presupuesto=true">
                <Plus className="mr-2 h-4 w-4" /> Seleccionar Tarea
              </Link>
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de Presupuestos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-medium">Borrador</h3>
              <p className="text-2xl font-bold">{presupuestosBorrador.length}</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
              <h3 className="font-medium">Enviado</h3>
              <p className="text-2xl font-bold">{presupuestosEnviado.length}</p>
            </div>
            <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg">
              <h3 className="font-medium">Aceptado</h3>
              <p className="text-2xl font-bold">{presupuestosAceptado.length}</p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900 p-4 rounded-lg">
              <h3 className="font-medium">Facturado</h3>
              <p className="text-2xl font-bold">{presupuestosFacturado.length}</p>
            </div>
            <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg">
              <h3 className="font-medium">Rechazado</h3>
              <p className="text-2xl font-bold">{presupuestosRechazado.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar presupuestos..."
            className="pl-8 w-full"
            defaultValue={searchQuery || ""}
          />
        </div>
      </div>

      <Tabs defaultValue="todos" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 overflow-x-auto">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="borrador">Borrador</TabsTrigger>
          <TabsTrigger value="enviado">Enviado</TabsTrigger>
          <TabsTrigger value="aceptado">Aceptado</TabsTrigger>
          <TabsTrigger value="facturado">Facturado</TabsTrigger>
          <TabsTrigger value="rechazado">Rechazado</TabsTrigger>
        </TabsList>
        <TabsContent value="todos">
          <BudgetList budgets={presupuestos} userRole={userDetails?.rol} />
        </TabsContent>
        <TabsContent value="borrador">
          <BudgetList budgets={presupuestosBorrador} userRole={userDetails?.rol} />
        </TabsContent>
        <TabsContent value="enviado">
          <BudgetList budgets={presupuestosEnviado} userRole={userDetails?.rol} />
        </TabsContent>
        <TabsContent value="aceptado">
          <BudgetList budgets={presupuestosAceptado} userRole={userDetails?.rol} />
        </TabsContent>
        <TabsContent value="facturado">
          <BudgetList budgets={presupuestosFacturado} userRole={userDetails?.rol} />
        </TabsContent>
        <TabsContent value="rechazado">
          <BudgetList budgets={presupuestosRechazado} userRole={userDetails?.rol} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
