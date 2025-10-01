"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { InvoiceList } from "@/components/invoice-list"
import Link from "next/link"
import { Plus, Search, Loader2, Filter } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Estructura de una factura, tal como la necesita el componente InvoiceList
// Estructura de una factura, simplificada temporalmente
interface Invoice {
  id: number;
  created_at: string;
  code: string;
  total: number;
  pagada: boolean;
  enviada?: boolean;
  fecha_envio?: string | null;
  estado: string; // Usado como fallback en el badge
  id_estado_nuevo: number | null;
  pdf_url: string | null;
  datos_afip: string | null;
  id_presupuesto_final: number | null;
  id_administrador: number | null;
  presupuestos_finales?: {
    id: number;
    tareas?: {
      id: number;
      titulo: string;
      edificios?: {
        id: number;
        nombre: string;
      }
    }
  };
}

export default function FacturasPage({
  searchParams = {},
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const [facturas, setFacturas] = useState<Invoice[]>([])
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [administradores, setAdministradores] = useState<{id: number, nombre: string}[]>([])
  const [estados, setEstados] = useState<{id: number, nombre: string, color: string}[]>([])
  const [filtroAdmin, setFiltroAdmin] = useState<number | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [vistaActual, setVistaActual] = useState<'todas' | 'pendientes' | 'pagadas' | 'vencidas'>('pendientes') // Por defecto: pendientes
  const router = useRouter()
  const params = useSearchParams()
  
  // Inicializar el valor de búsqueda desde la URL al cargar la página
  useEffect(() => {
    setSearchQuery(params.get("q") || "")
  }, [params])

  // Calcular estadísticas basadas en facturas
  const totalFacturas = facturas?.length || 0
  const totalPagadas = facturas?.filter((f: Invoice) => f.pagada).length || 0
  const totalPendientes = facturas?.filter((f: Invoice) => !f.pagada).length || 0
  const totalVencidas = facturas?.filter((f: Invoice) => f.id_estado_nuevo === 4).length || 0
  const montoTotal = facturas?.reduce((sum: number, f: Invoice) => sum + (f.total || 0), 0) || 0

  useEffect(() => {
    async function cargarDatos() {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        if (!supabase) throw new Error("No se pudo inicializar el cliente de Supabase")

        const { data: { session }, } = await supabase.auth.getSession()
        if (!session) {
          router.push("/login")
          return
        }

        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("rol")
          .eq("id", session.user.id)
          .single()

        if (userError || !userData) {
          console.error("Error al obtener datos del usuario:", userError)
          router.push("/dashboard")
          return
        }
        
        // Restricción estricta: solo admins pueden ver esta página
        if (userData.rol !== "admin") {
          console.log("Acceso denegado: rol requerido 'admin', rol actual:", userData.rol)
          router.push("/dashboard")
          return
        }

        // Cargar administradores de la tabla administradores (no confundir con usuarios con rol admin)
        const { data: administradoresData, error: administradoresError } = await supabase
          .from("administradores")
          .select("id, nombre");
        
        if (administradoresError) {
          console.error("Error al cargar administradores:", administradoresError);
        }
        
        // Cargar estados de facturas para los filtros (nombre correcto de la tabla)
        const { data: estadosData } = await supabase
          .from("estados_facturas")
          .select("*")
          .order("id");

        // Consulta usando la vista completa de facturas
        const { data: facturasData, error: facturasError } = await supabase
          .from("vista_facturas_completa")
          .select('*')
          .order("created_at", { ascending: false });
          
        // Log para depuración
        console.log('Consulta a vista_facturas_completa completada');
        if (facturasError) console.error('Error en la consulta:', facturasError);
        
        // La vista ya incluye el campo pagada y todas las relaciones en campos planos
        const facturas = facturasData || [];
        
        // Debug: Mostrar la primera factura con los campos reales de la vista
        if (facturas.length > 0) {
          console.log('Primera factura de vista_facturas_completa:', {
            id: facturas[0].id,
            code: facturas[0].code,
            total: facturas[0].total,
            saldo_pendiente: facturas[0].saldo_pendiente,
            nombre_edificio: facturas[0].nombre_edificio,
            direccion_edificio: facturas[0].direccion_edificio,
            cuit_edificio: facturas[0].cuit_edificio,
            datos_afip: facturas[0].datos_afip,
            estado_nombre: facturas[0].estado_nombre,
            pagada: facturas[0].pagada
          });
        }
        
        console.log('Facturas cargadas:', facturas.length);
        console.log('Administradores cargados:', administradoresData?.length || 0);
        console.log('Estados cargados:', estadosData?.length || 0);

        if (facturasError) {
          throw new Error(`Error al cargar facturas: ${facturasError.message}`)
        }
        
        // Guardar los administradores y estados para los filtros
        setAdministradores(administradoresData || []);
        setEstados(estadosData || []);

        // Usar directamente las facturas de la vista (ya tienen todos los campos necesarios)
        setFacturas(facturas as Invoice[])
      } catch (err: any) {
        setError(err.message || "Ocurrió un error inesperado")
      } finally {
        setLoading(false)
      }
    }

    cargarDatos()
  }, [router])

  // Buscar nombres de administradores y estados para mostrar
  const getNombreAdministrador = (id: number | null) => {
    if (!id) return "Sin administrador";
    const admin = administradores.find(a => a.id === id);
    return admin?.nombre || `Administrador #${id}`;
  };

  const getNombreEstado = (id: number | null) => {
    if (!id) return "Sin estado";
    const estado = estados.find(e => e.id === id);
    return estado?.nombre || `Estado #${id}`;
  };

  // Filtrar facturas según la vista actual (tabs), búsqueda, administrador y estado
  const filteredFacturas = facturas.filter((invoice) => {
    // Filtro por vista actual (tabs)
    if (vistaActual === 'pendientes' && invoice.pagada) {
      return false; // Ocultar pagadas en vista pendientes
    }
    if (vistaActual === 'pagadas' && !invoice.pagada) {
      return false; // Solo mostrar pagadas en vista pagadas
    }
    if (vistaActual === 'vencidas' && invoice.id_estado_nuevo !== 4) {
      return false; // Solo mostrar vencidas (estado 4) en vista vencidas
    }
    // vistaActual === 'todas' no filtra nada
    
    // Filtro inteligente: En vista "pendientes" con filtro de estado en "todos",
    // excluir automáticamente el estado "Pagado" (id 5)
    if (vistaActual === 'pendientes' && !filtroEstado && invoice.id_estado_nuevo === 5) {
      return false; // Ocultar facturas con estado "Pagado" cuando no hay filtro específico
    }
    
    // Filtro por texto de búsqueda
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const tituloTarea = invoice.presupuestos_finales?.tareas?.titulo || '';
      
      if (!(
        invoice.code?.toLowerCase().includes(searchLower) ||
        invoice.datos_afip?.toLowerCase().includes(searchLower) ||
        tituloTarea.toLowerCase().includes(searchLower) ||
        getNombreAdministrador(invoice.id_administrador).toLowerCase().includes(searchLower) ||
        getNombreEstado(invoice.id_estado_nuevo).toLowerCase().includes(searchLower)
      )) {
        return false;
      }
    }
    
    // Filtro por administrador
    if (filtroAdmin && invoice.id_administrador !== filtroAdmin) {
      return false;
    }
    
    // Filtro por estado
    if (filtroEstado && invoice.id_estado_nuevo !== filtroEstado) {
      return false;
    }
    
    return true;
  })

  // Estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-gray-500" />
          <p className="text-lg text-gray-500">Cargando facturas...</p>
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
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Facturas</h1>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/dashboard/facturas/nueva">
            <Plus className="mr-2 h-4 w-4" /> Nueva Factura
          </Link>
        </Button>
      </div>

      {/* Tabs de navegación rápida */}
      <Tabs value={vistaActual} onValueChange={(value) => setVistaActual(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="todas" className="text-xs sm:text-sm">
            📋 Todas
            <span className="ml-1.5 rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
              {totalFacturas}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pendientes" className="text-xs sm:text-sm">
            ⏳ Pendientes
            <span className="ml-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
              {totalPendientes}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pagadas" className="text-xs sm:text-sm">
            ✅ Pagadas
            <span className="ml-1.5 rounded-full bg-green-100 dark:bg-green-900 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300">
              {totalPagadas}
            </span>
          </TabsTrigger>
          <TabsTrigger value="vencidas" className="text-xs sm:text-sm">
            ⚠️ Vencidas
            <span className="ml-1.5 rounded-full bg-red-100 dark:bg-red-900 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
              {totalVencidas}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de Facturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
              <h3 className="font-medium">Total</h3>
              <p className="text-2xl font-bold">{totalFacturas}</p>
            </div>
            <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg">
              <h3 className="font-medium">Pagadas</h3>
              <p className="text-2xl font-bold">{totalPagadas}</p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-lg">
              <h3 className="font-medium">Pendientes</h3>
              <p className="text-2xl font-bold">{totalPendientes}</p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900 p-4 rounded-lg">
              <h3 className="font-medium">Monto Total</h3>
              <p className="text-2xl font-bold">${montoTotal.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-4 w-4 mr-2" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Filtro por búsqueda */}
            <div>
              <label className="text-sm font-medium mb-1 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Factura, datos AFIP, tarea..." 
                  className="pl-8 w-full" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Filtro por administrador */}
            <div>
              <label className="text-sm font-medium mb-1 block">Administrador</label>
              <Select value={filtroAdmin?.toString() || 'todos'} onValueChange={(value) => setFiltroAdmin(value !== 'todos' ? parseInt(value) : null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los administradores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los administradores</SelectItem>
                  {administradores.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id.toString()}>
                      {admin.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por estado */}
            <div>
              <label className="text-sm font-medium mb-1 block">Estado</label>
              <Select value={filtroEstado?.toString() || 'todos'} onValueChange={(value) => setFiltroEstado(value !== 'todos' ? parseInt(value) : null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  {estados.map((estado) => (
                    <SelectItem key={estado.id} value={estado.id.toString()}>
                      {estado.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <InvoiceList invoices={filteredFacturas as any} estados={estados} />
    </div>
  )
}
