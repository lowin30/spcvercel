"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calculator, CheckCircle, Clock, AlertTriangle, ExternalLink } from "lucide-react"
import { GenerarAjustesDialog } from "@/components/generar-ajustes-dialog"
import { createClient } from "@/lib/supabase-client"
import Link from "next/link"

interface AjustesFacturaSectionProps {
  factura: {
    id: number
    code: string
    total: number
    pagada: boolean
    id_estado_nuevo: number
    id_administrador?: number
  }
  esFacturaMateriales: boolean
  adminConfigProp?: { aplica_ajustes: boolean; porcentaje_default: number } | null
}

export function AjustesFacturaSection({ factura, esFacturaMateriales, adminConfigProp }: AjustesFacturaSectionProps) {
  const [ajustes, setAjustes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const supabase = createClient()
  const [adminConfig, setAdminConfig] = useState<{ aplica_ajustes: boolean; porcentaje_default: number } | null>(adminConfigProp || null)

  // Cargar ajustes existentes
  useEffect(() => {
    async function cargarAjustes() {
      const { data, error } = await supabase
        .from("ajustes_facturas")
        .select("*")
        .eq("id_factura", factura.id)
        .order("created_at", { ascending: false })

      if (!error && data) {
        setAjustes(data)
      }

      // Si no recibimos el config por props, intentamos cargar por compatibilidad
      // Pero idealmente vendrá de props para evitar 406
      if (!adminConfigProp && factura.id_administrador) {
        const { data: admin, error: adminError } = await supabase
          .from('administradores')
          .select('aplica_ajustes, porcentaje_default')
          .eq('id', factura.id_administrador)
          .single()
        if (!adminError && admin) {
          setAdminConfig({
            aplica_ajustes: !!admin.aplica_ajustes,
            porcentaje_default: Number(admin.porcentaje_default || 0)
          })
        }
      }

      setLoading(false)
    }
    cargarAjustes()
  }, [factura.id, factura.id_administrador, adminConfigProp, supabase])

  // Si es factura de materiales, no mostrar ajustes
  if (esFacturaMateriales) {
    return null
  }

  const shouldShow = (ajustes.length > 0) || (adminConfig?.aplica_ajustes === true)
  if (!shouldShow) {
    return null
  }

  // Calcular totales
  const totalCalculados = ajustes
    .filter(a => !a.aprobado && !a.pagado)
    .reduce((sum, a) => sum + parseFloat(a.monto_ajuste || 0), 0)

  const totalPendientes = ajustes
    .filter(a => a.aprobado && !a.pagado)
    .reduce((sum, a) => sum + parseFloat(a.monto_ajuste || 0), 0)

  const totalLiquidados = ajustes
    .filter(a => a.pagado)
    .reduce((sum, a) => sum + parseFloat(a.monto_ajuste || 0), 0)

  const totalTodos = ajustes.reduce((sum, a) => sum + parseFloat(a.monto_ajuste || 0), 0)

  const tieneAjustes = ajustes.length > 0

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-AR')}`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-orange-600" />
              Ajustes de Factura
            </CardTitle>
            <CardDescription>
              Gestión de ajustes por mano de obra ({(adminConfig?.porcentaje_default ?? 0)}% sobre el total)
            </CardDescription>
          </div>

          {/* Botón para generar ajustes */}
          {!tieneAjustes && (
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Generar Ajustes
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">
            Cargando ajustes...
          </div>
        ) : !tieneAjustes ? (
          <div className="text-center py-8 space-y-4">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <div className="text-lg font-medium text-gray-900">
                No hay ajustes generados
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {factura.pagada
                  ? "Esta factura está pagada. Los ajustes se aprobarán automáticamente al generarlos."
                  : "Genera ajustes cuando la factura esté lista. Se aprobarán automáticamente cuando se pague la factura."}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumen de ajustes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Calculados */}
              {totalCalculados > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs font-medium text-yellow-700">
                      Calculados
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-900">
                    {formatCurrency(totalCalculados)}
                  </div>
                  <div className="text-xs text-yellow-600 mt-1">
                    Esperando aprobación
                  </div>
                </div>
              )}

              {/* Pendientes */}
              {totalPendientes > 0 && (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-xs font-medium text-orange-700">
                      Pendientes
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    {formatCurrency(totalPendientes)}
                  </div>
                  <div className="text-xs text-orange-600 mt-1">
                    Listos para liquidar
                  </div>
                </div>
              )}

              {/* Liquidados */}
              {totalLiquidados > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700">
                      Liquidados
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {formatCurrency(totalLiquidados)}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    Ya pagados
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="h-4 w-4 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">
                    Total
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalTodos)}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {ajustes.length} ajuste(s)
                </div>
              </div>
            </div>

            {/* Lista de ajustes */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">
                Detalle de ajustes:
              </div>
              <div className="space-y-2">
                {ajustes.map((ajuste) => (
                  <div
                    key={ajuste.id}
                    className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{ajuste.descripcion_item}</div>
                      <div className="text-sm text-muted-foreground">
                        Base: {formatCurrency(parseFloat(ajuste.monto_base || 0))} × {ajuste.porcentaje_ajuste}%
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {formatCurrency(parseFloat(ajuste.monto_ajuste || 0))}
                        </div>
                      </div>
                      <div>
                        {ajuste.pagado ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Liquidado
                          </span>
                        ) : ajuste.aprobado ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Pendiente
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Calculado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones */}
            {(totalPendientes > 0 || totalCalculados > 0) && (
              <div className="pt-4 border-t">
                <Button
                  asChild
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  <Link href="/dashboard/ajustes?tab=pendientes">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver en Dashboard de Ajustes
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Dialog para generar ajustes */}
      {dialogOpen && (
        <GenerarAjustesDialog
          factura={factura as any}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </Card>
  )
}
