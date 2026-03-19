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
  const resParams: any = await params
  const user = await validateSessionAndGetUser()

  if (!user) {
    redirect("/login")
  }

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
      .eq("id", resParams.id)
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

  // Datos inmutables desde el snapshot de la vista
  const totalPresupuestoBase = liquidacion.total_base || 0
  const gananciaNeta = liquidacion.ganancia_neta || 0
  
  // Extraer desglose del snapshot JSON
  const detalleSnapshot = (liquidacion.detalle_gastos_json || []) as { tipo: string, fecha: string, descripcion: string, monto: number }[]
  const materialesDetalle = detalleSnapshot.filter(d => d.tipo === 'material')
  const jornalesDetalle = detalleSnapshot.filter(d => d.tipo === 'jornal')
  
  const totalMateriales = materialesDetalle.reduce((acc, curr) => acc + curr.monto, 0)
  const totalJornales = jornalesDetalle.reduce((acc, curr) => acc + curr.monto, 0)
  const totalReembolso = totalMateriales + totalJornales
  const totalATransferir = (liquidacion.ganancia_supervisor || 0) + totalReembolso

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link href="/dashboard/liquidaciones">
            <ArrowLeft className="h-4 w-4 mr-1" /> volver
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">liquidacion {liquidacion.code}</h1>
        <div className="sm:ml-auto">
          <DescargarLiquidacionPdfButton liquidacionId={Number(resParams.id)} />
        </div>
      </div>

      {/* bloque de cierre platinum */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4 sm:p-6 shadow-sm overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
              <span className="text-zinc-600 dark:text-zinc-400 text-sm">ganancia supervisor</span>
              <span className="text-lg font-bold">${(liquidacion.ganancia_supervisor || 0).toLocaleString("es-AR")}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
              <span className="text-zinc-600 dark:text-zinc-400 text-sm">(+) reembolso de gastos</span>
              <span className="text-lg font-bold">${totalReembolso.toLocaleString("es-AR")}</span>
            </div>
            <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/50">
              <span className="text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest">total a transferir</span>
              <div className="text-4xl font-black text-emerald-900 dark:text-emerald-300 tabular-nums">
                ${totalATransferir.toLocaleString("es-AR")}
              </div>
            </div>
          </div>
          <div className="hidden lg:block opacity-10 pointer-events-none absolute right-[-10px] bottom-[-20px]">
             <Calculator size={160} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-3 space-y-6">
          <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <CardTitle className="text-zinc-900 dark:text-zinc-100 uppercase text-xs tracking-widest font-bold">detalles genéricos</CardTitle>
                <Badge variant="outline" className="font-mono">{liquidacion.code}</Badge>
              </div>
              <CardDescription>creada el {formatDateTime(liquidacion.created_at)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">tarea asociada</h3>
                <Link href={`/dashboard/tareas/${liquidacion.id_tarea}`} className="text-zinc-900 dark:text-zinc-100 font-black text-xl hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  {liquidacion.titulo_tarea || "sin titulo"}
                </Link>
                <p className="text-xs text-zinc-500 mt-1">{liquidacion.code || "sin codigo"}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">presupuesto base</h3>
                  <p className="text-lg font-bold">${totalPresupuestoBase.toLocaleString("es-AR")}</p>
                </div>
                <div className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">gastos totales</h3>
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400">${liquidacion.gastos_reales.toLocaleString("es-AR")}</p>
                </div>
                <div className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">ganancia neta</h3>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${gananciaNeta.toLocaleString("es-AR")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="h-1 w-6 bg-emerald-500 rounded-full"></div>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500">transparencia de gastos reales</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* jornadas (partes de trabajo) */}
              <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-400">jornales (mano de obra)</CardTitle>
                </CardHeader>
                <CardContent>
                  {jornalesDetalle.length > 0 ? (
                    <div className="space-y-1">
                      {jornalesDetalle.map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-xs transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">{it.descripcion}</span>
                            <span className="text-[10px] text-zinc-400">{new Date(it.fecha).toLocaleDateString("es-AR")}</span>
                          </div>
                          <span className="tabular-nums font-bold">${it.monto.toLocaleString("es-AR")}</span>
                        </div>
                      ))}
                      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between font-black text-zinc-900 dark:text-white px-2">
                        <span className="text-[10px] uppercase">total mano de obra</span>
                        <span>${totalJornales.toLocaleString("es-AR")}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic p-2">no hay jornadas registradas en este snapshot.</p>
                  )}
                </CardContent>
              </Card>

              {/* materiales */}
              <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-400">materiales y viaticos</CardTitle>
                </CardHeader>
                <CardContent>
                  {materialesDetalle.length > 0 ? (
                    <div className="space-y-1">
                      {materialesDetalle.map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-xs transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">{it.descripcion}</span>
                            <span className="text-[10px] text-zinc-400">{new Date(it.fecha).toLocaleDateString("es-AR")}</span>
                          </div>
                          <span className="tabular-nums font-bold">${it.monto.toLocaleString("es-AR")}</span>
                        </div>
                      ))}
                      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between font-black text-zinc-900 dark:text-white px-2">
                        <span className="text-[10px] uppercase">total materiales</span>
                        <span>${totalMateriales.toLocaleString("es-AR")}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic p-2">no hay materiales registrados en este snapshot.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
