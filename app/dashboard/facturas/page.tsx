"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { InvoiceList } from "@/components/invoice-list"
import { ExportFacturasButton } from "@/components/export-facturas-button"
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
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const params = useSearchParams()
  
  // Inicializar el valor de búsqueda desde la URL al cargar la página
  useEffect(() => {
    setSearchQuery(params.get("q") || "")
  }, [params])

  // Cargar filtros guardados desde localStorage al montar
  useEffect(() => {
    setIsMounted(true);
    const savedFilters = localStorage.getItem('spc_filters_facturas');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        setFiltroAdmin(filters.filtroAdmin || null);
        setFiltroEstado(filters.filtroEstado || null);
        setSearchQuery(filters.searchQuery || "");
        setVistaActual(filters.vistaActual || 'pendientes');
      } catch (e) {
        // Si hay error al parsear, ignorar
      }
    }
  }, [])
  
  // Guardar filtros en localStorage cuando cambien
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('spc_filters_facturas', JSON.stringify({
        filtroAdmin,
        filtroEstado,
        searchQuery,
        vistaActual
      }));
    }
  }, [filtroAdmin, filtroEstado, searchQuery, vistaActual, isMounted])

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
          .select("id, nombre")
          .eq('estado', 'activo');
        
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

        // Enriquecer con gastos adicionales (gastos_extra_pdf_factura)
        let facturasConExtras = facturas as any[]
        try {
          const ids = facturas.map((f: any) => f.id)
          if (ids.length > 0) {
            const { data: extrasRows, error: extrasError } = await supabase
              .from('gastos_extra_pdf_factura')
              .select('id_factura, monto, imagen_procesada_url, comprobante_url')
              .in('id_factura', ids)
            if (!extrasError && Array.isArray(extrasRows)) {
              const sumMap = new Map<number, number>() // todos los extras
              const sumMapConComprobante = new Map<number, number>() // extras con imagen/comprobante (como PDF)
              for (const row of extrasRows as any[]) {
                const fid = Number(row.id_factura)
                const m = Number(row.monto || 0)
                sumMap.set(fid, (sumMap.get(fid) || 0) + m)
                const hasImg = !!row.imagen_procesada_url || !!row.comprobante_url
                if (hasImg) {
                  sumMapConComprobante.set(fid, (sumMapConComprobante.get(fid) || 0) + m)
                }
              }
              facturasConExtras = facturas.map((f: any) => {
                const extrasTotal = sumMap.get(f.id) || 0
                const extrasTotalPdf = sumMapConComprobante.get(f.id) || 0
                return {
                  ...f,
                  extras_total: extrasTotal,
                  extras_total_pdf: extrasTotalPdf,
                  total_incl_extras: Number(f.total || 0) + extrasTotal,
                  tiene_extras: extrasTotal > 0,
                }
              })
            }
          }
        } catch {}

        // Enriquecer con gastos reales de la tarea, igual que el PDF:
        // sumar montos de gastos_tarea con imagen (imagen_procesada_url o comprobante_url)
        try {
          // IDs de facturas en memoria
          const factIds = (facturasConExtras as any[]).map((f: any) => Number(f.id))

          // 1) Obtener id_presupuesto_final directo desde tabla facturas (robusto)
          const { data: factPfRows } = await supabase
            .from('facturas')
            .select('id, id_presupuesto_final')
            .in('id', factIds)

          const factToPf = new Map<number, number>()
          if (Array.isArray(factPfRows)) {
            for (const r of factPfRows as any[]) {
              const fid = Number(r.id)
              const pfid = Number(r.id_presupuesto_final || 0)
              if (fid > 0 && pfid > 0) factToPf.set(fid, pfid)
            }
          }

          // 2) Reunir todos los pfIds de vista y de tabla facturas
          const pfIdSet = new Set<number>()
          for (const f of facturasConExtras as any[]) {
            const pfVista = Number((f as any).id_presupuesto_final || 0)
            if (pfVista > 0) pfIdSet.add(pfVista)
          }
          for (const [_fid, pfid] of factToPf) pfIdSet.add(pfid)
          const pfIds = Array.from(pfIdSet)

          // 3) Mapear pf -> tarea
          const pfToTarea = new Map<number, number>()
          if (pfIds.length > 0) {
            const { data: pfRows } = await supabase
              .from('presupuestos_finales')
              .select('id, id_tarea')
              .in('id', pfIds)
            if (Array.isArray(pfRows)) {
              for (const r of pfRows as any[]) {
                if (r?.id && r?.id_tarea) pfToTarea.set(Number(r.id), Number(r.id_tarea))
              }
            }
          }

          // 4) Mapear factura -> tarea usando prioridad: vista.tarea_id > pfVista > facturas.id_presupuesto_final
          const facturaToTarea = new Map<number, number>()
          for (const f of facturasConExtras as any[]) {
            const fid = Number(f.id)
            const tidVista = Number((f as any).tarea_id || 0)
            const pfVista = Number((f as any).id_presupuesto_final || 0)
            const pfFromTable = factToPf.get(fid) || 0
            const tid = tidVista > 0
              ? tidVista
              : (pfVista > 0 && pfToTarea.get(pfVista)) || (pfFromTable > 0 && pfToTarea.get(pfFromTable)) || 0
            if (tid > 0) facturaToTarea.set(fid, Number(tid))
          }

          const tareaIds = Array.from(new Set(facturaToTarea.values()))
          const realesMap = new Map<number, number>()

          if (tareaIds.length > 0) {
            const { data: gastosRows } = await supabase
              .from('gastos_tarea')
              .select('id_tarea, monto, imagen_procesada_url, comprobante_url')
              .in('id_tarea', tareaIds)
              .or('imagen_procesada_url.not.is.null,comprobante_url.not.is.null')

            if (Array.isArray(gastosRows)) {
              for (const row of gastosRows as any[]) {
                const tid = Number(row.id_tarea)
                const hasImg = !!row.imagen_procesada_url || !!row.comprobante_url
                if (!hasImg) continue
                const m = Number(row.monto || 0)
                realesMap.set(tid, (realesMap.get(tid) || 0) + m)
              }
            }
          }

          facturasConExtras = (facturasConExtras as any[]).map((f: any) => {
            const tid = facturaToTarea.get(Number(f.id)) || 0
            const reales = tid > 0 ? (realesMap.get(tid) || 0) : 0
            // Para coincidir con el PDF, usamos solo extras con comprobante si existen; si no hay, caemos a 0
            const extras = Number(f.extras_total_pdf || 0)
            return {
              ...f,
              gastos_reales_total: reales,
              gastos_sum_incl_extras: reales + extras,
            }
          })
        } catch {}
        setFacturas(facturasConExtras as Invoice[])
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
    
    // 🔍 BÚSQUEDA AVANZADA EN TODOS LOS CAMPOS RELEVANTES
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      
      // Acceder directamente a los campos planos de la vista (no anidados)
      const factura = invoice as any; // Casting para acceder a campos de la vista
      
      const matchesSearch = 
        // 📄 Datos de la factura
        factura.code?.toLowerCase().includes(searchLower) ||
        factura.nombre?.toLowerCase().includes(searchLower) ||
        factura.datos_afip?.toString().toLowerCase().includes(searchLower) ||
        
        // 🏢 Datos del edificio (cliente)
        factura.nombre_edificio?.toLowerCase().includes(searchLower) ||
        factura.direccion_edificio?.toLowerCase().includes(searchLower) ||
        factura.cuit_edificio?.toLowerCase().includes(searchLower) ||
        
        // 📝 Datos de la tarea
        factura.titulo_tarea?.toLowerCase().includes(searchLower) ||
        factura.code_tarea?.toLowerCase().includes(searchLower) ||
        factura.descripcion_tarea?.toLowerCase().includes(searchLower) ||
        
        // 🔧 Datos del presupuesto
        factura.presupuesto_final_code?.toLowerCase().includes(searchLower) ||
        
        // 👤 Administrador y estado
        getNombreAdministrador(invoice.id_administrador).toLowerCase().includes(searchLower) ||
        getNombreEstado(invoice.id_estado_nuevo).toLowerCase().includes(searchLower);
      
      if (!matchesSearch) {
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

  // Calcular saldo total pendiente de facturas filtradas
  const saldoTotalPendiente = filteredFacturas
    .filter(f => !f.pagada)
    .reduce((sum, f) => sum + ((f as any).saldo_pendiente || 0), 0)

  // Adaptar datos para ExportFacturasButton (tipado estricto)
  const facturasExport = filteredFacturas.map((f: any) => ({
    id: f.id,
    code: f.code,
    nombre: f.nombre ?? null,
    datos_afip: f.datos_afip ?? null,
    estado_nombre: f.estado_nombre ?? (f.id_estado_nuevo ? (estados.find(e => e.id === f.id_estado_nuevo)?.nombre || '') : ''),
    total: Number(f.total || 0),
    saldo_pendiente: f.saldo_pendiente ?? 0,
    total_ajustes_todos: f.total_ajustes_todos ?? 0,
  }))

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
        <div className="flex gap-2">
          {/* Botón Exportar PDF */}
          <ExportFacturasButton 
            facturas={facturasExport}
            nombreAdministrador={administradores.find(a => a.id === filtroAdmin)?.nombre}
          />
          
          {/* Botón Nueva Factura */}
          <Button asChild>
            <Link href="/dashboard/facturas/nueva">
              <Plus className="mr-2 h-4 w-4" /> Nueva Factura
            </Link>
          </Button>
        </div>
      </div>

      {/* Estadísticas de facturas filtradas */}
      <Card className="bg-muted/50 border-primary/20">
        <CardContent className="py-3">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-xl sm:text-2xl font-bold text-primary">{filteredFacturas.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Facturas totales</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-destructive">
                ${saldoTotalPendiente.toLocaleString('es-AR')}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Saldo pendiente</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de navegación rápida */}
      <Tabs value={vistaActual} onValueChange={(value) => setVistaActual(value as any)}>
        <TabsList className="w-full h-auto min-h-10 grid grid-cols-2 gap-2 sm:flex sm:flex-nowrap sm:h-10">
          <TabsTrigger value="todas" className="w-full sm:w-auto text-center text-xs sm:text-sm whitespace-normal break-words leading-tight px-2 sm:px-3">
            📋 Todas
            <span className="ml-1.5 rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
              {totalFacturas}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pendientes" className="w-full sm:w-auto text-center text-xs sm:text-sm whitespace-normal break-words leading-tight px-2 sm:px-3">
            ⏳ Pendientes
            <span className="ml-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
              {totalPendientes}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pagadas" className="w-full sm:w-auto text-center text-xs sm:text-sm whitespace-normal break-words leading-tight px-2 sm:px-3">
            ✅ Pagadas
            <span className="ml-1.5 rounded-full bg-green-100 dark:bg-green-900 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300">
              {totalPagadas}
            </span>
          </TabsTrigger>
          <TabsTrigger value="vencidas" className="w-full sm:w-auto text-center text-xs sm:text-sm whitespace-normal break-words leading-tight px-2 sm:px-3">
            ⚠️ Vencidas
            <span className="ml-1.5 rounded-full bg-red-100 dark:bg-red-900 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
              {totalVencidas}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      

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
                  placeholder="Código, edificio, tarea, CUIT, dirección..." 
                  className="pl-8 w-full" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  title="Busca en: factura, edificio, tarea, presupuesto, CUIT, dirección, datos AFIP, administrador, estado"
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
