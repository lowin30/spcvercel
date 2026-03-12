import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { DescargarLiquidacionPdfButton } from "./descargar-liquidacion-pdf-button"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Calculator } from "lucide-react"

interface SettlementPageProps {
  params: {
    id: string
  }
}

export default async function SettlementPage({ params }: SettlementPageProps) {
  const resolvedParams: any = await (params as any)
  const user = await validateSessionAndGetUser()

  // Admin y Supervisor pueden ver liquidaciones (RBAC Bridge)
  if (user.rol !== "admin" && user.rol !== "supervisor") {
    redirect("/dashboard")
  }

  // 2. Obtener liquidación (Soberanía de datos via SupabaseAdmin)
  let liquidacion = null
  try {
    const { data, error } = await supabaseAdmin
      .from("vista_liquidaciones_completa")
      .select(`*`)
      .eq("id", resolvedParams.id)
      .maybeSingle()

    if (error) throw error
    if (!data) notFound()
    liquidacion = data
  } catch (err) {
    console.error("spc: error cargando liquidacion", err)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-bold text-zinc-800">error de conexion</h2>
        <p className="text-muted-foreground text-center max-w-md">
          no pudimos traer los datos de la liquidacion. puede ser un parpadeo de la base de datos. por favor, recarga la pagina.
        </p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/liquidaciones">volver a la lista</Link>
        </Button>
      </div>
    )
  }

  // Restringir acceso: el supervisor solo puede ver sus propias liquidaciones
  if (user.rol === "supervisor") {
    const sessionEmail = user.email
    if (liquidacion.email_supervisor && sessionEmail && liquidacion.email_supervisor !== sessionEmail) {
      redirect("/dashboard/liquidaciones")
    }
  }

  // En la vista optimizada, estos datos ya vienen calculados
  const totalPresupuestoBase = liquidacion.total_base || 0
  const gananciaNeta = liquidacion.ganancia_neta || 0
  // Cargar desglose de gastos (materiales y jornales) para secciones
  const { data: desglose } = await supabaseAdmin.rpc(
    'obtener_desglose_gastos_para_liquidacion',
    { p_id_tarea: liquidacion.id_tarea }
  )
  const materiales = Array.isArray(desglose) ? desglose.find((d: any) => d.categoria === 'materiales') : null
  const jornales = Array.isArray(desglose) ? desglose.find((d: any) => d.categoria === 'jornales') : null
  const materialesDetalle = materiales?.detalle || []
  const jornalesDetalle = jornales?.detalle || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link href="/dashboard/liquidaciones">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Liquidación {liquidacion.code}</h1>
        <div className="sm:ml-auto">
          <DescargarLiquidacionPdfButton liquidacionId={Number(resolvedParams.id)} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <CardTitle>Detalles de la Liquidación</CardTitle>
                <Badge variant="outline">{liquidacion.code}</Badge>
              </div>
              <CardDescription>Creada el {formatDateTime(liquidacion.created_at)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div>
                <h3 className="font-medium mb-1">Tarea asociada</h3>
                <Link href={`/dashboard/tareas/${liquidacion.id_tarea}`} className="text-primary hover:underline">
                  {liquidacion.titulo_tarea || "Sin título"} ({liquidacion.code || "Sin código"})
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div>
                  <h3 className="font-medium mb-1">Presupuesto Base</h3>
                  <Link
                    href={`/dashboard/presupuestos-base/${liquidacion.id_presupuesto_base}`}
                    className="flex items-center text-primary hover:underline"
                  >
                    <Calculator className="h-4 w-4 mr-1" />
                    {liquidacion.code_presupuesto_base || "N/A"}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1">Total: ${totalPresupuestoBase.toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Gastos reales</h3>
                  <p className="text-lg">${liquidacion.gastos_reales.toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Ganancia neta</h3>
                  <p className="text-lg text-green-600">${gananciaNeta.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Presupuesto Base - Gastos Reales = ${totalPresupuestoBase.toLocaleString()} - ${liquidacion.gastos_reales.toLocaleString()}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Liquidación Supervisor</h3>
                  <p className="text-lg font-semibold">${liquidacion.ganancia_supervisor.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total a pagar al supervisor</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Jornales (Partes de trabajo) */}
          <Card>
            <CardHeader>
              <CardTitle>Partes de trabajo (Jornales)</CardTitle>
              <CardDescription>Detalle de jornadas reales liquidadas</CardDescription>
            </CardHeader>
            <CardContent>
              {jornalesDetalle.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-1.5 text-left">Fecha</th>
                        <th className="py-1.5 text-left">Tipo</th>
                        <th className="py-1.5 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jornalesDetalle.map((it: any, idx: number) => (
                        <tr key={idx} className="border-b">
                          <td className="py-1.5">{it.fecha ? new Date(it.fecha).toLocaleDateString("es-CO") : "-"}</td>
                          <td className="py-1.5">{it.tipo_jornada || it.descripcion || "-"}</td>
                          <td className="py-1.5 text-right">${(it.monto || it.monto_total || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t">
                        <td className="py-1.5 font-semibold" colSpan={2}>Total jornales</td>
                        <td className="py-1.5 text-right font-semibold">${(jornales?.monto_total || 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay partes de trabajo registrados.</p>
              )}
            </CardContent>
          </Card>

          {/* Materiales */}
          <Card>
            <CardHeader>
              <CardTitle>Materiales</CardTitle>
              <CardDescription>Detalle de gastos de materiales</CardDescription>
            </CardHeader>
            <CardContent>
              {materialesDetalle.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-1.5 text-left">Fecha</th>
                        <th className="py-1.5 text-left">Descripción</th>
                        <th className="py-1.5 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialesDetalle.map((it: any, idx: number) => (
                        <tr key={idx} className="border-b">
                          <td className="py-1.5">{it.fecha ? new Date(it.fecha).toLocaleDateString("es-CO") : "-"}</td>
                          <td className="py-1.5">{it.descripcion || it.detalle || "-"}</td>
                          <td className="py-1.5 text-right">${(it.monto || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t">
                        <td className="py-1.5 font-semibold" colSpan={2}>Total materiales</td>
                        <td className="py-1.5 text-right font-semibold">${(materiales?.monto_total || 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay materiales registrados.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
