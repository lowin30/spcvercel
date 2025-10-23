"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase-client"
import { DollarSign, Calendar, Receipt, CalendarDays, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface HistorialPagosProps {
  userId: string
  userRole?: string
}

interface Liquidacion {
  id: number
  id_trabajador: string
  semana_inicio: string
  semana_fin: string
  total_dias: string | number
  salario_base: number
  plus_manual: number
  gastos_reembolsados: number
  total_pagar: number
  estado: string
  observaciones: string | null
  created_at: string
  updated_at: string
}

export function HistorialPagos({ userId, userRole = 'trabajador' }: HistorialPagosProps) {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [filtroMes, setFiltroMes] = useState<string>("todos")
  const [filtroAnio, setFiltroAnio] = useState<string>(new Date().getFullYear().toString())
  const [filtroEstado, setFiltroEstado] = useState<string>("todos")
  const supabase = createClient()

  const cargarLiquidaciones = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('liquidaciones_trabajadores')
        .select('*')
        .eq('id_trabajador', userId)
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      setLiquidaciones((data as Liquidacion[]) || [])
    } catch (error: any) {
      console.error("Error cargando liquidaciones:", error)
      toast.error("❌ Error al cargar historial de pagos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarLiquidaciones()
  }, [userId])

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  // Filtrar liquidaciones
  const liquidacionesFiltradas = liquidaciones.filter(liq => {
    const fecha = new Date(liq.semana_inicio)
    const mes = (fecha.getMonth() + 1).toString()
    const anio = fecha.getFullYear().toString()

    const cumpleMes = filtroMes === "todos" || mes === filtroMes
    const cumpleAnio = anio === filtroAnio
    const cumpleEstado = filtroEstado === "todos" || liq.estado === filtroEstado

    return cumpleMes && cumpleAnio && cumpleEstado
  })

  // Calcular estadísticas
  const totalCobrado = liquidacionesFiltradas.reduce((sum, liq) => sum + liq.total_pagar, 0)
  const totalDiasTrabajados = liquidacionesFiltradas.reduce((sum, liq) => {
    const dias = typeof liq.total_dias === 'string' ? parseFloat(liq.total_dias) : liq.total_dias
    return sum + (dias || 0)
  }, 0)
  const promedioMensual = liquidacionesFiltradas.length > 0 ? totalCobrado / liquidacionesFiltradas.length : 0

  // Obtener años únicos
  const aniosDisponibles = Array.from(
    new Set(liquidaciones.map(liq => new Date(liq.semana_inicio).getFullYear()))
  ).sort((a, b) => b - a)

  const meses = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" }
  ]

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Historial de Pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2">Cargando historial...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cards de resumen */}
      {liquidacionesFiltradas.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Cobrado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                ${totalCobrado.toLocaleString('es-CL')}
              </div>
              <p className="text-xs text-green-600 mt-1">
                {liquidacionesFiltradas.length} pago{liquidacionesFiltradas.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Días Trabajados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {totalDiasTrabajados.toFixed(1)}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                En periodo seleccionado
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-900 flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Promedio por Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">
                ${Math.round(promedioMensual).toLocaleString('es-CL')}
              </div>
              <p className="text-xs text-purple-600 mt-1">
                Por liquidación
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            <Select value={filtroAnio} onValueChange={setFiltroAnio}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {aniosDisponibles.map(anio => (
                  <SelectItem key={anio} value={anio.toString()}>
                    {anio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los meses</SelectItem>
                {meses.map(mes => (
                  <SelectItem key={mes.value} value={mes.value}>
                    {mes.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de liquidaciones */}
      {liquidacionesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <DollarSign className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No hay liquidaciones en el periodo seleccionado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {liquidacionesFiltradas.map(liq => {
            const isExpanded = expandedIds.has(liq.id)
            const diasTrabajados = typeof liq.total_dias === 'string' ? parseFloat(liq.total_dias) : liq.total_dias
            const fechaInicio = new Date(liq.semana_inicio)
            const fechaFin = new Date(liq.semana_fin)

            return (
              <Card key={liq.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors pb-3"
                  onClick={() => toggleExpanded(liq.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base">
                          Liquidación #{liq.id}
                        </span>
                        <Badge
                          variant={liq.estado === 'pagado' ? 'default' : 'secondary'}
                          className={
                            liq.estado === 'pagado'
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-yellow-500 hover:bg-yellow-600'
                          }
                        >
                          {liq.estado === 'pagado' ? '✓ Pagado' : '⏳ Pendiente'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {fechaInicio.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                        {' → '}
                        {fechaFin.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' • '}
                        {diasTrabajados} día{diasTrabajados !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          ${liq.total_pagar.toLocaleString('es-CL')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(liq.created_at).toLocaleDateString('es-CL')}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 border-t">
                    <div className="space-y-3 pt-4">
                      {/* Desglose */}
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md border border-blue-100">
                          <span className="text-sm font-medium text-blue-900">💰 Salario base</span>
                          <span className="text-sm font-semibold text-blue-700">
                            ${liq.salario_base.toLocaleString('es-CL')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-md border border-purple-100">
                          <span className="text-sm font-medium text-purple-900">🧾 Gastos reembolsados</span>
                          <span className="text-sm font-semibold text-purple-700">
                            ${liq.gastos_reembolsados.toLocaleString('es-CL')}
                          </span>
                        </div>

                        {liq.plus_manual > 0 && (
                          <div className="flex items-center justify-between p-3 bg-green-50 rounded-md border border-green-100">
                            <span className="text-sm font-medium text-green-900">✨ Plus adicional</span>
                            <span className="text-sm font-semibold text-green-700">
                              ${liq.plus_manual.toLocaleString('es-CL')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Total destacado */}
                      <div className="flex items-center justify-between p-4 bg-primary/10 rounded-md border-2 border-primary/20">
                        <span className="text-base font-bold text-primary">Total Pagado</span>
                        <span className="text-xl font-bold text-primary">
                          ${liq.total_pagar.toLocaleString('es-CL')}
                        </span>
                      </div>

                      {/* Observaciones */}
                      {liq.observaciones && (
                        <div className="p-3 bg-muted rounded-md border">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Observaciones:</p>
                          <p className="text-sm">{liq.observaciones}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
