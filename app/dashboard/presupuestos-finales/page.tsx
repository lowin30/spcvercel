import { getSession, getUserDetails, createServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { formatDate } from "@/lib/date-utils"

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

  const supabase = createServerClient()
  
  if (!supabase) {
    console.error("No se pudo crear el cliente de Supabase")
    return <div>Error al conectar con la base de datos</div>
  }

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
          presupuestosFinales?.map((presupuesto) => (
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
