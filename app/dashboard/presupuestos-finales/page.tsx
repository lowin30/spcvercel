import { getSession, getUserDetails, createServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { formatDate } from "@/lib/date-utils"
import { AlertTriangle } from "lucide-react"

export const dynamic = 'force-dynamic'
export default async function PresupuestosFinalesPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const userDetails = await getUserDetails()

  // Solo admins pueden ver presupuestos finales
  if (userDetails?.rol !== "admin") {
    redirect("/dashboard")
  }

  const supabase = await createServerClient()
  
  if (!supabase) {
    console.error("No se pudo crear el cliente de Supabase")
    return <div>Error al conectar con la base de datos</div>
  }

  // KPIs admin y vistas de detalle (solo admin)
  const { data: kpis } = await supabase
    .from('vista_finanzas_admin')
    .select('*')
    .single()

  const { data: liqSinPf } = await supabase
    .from('vista_admin_liquidaciones_sin_pf')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: pfSinFac } = await supabase
    .from('vista_admin_pf_aprobado_sin_factura')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: pbSinPf } = await supabase
    .from('vista_admin_pb_finalizada_sin_pf')
    .select('*')
    .limit(5)

  // Obtener listado de presupuestos finales usando la vista completa
  const { data: presupuestosFinales, error } = await supabase
    .from("vista_presupuestos_finales_completa")
    .select('*')
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error al cargar presupuestos finales:", error)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Presupuestos Finales</h1>
      </div>

      {/* Panel de recordatorios (solo admin) */}
      {kpis && (
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center text-amber-800">
              <AlertTriangle className="h-4 w-4 mr-2 text-amber-600" /> Recordatorios de administración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Liquidaciones sin PF</div>
                <div className="text-2xl font-bold">{(kpis as any).liquidaciones_sin_pf_count ?? 0}</div>
                <div className="mt-2 space-y-1.5">
                  {(liqSinPf || []).slice(0,3).map((it: any) => (
                    <Link 
                      key={it.id_liquidacion} 
                      href={`/dashboard/tareas/${it.id_tarea}`} 
                      className="block text-xs text-primary hover:underline"
                    >
                      <div className="line-clamp-2 leading-snug">
                        {it.titulo_tarea || it.code_tarea || `Tarea #${it.id_tarea}`}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">PF aprobados sin factura</div>
                <div className="text-2xl font-bold">{(kpis as any).pf_aprobado_sin_factura_count ?? 0}</div>
                <div className="mt-2 space-y-1.5">
                  {(pfSinFac || []).slice(0,3).map((it: any) => (
                    <Link 
                      key={it.id_presupuesto_final} 
                      href={`/dashboard/tareas/${it.id_tarea}`} 
                      className="block text-xs text-primary hover:underline"
                    >
                      <div className="line-clamp-2 leading-snug">
                        {it.titulo_tarea || it.code_tarea || `Tarea #${it.id_tarea}`}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">PB finalizada sin PF</div>
                <div className="text-2xl font-bold">{(kpis as any).pb_finalizada_sin_pf_count ?? 0}</div>
                <div className="mt-2 space-y-1.5">
                  {(pbSinPf || []).slice(0,3).map((it: any) => (
                    <Link 
                      key={it.id_presupuesto_base} 
                      href={`/dashboard/tareas/${it.id_tarea}`} 
                      className="block text-xs text-primary hover:underline"
                    >
                      <div className="line-clamp-2 leading-snug">
                        {it.titulo_tarea || it.code_tarea || `Tarea #${it.id_tarea}`}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {presupuestosFinales?.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                No hay presupuestos finales registrados.
              </div>
            </CardContent>
          </Card>
        ) : (
          (presupuestosFinales as any[])?.map((presupuesto: any) => (
            <Link 
              href={`/dashboard/presupuestos-finales/${presupuesto.id}`}
              key={presupuesto.id}
              className="block hover:no-underline"
            >
              <Card className="hover:bg-accent/5 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{presupuesto.code}</h3>
                        <Badge variant={presupuesto.aprobado ? "default" : presupuesto.rechazado ? "destructive" : "outline"}>
                          {presupuesto.aprobado ? "Aprobado" : presupuesto.rechazado ? "Rechazado" : "Pendiente"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Presupuesto Base: {presupuesto.code_presupuesto_base || "N/A"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Tarea: {presupuesto.titulo_tarea || "N/A"} ({presupuesto.code_tarea || "N/A"})
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {formatDate(presupuesto.created_at)}
                      </div>
                      <div className="font-medium">${presupuesto.total?.toLocaleString()}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
