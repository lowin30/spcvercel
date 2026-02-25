"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { formatDate } from "@/lib/date-utils"
import { FileText, AlertTriangle, Users } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function SupervisorDashboard({ userId }: { userId: string }) {
  const [presupuestosPendientes, setPresupuestosPendientes] = useState<any[]>([])
  const [alertasSobrecostos, setAlertasSobrecostos] = useState<any[]>([])
  const [trabajadoresAsignados, setTrabajadoresAsignados] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function cargarDatos() {
      setIsLoading(true)

      // Cargar presupuestos base creados por el supervisor
      const { data: presupuestos, error: presupuestosError } = await supabase
        .from("presupuestos_base")
        .select("*")
        .eq("id_supervisor", userId)
        .order("created_at", { ascending: false })
        .limit(5)

      if (presupuestos && !presupuestosError) {
        setPresupuestosPendientes(presupuestos)
      }

      // Cargar alertas de sobrecostos para el supervisor
      const { data: alertas, error: alertasError } = await supabase
        .from("alertas_sistema")
        .select("*")
        .eq("id_usuario_destino", userId)
        .eq("tipo_alerta", "sobrecosto")
        .eq("leida", false)
        .order("fecha_creacion", { ascending: false })

      if (alertas && !alertasError) {
        setAlertasSobrecostos(alertas)
      }

      // Cargar trabajadores asignados a tareas supervisadas por este supervisor utilizando la vista optimizada
      const { data: tareas, error: tareasError } = await supabase
        .from("vista_tareas_completa")
        .select(
          `id, titulo, trabajadores_emails, supervisores_emails`
        )
        // Filtramos tareas donde este supervisor está asignado
        .filter('supervisores_emails', 'cs', `{${userId}}`)

      if (tareas && !tareasError) {
        // Obtenemos información detallada de los trabajadores asignados a estas tareas
        // Primero extraemos todos los emails de trabajadores de todas las tareas
        const todosEmailsTrabajadores = tareas
          .flatMap((t: any) => t.trabajadores_emails || [])
          .filter((email: string) => !!email);

        // Si hay trabajadores, consultamos sus detalles
        if (todosEmailsTrabajadores.length > 0) {
          const { data: usuariosData, error: usuariosError } = await supabase
            .from("usuarios")
            .select("id, email, nombre, color_perfil")
            .in("id", todosEmailsTrabajadores);

          if (usuariosData && !usuariosError) {
            // Creamos un mapeo de emails a información de usuarios
            const usuariosPorId: Record<string, any> = {};
            usuariosData.forEach((usuario: any) => {
              usuariosPorId[usuario.id] = usuario;
            });

            // Generamos la lista formateada de trabajadores asignados
            const trabajadoresFormateados = tareas.flatMap((tarea: any) =>
              (tarea.trabajadores_emails || []).map((trabajadorId: string) => ({
                id_tarea: tarea.id,
                titulo_tarea: tarea.titulo || "Tarea sin título",
                id_trabajador: trabajadorId,
                email: usuariosPorId[trabajadorId]?.email || "Sin email",
                nombre: usuariosPorId[trabajadorId]?.nombre || "Sin nombre",
              }))
            ).filter((t: any) => !!t.id_trabajador);

            setTrabajadoresAsignados(trabajadoresFormateados);
          }
        } else {
          setTrabajadoresAsignados([]);
        }
      }

      setIsLoading(false)
    }

    if (userId) {
      cargarDatos()
    }
  }, [userId, supabase])

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Presupuestos Base Recientes</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando presupuestos...</p>
          ) : presupuestosPendientes.length > 0 ? (
            <div className="space-y-4">
              {presupuestosPendientes.map((presupuesto) => (
                <div key={presupuesto.id} className="flex items-start space-x-2">
                  <div
                    className={`w-2 h-2 mt-1.5 rounded-full ${presupuesto.aprobado ? "bg-green-500" : "bg-yellow-500"}`}
                  ></div>
                  <div>
                    <p className="font-medium text-sm">Presupuesto {presupuesto.code}</p>
                    <p className="text-xs text-muted-foreground">
                      Total: ${presupuesto.total?.toLocaleString()} - {formatDate(presupuesto.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Link href="/dashboard/presupuestos-finales">
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas de Sobrecostos</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando alertas...</p>
          ) : alertasSobrecostos.length > 0 ? (
            <div className="space-y-4">
              {alertasSobrecostos.map((alerta) => (
                <div key={alerta.id} className="p-3 bg-red-50 rounded-md border border-red-200">
                  <p className="text-sm font-medium text-red-700">{alerta.mensaje}</p>
                  <p className="text-xs text-red-600">{formatDate(alerta.fecha_creacion)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-green-50 rounded-md border border-green-200">
              <p className="text-sm text-green-700">No hay alertas de sobrecostos pendientes</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm font-medium">Trabajadores Asignados</CardTitle>
            <CardDescription>Trabajadores asignados a tus tareas</CardDescription>
          </div>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando trabajadores...</p>
          ) : trabajadoresAsignados.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium py-2 px-2">Trabajador</th>
                    <th className="text-left font-medium py-2 px-2">Tarea</th>
                  </tr>
                </thead>
                <tbody>
                  {trabajadoresAsignados.map((trabajador, index) => (
                    <tr
                      key={`${trabajador.id_trabajador}-${trabajador.id_tarea}`}
                      className={index % 2 === 0 ? "bg-muted/50" : ""}
                    >
                      <td className="py-2 px-2">{trabajador.nombre || trabajador.email}</td>
                      <td className="py-2 px-2">{trabajador.titulo_tarea}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay trabajadores asignados a tus tareas</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
