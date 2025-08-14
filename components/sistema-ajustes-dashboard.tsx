"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, AlertTriangle, Calculator, CheckCircle, Clock, DollarSign } from "lucide-react"

interface EstadisticasAjustes {
  facturas_pendientes: number
  facturas_aprobadas: number
  total_ajustes_pendientes: number
  total_ajustes_aprobados: number
}

export function SistemaAjustesDashboard() {
  const [estadisticas, setEstadisticas] = useState<EstadisticasAjustes | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadEstadisticas()
  }, [])

  const loadEstadisticas = async () => {
    try {
      // Obtener facturas con ajustes
      const { data: facturas } = await supabase
        .from("facturas")
        .select(`
          id,
          tiene_ajustes,
          ajustes_aprobados,
          ajustes_facturas (
            monto_ajuste,
            aprobado
          )
        `)
        .eq("tiene_ajustes", true)

      if (facturas) {
        const pendientes = facturas.filter((f) => !f.ajustes_aprobados).length
        const aprobadas = facturas.filter((f) => f.ajustes_aprobados).length

        const totalPendientes = facturas
          .filter((f) => !f.ajustes_aprobados)
          .reduce((sum, f) => {
            return sum + (f.ajustes_facturas?.reduce((itemSum, aj) => itemSum + Number(aj.monto_ajuste), 0) || 0)
          }, 0)

        const totalAprobados = facturas
          .filter((f) => f.ajustes_aprobados)
          .reduce((sum, f) => {
            return sum + (f.ajustes_facturas?.reduce((itemSum, aj) => itemSum + Number(aj.monto_ajuste), 0) || 0)
          }, 0)

        setEstadisticas({
          facturas_pendientes: pendientes,
          facturas_aprobadas: aprobadas,
          total_ajustes_pendientes: totalPendientes,
          total_ajustes_aprobados: totalAprobados,
        })
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-2 text-muted-foreground">Cargando estadísticas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Alert className="border-red-200 bg-red-50">
        <Shield className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>SISTEMA CONFIDENCIAL:</strong> Esta información es altamente sensible y solo debe ser accedida por
          personal autorizado.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{estadisticas?.facturas_pendientes || 0}</div>
            <p className="text-xs text-muted-foreground">Requieren cálculo de ajustes</p>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Aprobadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{estadisticas?.facturas_aprobadas || 0}</div>
            <p className="text-xs text-muted-foreground">Ajustes ya procesados</p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ajustes Pendientes</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${(estadisticas?.total_ajustes_pendientes || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Monto por aprobar</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ajustes Aprobados</CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${(estadisticas?.total_ajustes_aprobados || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Monto ya procesado</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              <span>Acciones Requeridas</span>
            </CardTitle>
            <CardDescription>Tareas pendientes en el sistema de ajustes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {estadisticas?.facturas_pendientes ? (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div>
                  <div className="font-medium">Calcular ajustes pendientes</div>
                  <div className="text-sm text-muted-foreground">
                    {estadisticas.facturas_pendientes} facturas requieren atención
                  </div>
                </div>
                <Badge variant="destructive">Urgente</Badge>
              </div>
            ) : (
              <div className="text-center py-4 text-green-600">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                <div className="font-medium">Todas las facturas están procesadas</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-700">
              <Shield className="h-5 w-5" />
              <span>Configuración de Seguridad</span>
            </CardTitle>
            <CardDescription>Estado del sistema de ajustes confidenciales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Acceso restringido</span>
              <Badge variant="default" className="bg-green-600">
                Activo
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Auditoría de cambios</span>
              <Badge variant="default" className="bg-green-600">
                Habilitada
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Encriptación de datos</span>
              <Badge variant="default" className="bg-green-600">
                Activa
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
