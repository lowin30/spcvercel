"use client"

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { TaskStatusBadge } from "./tasks-badge"
import { formatDate } from "@/lib/date-utils"
import { 
  ClipboardList, 
  Wallet,
  TrendingUp, 
  AlertCircle,
  HelpCircle,
  AlertTriangle
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Definición de tipos
interface SupervisorStats {
  tareas_supervisadas?: number;
  trabajadores_asignados?: number;
  liquidaciones_propias?: number;
  // Nuevos KPIs desde vista_finanzas_supervisor
  visitas_hoy_total?: number;
  liquidaciones_pendientes?: number;
  liquidaciones_mes?: number;
  ganancia_supervisor_mes?: number;
  gastos_sin_comprobante_total?: number;
  gastos_no_liquidados?: number;
  jornales_no_liquidados?: number;
  gastos_no_liquidados_semana?: number;
  jornales_pendientes_semana?: number;
  monto_jornales_pendientes_semana?: number;
  jornales_pendientes_mayor_7d?: number;
  monto_jornales_pendientes_mayor_7d?: number;
  presupuestos_base_total?: number;
  presupuestos_base_monto_total?: number;
}

interface Task {
  id: string | number;
  titulo?: string;
  estado_tarea?: string;
  id_estado_nuevo?: string | number;
  fecha_visita?: string;
  created_at?: string;
  estados?: {
    nombre?: string;
    color?: string;
  }
}

interface Stats {
  total_edificios?: number;
  total_contactos?: number;
  total_administradores?: number;
  tareas_activas?: number;
}

interface SupervisorDashboardProps {
  stats?: Stats;
  supervisorStats?: SupervisorStats;
  recentTasks?: Task[];
}

// Componente específico para Supervisor
export function SupervisorDashboard({ stats, supervisorStats, recentTasks }: SupervisorDashboardProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel de Gestión */}
        <Card className="border shadow-sm">
          <CardHeader className="bg-green-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Gestión de Tareas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tareas Supervisadas</p>
                <p className="text-2xl font-bold">{supervisorStats?.tareas_supervisadas || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Trabajadores</p>
                <p className="text-2xl font-bold">{supervisorStats?.trabajadores_asignados || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Liquidaciones</p>
                <p className="text-2xl font-bold">{supervisorStats?.liquidaciones_propias || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Visitas Hoy</p>
                <p className="text-2xl font-bold text-sky-600">{supervisorStats?.visitas_hoy_total || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Listas para liquidar</p>
                <p className="text-2xl font-bold text-purple-600">{supervisorStats?.liquidaciones_pendientes || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Liquidaciones (Mes)</p>
                <p className="text-2xl font-bold text-emerald-600">{supervisorStats?.liquidaciones_mes || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Ganancia Sup. (Mes)</p>
                <p className="text-2xl font-bold text-blue-600">${supervisorStats?.ganancia_supervisor_mes?.toLocaleString() || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gastos sin Comprobante</p>
                <p className="text-2xl font-bold text-red-600">{supervisorStats?.gastos_sin_comprobante_total || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Jornales 7d+</p>
                <p className="text-2xl font-bold">{supervisorStats?.jornales_pendientes_mayor_7d || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Monto Jornales 7d+</p>
                <p className="text-2xl font-bold text-amber-600">${supervisorStats?.monto_jornales_pendientes_mayor_7d?.toLocaleString() || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gasto Semana</p>
                <p className="text-2xl font-bold">${supervisorStats?.gastos_no_liquidados_semana?.toLocaleString() || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Jornal Semana</p>
                <p className="text-2xl font-bold">${supervisorStats?.monto_jornales_pendientes_semana?.toLocaleString() || 0}</p>
              </div>
              <div className="space-y-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-sm text-muted-foreground cursor-help flex items-center gap-1">
                        PB (Cantidad) <HelpCircle className="h-3 w-3" />
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Presupuestos Base creados</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-2xl font-bold">{supervisorStats?.presupuestos_base_total || 0}</p>
              </div>
              <div className="space-y-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-sm text-muted-foreground cursor-help flex items-center gap-1">
                        PB (Monto) <HelpCircle className="h-3 w-3" />
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Monto total de Presupuestos Base</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-2xl font-bold">${supervisorStats?.presupuestos_base_monto_total?.toLocaleString() || 0}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-between gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/tareas" className="w-full">
                  <ClipboardList className="h-4 w-4 mr-2" /> Ver Tareas
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/liquidaciones" className="w-full">
                  <Wallet className="h-4 w-4 mr-2" /> Ver Liquidaciones
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Acciones Rápidas */}
        <Card className="border shadow-sm">
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-3">
              <Button asChild>
                <Link href="/dashboard/presupuestos-base/nuevo">
                  Crear Presupuesto Base
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/trabajadores/registro-dias">
                  Seguimiento de Trabajadores
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/contactos">
                  Gestionar Contactos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas y Notificaciones */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Alertas y Notificaciones</h2>
        {supervisorStats?.jornales_pendientes_mayor_7d ? supervisorStats.jornales_pendientes_mayor_7d > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>⚠️ Jornales pendientes (7d+)</AlertTitle>
            <AlertDescription>
              Tienes {supervisorStats.jornales_pendientes_mayor_7d} jornales sin liquidar con más de 7 días.
              {supervisorStats.monto_jornales_pendientes_mayor_7d && (
                <span className="block mt-1 font-semibold">
                  Monto total: ${supervisorStats.monto_jornales_pendientes_mayor_7d.toLocaleString()}
                </span>
              )}
              <Link href="/dashboard/liquidaciones/nueva" className="ml-2 underline font-semibold inline-block mt-2">
                Liquidar ahora →
              </Link>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      {/* Tareas supervisadas */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Tareas Supervisadas</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/tareas">Ver todas</Link>
          </Button>
        </div>
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Título</th>
                  <th className="px-4 py-2 text-left font-medium">Estado</th>
                  <th className="px-4 py-2 text-left font-medium">Fecha de Visita</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks && recentTasks.length > 0 ? (
                  recentTasks.map((task) => (
                    <tr key={task.id} className="border-b">
                      <td className="px-4 py-2">
                        <Link href={`/dashboard/tareas/${task.id}`} className="hover:underline text-blue-600">
                          {task.titulo}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <TaskStatusBadge task={task} />
                      </td>
                      <td className="px-4 py-2">{formatDate(task.fecha_visita || "")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-center text-muted-foreground">
                      No hay tareas recientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
