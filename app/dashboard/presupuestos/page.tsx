"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { BudgetList } from "@/components/budget-list"
import Link from "next/link"
import { Plus, Search, Loader2, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PresupuestosPage() {
  const [todosLosPresupuestos, setTodosLosPresupuestos] = useState<any[]>([]) // 🆕 Todos sin filtrar
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabActual, setTabActual] = useState<string>('borrador') // Por defecto: borrador
  const [searchInput, setSearchInput] = useState<string>('') // 🆕 Búsqueda client-side
  const [administradores, setAdministradores] = useState<any[]>([])
  const [filtroAdmin, setFiltroAdmin] = useState<string>('todos')
  // Recordatorios admin
  const [kpisAdmin, setKpisAdmin] = useState<any | null>(null)
  const [detallePbFinalizadaSinPF, setDetallePbFinalizadaSinPF] = useState<any[]>([])
  const [detallePbSinAprobar, setDetallePbSinAprobar] = useState<any[]>([])
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
            tareas:id_tarea (id, titulo, edificios:id_edificio (id, nombre, id_administrador))
          `
          )

        // Los filtros anteriores para 'cliente' y 'trabajador' se mantienen comentados 
        // ya que ahora solo 'admin' llega a este punto.

        // Cargar administradores para filtro
        const { data: adminsData } = await supabase
          .from("vista_administradores")
          .select("id, nombre, estado")
          .order("nombre", { ascending: true })

        setAdministradores((adminsData || []).filter((a: any) => a.estado === 'activo'))

        // KPIs ADMIN y detalle de PB finalizada sin PF (solo admin)
        try {
          const { data: kpiData } = await supabase
            .from('vista_finanzas_admin')
            .select('*')
            .single()
          setKpisAdmin(kpiData || null)
        } catch {}

        try {
          const { data: pbSinPf } = await supabase
            .from('vista_admin_pb_finalizada_sin_pf')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)
          setDetallePbFinalizadaSinPF(pbSinPf || [])
        } catch {}

        try {
          const { data: pbNoAprob } = await supabase
            .from('vista_admin_pb_sin_aprobar')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)
          setDetallePbSinAprobar(pbNoAprob || [])
        } catch {}

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

    if (filtroAdmin !== 'todos') {
      const adminIdNum = Number(filtroAdmin);
      result = result.filter((p: any) => (p.tareas?.edificios?.id_administrador === adminIdNum));
    }
    
    return result;
  }, [todosLosPresupuestos, searchInput, filtroAdmin])

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
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight min-w-0">Presupuestos</h1>
        {userDetails?.rol === "admin" && (
          <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2">
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

      {/* Panel de recordatorios (solo admin) */}
      {userDetails?.rol === 'admin' && kpisAdmin && (
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center text-amber-800">
              <AlertTriangle className="h-4 w-4 mr-2 text-amber-600" /> Recordatorios de administración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Falta crear PF</div>
                <div className="text-2xl font-bold">{(kpisAdmin.pb_finalizada_sin_pf_count ?? 0) + (kpisAdmin.pb_sin_aprobar_count ?? 0)}</div>
                <div className="mt-2 space-y-1">
                  {[
                    ...detallePbFinalizadaSinPF.map((it: any) => ({ ...it, __ap: 'aprobado' })),
                    ...detallePbSinAprobar.map((it: any) => ({ ...it, __ap: 'sin_aprobar' })),
                  ].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                   .slice(0,10)
                   .map((it: any) => (
                    <div key={`${it.id_presupuesto_base}-${it.__ap}`} className="block">
                      <Link href={`/dashboard/tareas/${it.id_tarea}`} className="text-xs text-primary hover:underline truncate">
                        {it.titulo_tarea || (it.code_tarea || `Tarea #${it.id_tarea}`)}
                      </Link>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {(it.__ap === 'aprobado') ? 'Aprobado' : 'Sin aprobar'}{it.supervisor_label ? ` · Supervisor: ${it.supervisor_label}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <Button asChild size="sm">
                <Link href="/dashboard/presupuestos/nuevo?tipo=final">Crear PF</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        <div>
          <Select value={filtroAdmin} onValueChange={setFiltroAdmin}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Administrador: Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los administradores</SelectItem>
              {administradores.map((a: any) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
        <TabsList className="w-full h-auto min-h-10 grid grid-cols-2 gap-2 sm:flex sm:flex-nowrap sm:h-10">
          <TabsTrigger value="borrador" className="w-full sm:w-auto text-center text-xs sm:text-sm font-semibold whitespace-normal break-words leading-tight px-2 sm:px-3">
            📝 Borrador
            <span className="ml-1.5 rounded-full bg-red-100 dark:bg-red-900 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
              {presupuestosBorrador.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pendientes" className="w-full sm:w-auto text-center text-xs sm:text-sm whitespace-normal break-words leading-tight px-2 sm:px-3">
            ⚡ Pendientes
            <span className="ml-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
              {presupuestosPendientes.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="todos" className="w-full sm:w-auto text-center text-xs sm:text-sm whitespace-normal break-words leading-tight px-2 sm:px-3">
            📋 Todos
            <span className="ml-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
              {presupuestos.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="enviado" className="w-full sm:w-auto text-center text-xs sm:text-sm whitespace-normal break-words leading-tight px-2 sm:px-3">
            📤 Enviado ({presupuestosEnviado.length})
          </TabsTrigger>
          <TabsTrigger value="aceptado" className="w-full sm:w-auto text-center text-xs sm:text-sm whitespace-normal break-words leading-tight px-2 sm:px-3">
            ✅ Aceptado ({presupuestosAceptado.length})
          </TabsTrigger>
          <TabsTrigger value="facturado" className="w-full sm:w-auto text-center text-xs sm:text-sm whitespace-normal break-words leading-tight px-2 sm:px-3">
            💰 Facturado ({presupuestosFacturado.length})
          </TabsTrigger>
          <TabsTrigger value="rechazado" className="w-full sm:w-auto text-center text-xs sm:text-sm whitespace-normal break-words leading-tight px-2 sm:px-3">
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
