"use client"

import { useState, useEffect } from "react"
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
  total: number
  saldo_pendiente: number | string
  total_ajustes: number | string
  tiene_ajustes_pendientes?: boolean
  tiene_ajustes_pagados?: boolean
  id_administrador: number | null
}

interface Administrador {
  id: number
  nombre: string
}

export default function AjustesPage() {
  // Estados principales
  const [facturas, setFacturas] = useState<FacturaConAjuste[]>([])
  const [administradores, setAdministradores] = useState<Administrador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagandoAjustes, setPagandoAjustes] = useState(false)
  const [exportandoPDF, setExportandoPDF] = useState(false)
  const router = useRouter()
  
  // Filtros
  const [filtroAdmin, setFiltroAdmin] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [vistaActual, setVistaActual] = useState<'todas' | 'pendientes' | 'pagadas'>('pendientes')

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos()
  }, [filtroAdmin, vistaActual, searchQuery])

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

      // Cargar administradores
      const { data: adminsData, error: adminsError } = await supabase
        .from('administradores')
        .select('id, nombre')
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

      // Aplicar filtro de administrador
      if (filtroAdmin && filtroAdmin !== 0) {
        query = query.eq('id_administrador', filtroAdmin)
      }

      // Aplicar filtro por búsqueda
      if (searchQuery && searchQuery.trim() !== '') {
        query = query.or(`nombre.ilike.%${searchQuery}%,datos_afip.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%`)
      }

      const { data: facturasData, error: facturasError } = await query

      if (facturasError) {
        console.error("Error al cargar facturas:", facturasError)
        setError("Error al cargar las facturas")
        setFacturas([])
        return
      }

      // DEBUG: Log para ver qué facturas se cargaron
      console.log('📊 Facturas cargadas:', facturasData?.length || 0)
      console.log('📊 Facturas con total_ajustes > 0:', 
        facturasData?.filter((f: any) => {
          const ajustes = typeof f.total_ajustes === 'string' ? parseFloat(f.total_ajustes) : f.total_ajustes
          return ajustes > 0
        }).length || 0
      )

      // Necesitamos verificar qué ajustes están pendientes y cuáles pagados
      // Para cada factura, consultamos ajustes_facturas
      const facturasConEstado = await Promise.all(
        (facturasData || []).map(async (factura: any) => {
          // DEBUG: Consultar TODOS los ajustes (aprobados o no) para debug
          const { data: ajustes } = await supabase
            .from('ajustes_facturas')
            .select('*')
            .eq('id_factura', factura.id)

          // Log para debug
          if (ajustes && ajustes.length > 0) {
            console.log(`🔍 Factura ${factura.code || factura.id}:`, {
              total_ajustes_vista: factura.total_ajustes,
              ajustes_encontrados: ajustes.length,
              ajustes_detalle: ajustes.map(a => ({
                monto: a.monto_ajuste,
                aprobado: a.aprobado,
                pagado: a.pagado
              }))
            })
          }

          // Filtrar solo ajustes aprobados para la lógica
          const ajustesAprobados = ajustes?.filter((a: any) => a.aprobado === true) || []
          const { data: _unused } = { data: ajustesAprobados } // Para mantener la estructura

          const tiene_pendientes = ajustesAprobados?.some((a: any) => !a.pagado) || false
          const tiene_pagados = ajustesAprobados?.some((a: any) => a.pagado) || false

          return {
            ...factura,
            tiene_ajustes_pendientes: tiene_pendientes,
            tiene_ajustes_pagados: tiene_pagados,
          }
        })
      )

      // Primero filtrar solo facturas que tienen ajustes
      const facturasConAjustes = facturasConEstado.filter(f => {
        const ajustes = typeof f.total_ajustes === 'string' ? parseFloat(f.total_ajustes) : f.total_ajustes
        return ajustes > 0
      })

      console.log('✅ Facturas con ajustes aprobados:', facturasConAjustes.length)

      // Filtrar según vista actual
      let facturasFiltradas = facturasConAjustes
      if (vistaActual === 'pendientes') {
        facturasFiltradas = facturasConAjustes.filter(f => f.tiene_ajustes_pendientes)
      } else if (vistaActual === 'pagadas') {
        facturasFiltradas = facturasConAjustes.filter(f => f.tiene_ajustes_pagados && !f.tiene_ajustes_pendientes)
      }

      console.log(`📋 Vista "${vistaActual}":`, facturasFiltradas.length, 'facturas')

      setFacturas(facturasFiltradas)

    } catch (err) {
      console.error("Error inesperado:", err)
      setError("Ocurrió un error inesperado")
    } finally {
      setLoading(false)
    }
  }

  // Calcular estadísticas
  const todasLasFacturas = facturas
  const facturasPendientes = facturas.filter(f => f.tiene_ajustes_pendientes)
  const facturasPagadas = facturas.filter(f => f.tiene_ajustes_pagados && !f.tiene_ajustes_pendientes)

  const totalAjustes = todasLasFacturas.reduce((sum, f) => {
    const ajuste = typeof f.total_ajustes === 'string' ? parseFloat(f.total_ajustes) : f.total_ajustes
    return sum + (ajuste || 0)
  }, 0)

  const totalPendientes = facturasPendientes.reduce((sum, f) => {
    const ajuste = typeof f.total_ajustes === 'string' ? parseFloat(f.total_ajustes) : f.total_ajustes
    return sum + (ajuste || 0)
  }, 0)

  const totalPagados = totalAjustes - totalPendientes

  // Calcular resumen del administrador seleccionado
  const administradorSeleccionado = administradores.find(a => a.id === filtroAdmin)
  const facturasAdminPendientes = filtroAdmin && filtroAdmin !== 0
    ? facturas.filter(f => f.id_administrador === filtroAdmin && f.tiene_ajustes_pendientes)
    : []

  const totalAdminPendiente = facturasAdminPendientes.reduce((sum, f) => {
    const ajuste = typeof f.total_ajustes === 'string' ? parseFloat(f.total_ajustes) : f.total_ajustes
    return sum + (ajuste || 0)
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
        
        // Generar PDF automáticamente
        await handleExportarPDF()
        
        // Recargar datos
        cargarDatos()
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportarPDF}
            disabled={exportandoPDF || facturas.length === 0}
          >
            {exportandoPDF ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</>
            ) : (
              <><FileText className="mr-2 h-4 w-4" /> Exportar PDF</>
            )}
          </Button>
        </div>
      </div>

      {/* TABS */}
      <Tabs value={vistaActual} onValueChange={(v) => setVistaActual(v as any)}>
        <TabsList>
          <TabsTrigger value="todas">📋 Todas</TabsTrigger>
          <TabsTrigger value="pendientes">⏳ Pendientes</TabsTrigger>
          <TabsTrigger value="pagadas">✅ Pagadas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* CARDS DE RESUMEN */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todasLasFacturas.length}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalAjustes)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todasLasFacturas.length}</div>
            <p className="text-xs text-muted-foreground">Todos aprobados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes Pago</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{facturasPendientes.length}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalPendientes)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{facturasPagadas.length}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalPagados)}</p>
          </CardContent>
        </Card>
      </div>

      {/* FILTROS */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtra por administrador o busca por nombre/AFIP</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Búsqueda */}
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Factura, AFIP, código..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
