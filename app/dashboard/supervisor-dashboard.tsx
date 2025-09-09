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
  AlertCircle 
} from "lucide-react"

// Definición de tipos
interface SupervisorStats {
  tareas_supervisadas?: number;
  presupuestos_pendientes?: number;
  trabajadores_asignados?: number;
  liquidaciones_propias?: number;
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tareas Supervisadas</p>
                <p className="text-2xl font-bold">{supervisorStats?.tareas_supervisadas || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Presup. Pendientes</p>
                <p className="text-2xl font-bold">{supervisorStats?.presupuestos_pendientes || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Trabajadores</p>
                <p className="text-2xl font-bold">{supervisorStats?.trabajadores_asignados || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Liquidaciones</p>
                <p className="text-2xl font-bold">{supervisorStats?.liquidaciones_propias || 0}</p>
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
        {supervisorStats?.presupuestos_pendientes ? supervisorStats.presupuestos_pendientes > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Presupuestos pendientes</AlertTitle>
            <AlertDescription>
              Tienes {supervisorStats.presupuestos_pendientes} tareas que necesitan presupuestos base.
              <Link href="/dashboard/presupuestos-base/nuevo" className="ml-2 underline">Crear presupuesto</Link>
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
                      <td className="px-4 py-2">{formatDate(task.fecha_visita)}</td>
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
