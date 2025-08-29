import { getSession, getUserDetails, createServerClient } from "@/lib/supabase-server"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Calculator, FileText } from "lucide-react"
import { SettlementChart } from "@/components/settlement-chart"

interface SettlementPageProps {
  params: {
    id: string
  }
}

export default async function SettlementPage({ params }: SettlementPageProps) {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const userDetails = await getUserDetails()

  // Solo admins pueden ver liquidaciones
  if (userDetails?.rol !== "admin") {
    redirect("/dashboard")
  }

  const supabase = createServerClient()
  
  if (!supabase) {
    throw new Error("No se pudo inicializar el cliente de Supabase")
  }

  // Obtener liquidación usando la vista optimizada
  const { data: liquidacion } = await supabase
    .from("vista_liquidaciones_completa")
    .select(`*`)
    .eq("id", params.id)
    .single()

  if (!liquidacion) {
    notFound()
  }
  
  // En la vista optimizada, estos datos ya vienen calculados
  const totalPresupuestoBase = liquidacion.total_base || 0
  const gananciaNeta = liquidacion.ganancia_neta || 0
  const ajusteAdmin = liquidacion.ajuste_admin || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link href="/dashboard/liquidaciones">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Liquidación {liquidacion.code}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Detalles de la Liquidación</CardTitle>
                <Badge variant="outline">{liquidacion.code}</Badge>
              </div>
              <CardDescription>Creada el {formatDateTime(liquidacion.created_at)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">Tarea asociada</h3>
                <Link href={`/dashboard/tareas/${liquidacion.id_tarea}`} className="text-primary hover:underline">
                  {liquidacion.titulo_tarea || "Sin título"} ({liquidacion.code || "Sin código"})
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-1">Presupuesto Base (Referencia)</h3>
                  <Link
                    href={`/dashboard/presupuestos/${liquidacion.id_presupuesto_base}`}
                    className="flex items-center text-primary hover:underline"
                  >
                    <Calculator className="h-4 w-4 mr-1" />
                    {liquidacion.code_presupuesto_base || "N/A"}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1">Total: ${totalPresupuestoBase.toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Presupuesto Final</h3>
                  <Link
                    href={`/dashboard/presupuestos/${liquidacion.id_presupuesto_final}`}
                    className="flex items-center text-primary hover:underline"
                  >
                    <Calculator className="h-4 w-4 mr-1" />
                    {liquidacion.code_presupuesto_final || "N/A"}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1">Total: ${(totalPresupuestoBase + (ajusteAdmin || 0)).toLocaleString()}</p>
                  <p className="text-xs text-green-600">Ajuste Admin: ${ajusteAdmin.toLocaleString()}</p>
                </div>
              </div>

              {liquidacion.code_factura && (
                <div>
                  <h3 className="font-medium mb-1">Factura</h3>
                  <Link
                    href={`/dashboard/facturas/${liquidacion.id_factura}`}
                    className="flex items-center text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    {liquidacion.code_factura}
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-1">Gastos reales</h3>
                  <p className="text-lg">${liquidacion.gastos_reales.toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Ganancia neta</h3>
                  <p className="text-lg text-green-600">${gananciaNeta.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Presupuesto Base - Gastos Reales = ${totalPresupuestoBase.toLocaleString()} - $
                    {liquidacion.gastos_reales.toLocaleString()}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Ganancia supervisor (50%)</h3>
                  <p className="text-lg">${liquidacion.ganancia_supervisor.toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Ganancia administrador</h3>
                  <p className="text-lg">${liquidacion.ganancia_admin.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    50% Ganancia Neta + Ajuste = ${Math.round(gananciaNeta / 2).toLocaleString()} + $
                    {ajusteAdmin.toLocaleString()}
                  </p>
                </div>
                <div className="col-span-2">
                  <h3 className="font-medium mb-1">Ganancia total</h3>
                  <p className="text-xl font-bold">
                    ${(liquidacion.ganancia_supervisor + liquidacion.ganancia_admin).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribución Financiera</CardTitle>
              <CardDescription>Análisis visual de la distribución de costos y ganancias</CardDescription>
            </CardHeader>
            <CardContent>
              <SettlementChart settlement={liquidacion} />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Resumen Financiero</CardTitle>
              <CardDescription>Análisis de rentabilidad del proyecto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-md">
                <h3 className="text-sm font-medium mb-1">Base para Liquidación</h3>
                <p className="text-lg font-bold">${totalPresupuestoBase.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Presupuesto Base (no el Final)</p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-1">Presupuesto final</h3>
                <p className="text-lg">${(totalPresupuestoBase + (ajusteAdmin || 0)).toLocaleString()}</p>
                <p className="text-xs text-green-600">Ajuste Admin: ${ajusteAdmin.toLocaleString()}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-1">Gastos reales</h3>
                <p className="text-lg">${liquidacion.gastos_reales.toLocaleString()}</p>
              </div>

              <div className="pt-2 border-t">
                <h3 className="text-sm font-medium mb-1">Ganancia neta</h3>
                <p className="text-lg text-green-600">${gananciaNeta.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Presupuesto Base - Gastos Reales</p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-1">Rentabilidad</h3>
                <p className="text-lg">
                  {gananciaNeta > 0 ? ((gananciaNeta / liquidacion.gastos_reales) * 100).toFixed(2) : "0.00"}%
                </p>
              </div>

              <div className="pt-2 border-t">
                <h3 className="text-sm font-medium mb-1">Distribución de ganancias</h3>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-orange-50 p-2 rounded">
                    <p className="text-xs text-muted-foreground">Supervisor (50%)</p>
                    <p className="font-medium">
                      ${liquidacion.ganancia_supervisor.toLocaleString()} (
                      {(
                        (liquidacion.ganancia_supervisor /
                          (liquidacion.ganancia_supervisor + liquidacion.ganancia_admin)) *
                        100
                      ).toFixed(0)}
                      %)
                    </p>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <p className="text-xs text-muted-foreground">Administrador</p>
                    <p className="font-medium">
                      ${liquidacion.ganancia_admin.toLocaleString()} (
                      {(
                        (liquidacion.ganancia_admin / (liquidacion.ganancia_supervisor + liquidacion.ganancia_admin)) *
                        100
                      ).toFixed(0)}
                      %)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      50% Ganancia + ${ajusteAdmin.toLocaleString()} (ajuste)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
