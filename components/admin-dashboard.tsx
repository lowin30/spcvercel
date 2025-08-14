"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { formatDate } from "@/lib/date-utils"
import { FileText, AlertTriangle, DollarSign, Building2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function AdminDashboard() {
  const [presupuestosFinales, setPresupuestosFinales] = useState<any[]>([])
  const [liquidacionesRecientes, setLiquidacionesRecientes] = useState<any[]>([])
  const [sobrecostosRecientes, setSobrecostosRecientes] = useState<any[]>([])
  const [estadisticas, setEstadisticas] = useState<any>({
    total_edificios: 0,
    total_tareas: 0,
    tareas_pendientes: 0,
    total_presupuestos: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function cargarDatos() {
      setIsLoading(true)

      // Cargar presupuestos finales recientes
      const { data: presupuestos, error: presupuestosError } = await supabase
        .from("presupuestos_finales")
        .select(`
          id,
          code,
          materiales,
          mano_obra,
          total,
          created_at,
          presupuestos_base (
            id,
            code,
            id_tarea,
            tareas (
              id,
              titulo
            )
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5)

      if (presupuestos && !presupuestosError) {
        setPresupuestosFinales(presupuestos)
      }

      // Cargar liquidaciones recientes
      const { data: liquidaciones, error: liquidacionesError } = await supabase
        .from("liquidaciones_nuevas")
        .select(`
          id,
          code,
          gastos_reales,
          ganancia_neta,
          sobrecosto,
          monto_sobrecosto,
          created_at,
          id_tarea,
          tareas (
            id,
            titulo
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5)

      if (liquidaciones && !liquidacionesError) {
        setLiquidacionesRecientes(liquidaciones)

        // Filtrar liquidaciones con sobrecosto
        const sobrecostos = liquidaciones.filter((l) => l.sobrecosto)
        setSobrecostosRecientes(sobrecostos)
      }

      // Cargar estadísticas generales
      const { data: stats, error: statsError } = await supabase.rpc("get_dashboard_stats")

      if (stats && !statsError) {
        setEstadisticas(stats)
      }

      setIsLoading(false)
    }

    cargarDatos()
  }, [supabase])

  return (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Edificios</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticas.total_edificios || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tareas Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticas.tareas_pendientes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Presupuestos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estadisticas.total_presupuestos || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sobrecostos Activos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sobrecostosRecientes.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Presupuestos y Liquidaciones */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Presupuestos Finales Recientes</CardTitle>
            <CardDescription>Últimos presupuestos finales creados</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando presupuestos...</p>
            ) : presupuestosFinales.length > 0 ? (
              <div className="space-y-4">
                {presupuestosFinales.map((presupuesto) => (
                  <div key={presupuesto.id} className="flex items-start space-x-2 border-b pb-2">
                    <div className="flex-1">
                      <p className="font-medium">
                        <Link href={`/dashboard/presupuestos/${presupuesto.id}`} className="hover:underline">
                          Presupuesto {presupuesto.code}
                        </Link>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {presupuesto.presupuestos_base?.tareas?.titulo || "Sin tarea asociada"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${presupuesto.total?.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(presupuesto.created_at)}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <Link href="/dashboard/presupuestos">
                    <Button variant="outline" size="sm" className="w-full">
                      Ver todos los presupuestos
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay presupuestos recientes</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liquidaciones Recientes</CardTitle>
            <CardDescription>Últimas liquidaciones procesadas</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando liquidaciones...</p>
            ) : liquidacionesRecientes.length > 0 ? (
              <div className="space-y-4">
                {liquidacionesRecientes.map((liquidacion) => (
                  <div key={liquidacion.id} className="flex items-start space-x-2 border-b pb-2">
                    <div className="flex-1">
                      <p className="font-medium">
                        <Link href={`/dashboard/liquidaciones/${liquidacion.id}`} className="hover:underline">
                          Liquidación {liquidacion.code}
                        </Link>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {liquidacion.tareas?.titulo || "Sin tarea asociada"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${liquidacion.sobrecosto ? "text-red-600" : "text-green-600"}`}>
                        {liquidacion.sobrecosto
                          ? `-$${liquidacion.monto_sobrecosto?.toLocaleString()}`
                          : `+$${liquidacion.ganancia_neta?.toLocaleString()}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(liquidacion.created_at)}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <Link href="/dashboard/liquidaciones">
                    <Button variant="outline" size="sm" className="w-full">
                      Ver todas las liquidaciones
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay liquidaciones recientes</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sobrecostos */}
      <Card>
        <CardHeader>
          <CardTitle>Sobrecostos Recientes</CardTitle>
          <CardDescription>Liquidaciones con gastos que superaron el presupuesto base</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando datos de sobrecostos...</p>
          ) : sobrecostosRecientes.length > 0 ? (
            <div className="space-y-4">
              {sobrecostosRecientes.map((sobrecosto) => (
                <div key={sobrecosto.id} className="p-4 bg-red-50 rounded-md border border-red-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Liquidación {sobrecosto.code}</p>
                      <p className="text-sm">{sobrecosto.tareas?.titulo || "Sin tarea asociada"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600">-${sobrecosto.monto_sobrecosto?.toLocaleString()}</p>
                      <p className="text-xs text-red-500">{formatDate(sobrecosto.created_at)}</p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="p-2 bg-red-100 rounded">
                      <p className="text-xs text-red-700">Impacto Supervisor</p>
                      <p className="font-medium">-${Math.round(sobrecosto.monto_sobrecosto / 2).toLocaleString()}</p>
                    </div>
                    <div className="p-2 bg-red-100 rounded">
                      <p className="text-xs text-red-700">Impacto Admin</p>
                      <p className="font-medium">-${Math.round(sobrecosto.monto_sobrecosto / 2).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-green-50 rounded-md border border-green-200">
              <p className="text-green-700">No hay sobrecostos recientes. ¡Buen trabajo!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
