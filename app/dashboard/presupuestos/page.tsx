"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { BudgetList } from "@/components/budget-list"
import Link from "next/link"
import { Plus, Search, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PresupuestosPage() {
  const [todosLosPresupuestos, setTodosLosPresupuestos] = useState<any[]>([]) // 🆕 Todos sin filtrar
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabActual, setTabActual] = useState<string>('borrador') // Por defecto: borrador
  const [searchInput, setSearchInput] = useState<string>('') // 🆕 Búsqueda client-side
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
          setTodosLosPresupuestos([])
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

        // 🆕 GUARDAR TODOS SIN FILTRAR
        // Ordenar por fecha de creación
        const sorted = [...presupuestosFinales].sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setTodosLosPresupuestos(sorted);
      } catch (error: any) {
        console.error("Error al obtener presupuestos:", error);
        setError(`No se pudieron cargar los presupuestos: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }

    cargarPresupuestos()
  }, [])

  // BÚSQUEDA Y FILTRADO CLIENT-SIDE (sobre todosLosPresupuestos)
  const presupuestos = useMemo(() => {
    let result = todosLosPresupuestos;
    
    // Aplicar búsqueda
    if (searchInput.trim()) {
      const searchLower = searchInput.toLowerCase();
      result = result.filter((p: any) => {
        const edificioNombre = p.tareas?.edificios?.nombre || '';
        const tareaTitulo = p.tareas?.titulo || '';
        const estadoNombre = p.estados_presupuestos?.nombre || '';
        
        return (
          (p.code && p.code.toLowerCase().includes(searchLower)) ||
          edificioNombre.toLowerCase().includes(searchLower) ||
          tareaTitulo.toLowerCase().includes(searchLower) ||
          estadoNombre.toLowerCase().includes(searchLower)
        );
      });
    }
    
    return result;
  }, [todosLosPresupuestos, searchInput])

  // Filtrar presupuestos
  const filterByEstado = (codigo: string) => presupuestos?.filter(p => p.estados_presupuestos?.codigo === codigo) || [];

  const presupuestosBorrador = filterByEstado('borrador');
  const presupuestosEnviado = filterByEstado('enviado');
  const presupuestosAceptado = filterByEstado('aceptado');
  const presupuestosFacturado = filterByEstado('facturado');
  const presupuestosRechazado = filterByEstado('rechazado');
  
  // Presupuestos pendientes con ordenamiento prioritario: Borrador > Aceptado > Enviado
  const presupuestosPendientes = presupuestos
    .filter(p => {
      const codigo = p.estados_presupuestos?.codigo
      return codigo === 'borrador' || codigo === 'enviado' || codigo === 'aceptado'
    })
    .sort((a, b) => {
      // Orden de prioridad: Borrador (1) > Aceptado (2) > Enviado (3)
      const prioridad: Record<string, number> = { 'borrador': 1, 'aceptado': 2, 'enviado': 3 }
      const prioA = prioridad[a.estados_presupuestos?.codigo || ''] || 999
      const prioB = prioridad[b.estados_presupuestos?.codigo || ''] || 999
      return prioA - prioB
    })

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
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              asChild 
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              title="Crea presupuesto directamente. El sistema genera el presupuesto base automáticamente."
            >
              <Link href="/dashboard/presupuestos/nuevo?tipo=final" className="flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                <div className="flex flex-col items-start text-left">
                  <span className="font-semibold text-sm">⚡ Presupuesto Rápido</span>
                  <span className="text-xs opacity-90 font-normal">Sin presupuesto base previo</span>
                </div>
              </Link>
            </Button>
            
            <Button 
              asChild 
              variant="outline" 
              size="lg"
              className="w-full sm:w-auto"
              title="Flujo tradicional: selecciona una tarea con presupuesto base aprobado"
            >
              <Link href="/dashboard/tareas?crear_presupuesto=true" className="flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                <div className="flex flex-col items-start text-left">
                  <span className="font-semibold text-sm">📋 Desde Tarea</span>
                  <span className="text-xs opacity-70 font-normal">Con presupuesto base</span>
                </div>
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
            {/* Card Borrador - DESTACADA con badge rojo pulsante */}
            <div 
              onClick={() => setTabActual('borrador')} 
              className={`
                cursor-pointer p-4 rounded-lg transition-all relative
                ${
                  tabActual === 'borrador' 
                    ? 'ring-4 ring-blue-500 shadow-2xl scale-105' 
                    : 'hover:scale-105 hover:shadow-lg'
                }
                bg-gradient-to-br from-blue-100 to-blue-200 
                dark:from-blue-900 dark:to-blue-800
              `}
            >
              {presupuestosBorrador.length > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold animate-pulse text-sm">
                  {presupuestosBorrador.length}
                </div>
              )}
              <h3 className="font-medium text-lg">📝 Borrador</h3>
              <p className="text-3xl font-bold">{presupuestosBorrador.length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                Acción inmediata
              </p>
            </div>
            
            {/* Card Enviado */}
            <div 
              onClick={() => setTabActual('enviado')} 
              className={`
                cursor-pointer p-4 rounded-lg transition-all
                ${
                  tabActual === 'enviado' 
                    ? 'ring-2 ring-blue-500 shadow-lg' 
                    : 'hover:scale-105'
                }
                bg-blue-100 dark:bg-blue-900
              `}
            >
              <h3 className="font-medium">📤 Enviado</h3>
              <p className="text-2xl font-bold">{presupuestosEnviado.length}</p>
            </div>
            
            {/* Card Aceptado */}
            <div 
              onClick={() => setTabActual('aceptado')} 
              className={`
                cursor-pointer p-4 rounded-lg transition-all
                ${
                  tabActual === 'aceptado' 
                    ? 'ring-2 ring-green-500 shadow-lg' 
                    : 'hover:scale-105'
                }
                bg-green-100 dark:bg-green-900
              `}
            >
              <h3 className="font-medium">✅ Aceptado</h3>
              <p className="text-2xl font-bold">{presupuestosAceptado.length}</p>
            </div>
            
            {/* Card Facturado */}
            <div 
              onClick={() => setTabActual('facturado')} 
              className={`
                cursor-pointer p-4 rounded-lg transition-all
                ${
                  tabActual === 'facturado' 
                    ? 'ring-2 ring-purple-500 shadow-lg' 
                    : 'hover:scale-105'
                }
                bg-purple-100 dark:bg-purple-900
              `}
            >
              <h3 className="font-medium">💰 Facturado</h3>
              <p className="text-2xl font-bold">{presupuestosFacturado.length}</p>
            </div>
            
            {/* Card Rechazado */}
            <div 
              onClick={() => setTabActual('rechazado')} 
              className={`
                cursor-pointer p-4 rounded-lg transition-all
                ${
                  tabActual === 'rechazado' 
                    ? 'ring-2 ring-red-500 shadow-lg' 
                    : 'hover:scale-105'
                }
                bg-red-100 dark:bg-red-900
              `}
            >
              <h3 className="font-medium">❌ Rechazado</h3>
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
            placeholder="Buscar por código, edificio, tarea, estado..."
            className="pl-8 w-full"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            title="Busca en: código, nombre del edificio, título de tarea, estado del presupuesto"
          />
        </div>
      </div>

      <Tabs value={tabActual} onValueChange={setTabActual} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-7 overflow-x-auto">
          <TabsTrigger value="borrador" className="text-xs sm:text-sm font-semibold">
            📝 Borrador
            <span className="ml-1.5 rounded-full bg-red-100 dark:bg-red-900 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
              {presupuestosBorrador.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pendientes" className="text-xs sm:text-sm">
            ⚡ Pendientes
            <span className="ml-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
              {presupuestosPendientes.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="todos" className="text-xs sm:text-sm">
            📋 Todos
            <span className="ml-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
              {presupuestos.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="enviado" className="text-xs sm:text-sm">
            📤 Enviado ({presupuestosEnviado.length})
          </TabsTrigger>
          <TabsTrigger value="aceptado" className="text-xs sm:text-sm">
            ✅ Aceptado ({presupuestosAceptado.length})
          </TabsTrigger>
          <TabsTrigger value="facturado" className="text-xs sm:text-sm">
            💰 Facturado ({presupuestosFacturado.length})
          </TabsTrigger>
          <TabsTrigger value="rechazado" className="text-xs sm:text-sm">
            ❌ Rechazado ({presupuestosRechazado.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="borrador">
          <BudgetList budgets={presupuestosBorrador} userRole={userDetails?.rol} />
        </TabsContent>
        <TabsContent value="pendientes">
          <BudgetList budgets={presupuestosPendientes} userRole={userDetails?.rol} />
        </TabsContent>
        <TabsContent value="todos">
          <BudgetList budgets={presupuestos} userRole={userDetails?.rol} />
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
