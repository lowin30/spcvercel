"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { AjustesList } from "@/components/ajustes-list"
import { Search, Loader2, DollarSign, FileText, CheckCircle, Clock, CreditCard } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { pagarAjustesAdministrador } from "./actions"
import { generarAjustesPDF } from "@/lib/pdf-ajustes-generator"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

// Tipos
interface FacturaConAjuste {
  id: number
  code: string
  nombre: string | null
  datos_afip: string | null
  afip_numero?: string | null
  total: number
  saldo_pendiente: number | string
  total_ajustes: number | string
  total_ajustes_calculados: number | string  // 🆕 Calculados (aprobado=false)
  total_ajustes_pendientes: number | string  // 🆕 Pendientes liquidación
  total_ajustes_liquidados: number | string  // 🆕 Liquidados
  total_ajustes_todos: number | string       // 🆕 Todos
  tiene_ajustes_pendientes?: boolean
  tiene_ajustes_pagados?: boolean
  id_administrador: number | null
  pagada?: boolean
  // Campos para búsqueda (de vista_facturas_completa)
  nombre_edificio?: string | null
  direccion_edificio?: string | null
  cuit_edificio?: string | null
  titulo_tarea?: string | null
  code_tarea?: string | null
  presupuesto_final_code?: string | null
}

interface Administrador {
  id: number
  nombre: string
}

export default function AjustesPage() {
  // Estados principales
  const [facturasBase, setFacturasBase] = useState<FacturaConAjuste[]>([]) // 🆕 Facturas filtradas por admin y vista
  const [todasLasFacturas, setTodasLasFacturas] = useState<FacturaConAjuste[]>([]) // Todas sin filtrar
  const [administradores, setAdministradores] = useState<Administrador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagandoAjustes, setPagandoAjustes] = useState(false)
  const [exportandoPDF, setExportandoPDF] = useState(false)
  const router = useRouter()
  
  // Filtros
  const [filtroAdmin, setFiltroAdmin] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [vistaActual, setVistaActual] = useState<'pendientes' | 'liquidadas' | 'calculados' | 'todas'>('pendientes')

  // Cargar datos iniciales (SIN searchQuery en dependencias)
  useEffect(() => {
    cargarDatos()
  }, [filtroAdmin, vistaActual])

  async function cargarDatos() {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      // Verificar sesión
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Cargar administradores (solo activos)
      const { data: adminsData, error: adminsError } = await supabase
        .from('administradores')
        .select('id, nombre')
        .eq('estado', 'activo')
        .order('nombre')
      
      if (adminsError) {
        console.error("Error al cargar administradores:", adminsError)
      } else {
        setAdministradores(adminsData || [])
      }

      // Cargar facturas desde vista_facturas_completa
      // NOTA: Removemos temporalmente el filtro .gt('total_ajustes', 0) para debug
      let query = supabase
        .from('vista_facturas_completa')
        .select('*')
        // .gt('total_ajustes', 0) // ← Comentado para debug
        .order('created_at', { ascending: false })
        .range(0, 99)

      // Aplicar filtro de administrador
      if (filtroAdmin && filtroAdmin !== 0) {
        query = query.eq('id_administrador', filtroAdmin)
      }

      // ⚠️ BÚSQUEDA SE HACE CLIENT-SIDE (más abajo) para evitar errores de Supabase

      const { data: facturasData, error: facturasError } = await query

      if (facturasError) {
        console.error("Error al cargar facturas:", facturasError)
        setError("Error al cargar las facturas")
        setFacturasBase([])
        setTodasLasFacturas([]) // Todas sin filtrar
        return
      }

      if (!facturasData || facturasData.length === 0) {
        console.log("⚠️ No se encontraron facturas")
        setFacturasBase([])
        setTodasLasFacturas([]) // Todas sin filtrar
        return
      }

      console.log(`✅ Facturas cargadas: ${facturasData.length}`)
      console.log(
        'Ejemplo:',
        facturasData[0]?.total_ajustes_calculados,
        facturasData[0]?.total_ajustes_pendientes,
        facturasData[0]?.total_ajustes_liquidados,
        facturasData[0]?.total_ajustes_todos
      )

      // GUARDAR TODAS LAS FACTURAS SIN FILTRAR
      setTodasLasFacturas(facturasData)

      // FILTRAR SEGÚN VISTA ACTUAL usando las 4 nuevas columnas
      // Búsqueda se aplica después con useMemo
      let facturasFiltradas = facturasData || []
      
      if (vistaActual === 'pendientes') {
        // Solo facturas con ajustes PENDIENTES de liquidación (aprobado=true, pagado=false)
        facturasFiltradas = facturasFiltradas.filter((f: any) => {
          const pendientes = typeof f.total_ajustes_pendientes === 'string' 
            ? parseFloat(f.total_ajustes_pendientes) 
            : f.total_ajustes_pendientes
          return pendientes > 0
        })
      } else if (vistaActual === 'liquidadas') {
        // Solo facturas con ajustes LIQUIDADOS (pagado=true)
        facturasFiltradas = facturasFiltradas.filter((f: any) => {
          const liquidados = typeof f.total_ajustes_liquidados === 'string' 
            ? parseFloat(f.total_ajustes_liquidados) 
            : f.total_ajustes_liquidados
          return liquidados > 0
        })
      } else if (vistaActual === 'calculados') {
        // Solo facturas con ajustes CALCULADOS (aprobado=false)
        facturasFiltradas = facturasFiltradas.filter((f: any) => {
          const calculados = typeof f.total_ajustes_calculados === 'string' 
            ? parseFloat(f.total_ajustes_calculados) 
            : f.total_ajustes_calculados
          return calculados > 0
        })
      } else {
        // Vista "todas": Mostrar si tiene cualquier ajuste
        facturasFiltradas = facturasFiltradas.filter((f: any) => {
          const todos = typeof f.total_ajustes_todos === 'string' 
            ? parseFloat(f.total_ajustes_todos) 
            : f.total_ajustes_todos
          return todos > 0
        })
      }
      
      console.log(`📋 Vista "${vistaActual}":`, facturasFiltradas.length, 'facturas')
      setFacturasBase(facturasFiltradas)

    } catch (err) {
      console.error("Error inesperado:", err)
      setError("Ocurrió un error inesperado")
    } finally {
      setLoading(false)
    }
  }

  // 🆕 CALCULAR ESTADÍSTICAS usando TODAS LAS FACTURAS (no filtradas)
  const totalCalculados = todasLasFacturas.reduce((sum, f) => {
    const val = typeof f.total_ajustes_calculados === 'string' ? parseFloat(f.total_ajustes_calculados) : f.total_ajustes_calculados
    return sum + (val || 0)
  }, 0)
  
  const totalPendientes = todasLasFacturas.reduce((sum, f) => {
    const val = typeof f.total_ajustes_pendientes === 'string' ? parseFloat(f.total_ajustes_pendientes) : f.total_ajustes_pendientes
    return sum + (val || 0)
  }, 0)
  
  const totalLiquidados = todasLasFacturas.reduce((sum, f) => {
    const val = typeof f.total_ajustes_liquidados === 'string' ? parseFloat(f.total_ajustes_liquidados) : f.total_ajustes_liquidados
    return sum + (val || 0)
  }, 0)
  
  const totalTodos = todasLasFacturas.reduce((sum, f) => {
    const val = typeof f.total_ajustes_todos === 'string' ? parseFloat(f.total_ajustes_todos) : f.total_ajustes_todos
    return sum + (val || 0)
  }, 0)
  
  // Contadores sobre TODAS las facturas
  const cantidadCalculados = todasLasFacturas.filter(f => {
    const val = typeof f.total_ajustes_calculados === 'string' ? parseFloat(f.total_ajustes_calculados) : f.total_ajustes_calculados
    return val > 0
  }).length
  
  const cantidadPendientes = todasLasFacturas.filter(f => {
    const val = typeof f.total_ajustes_pendientes === 'string' ? parseFloat(f.total_ajustes_pendientes) : f.total_ajustes_pendientes
    return val > 0
  }).length
  
  const cantidadLiquidadas = todasLasFacturas.filter(f => {
    const val = typeof f.total_ajustes_liquidados === 'string' ? parseFloat(f.total_ajustes_liquidados) : f.total_ajustes_liquidados
    return val > 0
  }).length
  
  const cantidadTodas = todasLasFacturas.filter(f => {
    const val = typeof f.total_ajustes_todos === 'string' ? parseFloat(f.total_ajustes_todos) : f.total_ajustes_todos
    return val > 0
  }).length

  // 🔍 BÚSQUEDA CLIENT-SIDE con useMemo (sobre facturasBase)
  const facturas = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      return facturasBase;
    }
    
    const termino = searchQuery.toLowerCase();
    return facturasBase.filter((f) => {
      // Preferir afip_numero si existe; fallback a datos_afip (string o JSON stringificado)
      const datosAfipStr = f.datos_afip 
        ? (typeof f.datos_afip === 'string' ? f.datos_afip : JSON.stringify(f.datos_afip))
        : '';
      const afipStr = f.afip_numero ? String(f.afip_numero) : datosAfipStr;
      
      return (
        (f.code && f.code.toLowerCase().includes(termino)) ||
        (f.nombre && f.nombre.toLowerCase().includes(termino)) ||
        (afipStr && afipStr.toLowerCase().includes(termino)) ||
        (f.nombre_edificio && f.nombre_edificio.toLowerCase().includes(termino)) ||
        (f.direccion_edificio && f.direccion_edificio.toLowerCase().includes(termino)) ||
        (f.cuit_edificio && f.cuit_edificio.toLowerCase().includes(termino)) ||
        (f.titulo_tarea && f.titulo_tarea.toLowerCase().includes(termino)) ||
        (f.code_tarea && f.code_tarea.toLowerCase().includes(termino)) ||
        (f.presupuesto_final_code && f.presupuesto_final_code.toLowerCase().includes(termino))
      );
    });
  }, [facturasBase, searchQuery]);

  // Calcular resumen del administrador seleccionado (SOLO PENDIENTES)
  const administradorSeleccionado = administradores.find(a => a.id === filtroAdmin)
  const facturasAdminPendientes = filtroAdmin && filtroAdmin !== 0
    ? (todasLasFacturas || []).filter((f: any) => {
        if (Number(f.id_administrador) !== Number(filtroAdmin)) return false
        const pendientes = typeof f.total_ajustes_pendientes === 'string' 
          ? parseFloat(f.total_ajustes_pendientes as any) 
          : (f.total_ajustes_pendientes || 0)
        // Normalizar pagada (boolean/num/string)
        const pagadaBool = f.pagada === true || f.pagada === 'true' || f.pagada === 1 || f.pagada === '1' || f.pagada === 't'
        // Solo considerar facturas totalmente pagadas para habilitar liquidación de ajustes
        return (pendientes || 0) > 0 && pagadaBool
      })
    : []

  const totalAdminPendiente = facturasAdminPendientes.reduce((sum, f) => {
    const val = typeof f.total_ajustes_pendientes === 'string' ? parseFloat(f.total_ajustes_pendientes) : f.total_ajustes_pendientes
    return sum + (val || 0)
  }, 0)

  // Función para pagar ajustes
  const handlePagarAjustes = async () => {
    if (!filtroAdmin || filtroAdmin === 0) {
      toast.error("Selecciona un administrador")
      return
    }

    if (facturasAdminPendientes.length === 0) {
      toast.error("No hay ajustes pendientes para este administrador")
      return
    }

    const confirmacion = confirm(
      `¿Confirmar pago de $${totalAdminPendiente.toLocaleString("es-AR")} en ajustes de ${administradorSeleccionado?.nombre}?\n\n` +
      `Facturas afectadas: ${facturasAdminPendientes.length}`
    )

    if (!confirmacion) return

    setPagandoAjustes(true)
    
    try {
      const result = await pagarAjustesAdministrador(filtroAdmin)
      
      if (result.success) {
        toast.success(
          `✅ Se pagaron $${result.data?.totalPagado.toLocaleString("es-AR")} en ${result.data?.cantidadAjustes} ajustes`
        )
        
        // Generar PDF automáticamente SOLO con las facturas liquidadas en esta acción
        try {
          const facturasParaPDF = (facturasAdminPendientes || []).map((f: any) => ({
            id: f.id,
            nombre: f.nombre,
            datos_afip: f.datos_afip,
            total: f.total,
            // Monto liquidado es lo pendiente antes del pago
            total_ajustes: typeof f.total_ajustes_pendientes === 'string'
              ? parseFloat(f.total_ajustes_pendientes as any)
              : (f.total_ajustes_pendientes || 0),
          }))

          const totalAjustesExport = facturasParaPDF.reduce((sum: number, ff: any) => sum + (Number(ff.total_ajustes) || 0), 0)

          const pdfBlob = await generarAjustesPDF({
            facturas: facturasParaPDF,
            nombreAdministrador: administradorSeleccionado?.nombre,
            totalAjustes: totalAjustesExport,
          })

          const url = URL.createObjectURL(pdfBlob)
          const link = document.createElement("a")
          link.href = url
          link.download = `Ajustes_${administradorSeleccionado?.nombre || 'Admin'}_${format(new Date(), "dd-MM-yyyy")}.pdf`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        } finally {
          // Recargar datos
          cargarDatos()
        }
      } else {
        toast.error(result.error || "Error al pagar ajustes")
      }
    } catch (error) {
      console.error("Error al pagar ajustes:", error)
      toast.error("Error inesperado al procesar el pago")
    } finally {
      setPagandoAjustes(false)
    }
  }

  // Función para exportar PDF
  const handleExportarPDF = async () => {
    if (facturas.length === 0) {
      toast.error("No hay facturas para exportar")
      return
    }

    setExportandoPDF(true)

    try {
      const facturasParaPDF = facturas.map(f => ({
        id: f.id,
        nombre: f.nombre,
        datos_afip: f.datos_afip,
        total: f.total,
        total_ajustes: f.total_ajustes,
      }))

      const totalAjustesExport = facturas.reduce((sum, f) => {
        const ajuste = typeof f.total_ajustes === 'string' ? parseFloat(f.total_ajustes) : f.total_ajustes
        return sum + (ajuste || 0)
      }, 0)

      const pdfBlob = await generarAjustesPDF({
        facturas: facturasParaPDF,
        nombreAdministrador: administradorSeleccionado?.nombre,
        totalAjustes: totalAjustesExport,
      })

      // Descargar PDF
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Ajustes_${administradorSeleccionado?.nombre || 'Todos'}_${format(new Date(), "dd-MM-yyyy")}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("PDF generado correctamente")
    } catch (error) {
      console.error("Error al generar PDF:", error)
      toast.error("Error al generar el PDF")
    } finally {
      setExportandoPDF(false)
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString("es-AR")}`

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Ajustes de Facturas</h1>
        <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportarPDF}
            disabled={exportandoPDF || facturas.length === 0}
            className="w-full sm:w-auto"
          >
            {exportandoPDF ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</>
            ) : (
              <><FileText className="mr-2 h-4 w-4" /> Exportar PDF</>
            )}
          </Button>
        </div>
      </div>

      {/* 🆕 TABS ACTUALIZADOS */}
      <Tabs value={vistaActual} onValueChange={(v) => setVistaActual(v as any)}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="pendientes">
            🟠 Para Liquidar ({cantidadPendientes})
          </TabsTrigger>
          <TabsTrigger value="liquidadas">
            ✅ Liquidadas ({cantidadLiquidadas})
          </TabsTrigger>
          <TabsTrigger value="calculados">
            🟡 Calculados ({cantidadCalculados})
          </TabsTrigger>
          <TabsTrigger value="todas">
            📋 Todas ({cantidadTodas})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 🆕 CARDS DE RESUMEN ACTUALIZADOS (4 COLUMNAS) */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calculados</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalCalculados)}</div>
            <p className="text-xs text-muted-foreground">{cantidadCalculados} facturas</p>
          </CardContent>
        </Card>

        <Card className="border-orange-500 border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">Para Liquidar</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{formatCurrency(totalPendientes)}</div>
            <p className="text-xs text-orange-700 font-medium">{cantidadPendientes} facturas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Liquidados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalLiquidados)}</div>
            <p className="text-xs text-muted-foreground">{cantidadLiquidadas} facturas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Histórico</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalTodos)}</div>
            <p className="text-xs text-muted-foreground">Todos los ajustes</p>
          </CardContent>
        </Card>
      </div>

      {/* FILTROS */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtra por administrador o busca en cualquier campo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Búsqueda */}
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Código, edificio, tarea, CUIT, dirección..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  title="Busca en: factura, edificio, tarea, presupuesto, CUIT, dirección, datos AFIP"
                />
              </div>
            </div>

            {/* Administrador */}
            <div>
              <label className="text-sm font-medium mb-2 block">Administrador</label>
              <Select 
                value={filtroAdmin?.toString() || "0"} 
                onValueChange={(v) => setFiltroAdmin(parseInt(v) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todos los administradores</SelectItem>
                  {administradores.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id.toString()}>
                      {admin.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD RESUMEN ADMINISTRADOR SELECCIONADO */}
      {filtroAdmin && filtroAdmin !== 0 && facturasAdminPendientes.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-orange-900">
              💰 Ajustes Pendientes - {administradorSeleccionado?.nombre}
            </CardTitle>
            <CardDescription>
              Total a pagar: <span className="font-bold text-orange-600 text-lg">{formatCurrency(totalAdminPendiente)}</span>
              <br />
              {facturasAdminPendientes.length} factura{facturasAdminPendientes.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handlePagarAjustes}
              disabled={pagandoAjustes}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700"
            >
              {pagandoAjustes ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>
              ) : (
                <><CreditCard className="mr-2 h-4 w-4" /> Pagar Todos los Ajustes</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* LISTADO DE FACTURAS */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Facturas con Ajustes</CardTitle>
          <CardDescription>
            Mostrando {facturas.length} factura{facturas.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-800 p-4 rounded-md text-center">
              {error}
            </div>
          ) : (
            <AjustesList facturas={facturas} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
