"use client"

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { TaskStatusBadge } from "./tasks-badge"
import { formatDate } from "@/lib/date-utils"
import { MiSemanaWidget } from "@/components/mi-semana-widget"
import { 
  Clock, 
  Receipt,
  CheckCircle,
  AlertCircle
} from "lucide-react"

// Definición de tipos
interface TrabajadorStats {
  mis_tareas?: number;
  dias_registrados_mes?: number;
  gastos_pendientes?: number;
  proximo_pago_estimado?: number;
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

interface TrabajadorDashboardProps {
  stats?: Stats;
  trabajadorStats?: TrabajadorStats;
  recentTasks?: Task[];
  userId?: string;
  salarioDiario?: number;
}

// Componente específico para Trabajador
export function TrabajadorDashboard({ stats, trabajadorStats, recentTasks, userId, salarioDiario = 0 }: TrabajadorDashboardProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel Personal */}
        <Card className="border shadow-sm">
          <CardHeader className="bg-purple-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> Panel Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Mis Tareas</p>
                <p className="text-2xl font-bold">{trabajadorStats?.mis_tareas || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Días Registrados</p>
                <p className="text-2xl font-bold">{trabajadorStats?.dias_registrados_mes || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gastos Pendientes</p>
                <p className="text-2xl font-bold">{trabajadorStats?.gastos_pendientes || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Próximo Pago</p>
                <p className="text-2xl font-bold">${trabajadorStats?.proximo_pago_estimado?.toLocaleString() || 0}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-between gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/trabajadores/registro-dias" className="w-full">
                  <Clock className="h-4 w-4 mr-2" /> Registrar Día
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/trabajadores/gastos" className="w-full">
                  <Receipt className="h-4 w-4 mr-2" /> Registrar Gasto
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Widget Mi Semana */}
        {userId && (
          <MiSemanaWidget 
            trabajadorId={userId}
            salarioDiario={salarioDiario}
          />
        )}
      </div>

      {/* Alertas y Notificaciones */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Alertas y Notificaciones</h2>
        {trabajadorStats?.gastos_pendientes ? trabajadorStats.gastos_pendientes > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Gastos pendientes de aprobación</AlertTitle>
            <AlertDescription>
              Tienes {trabajadorStats.gastos_pendientes} gastos pendientes de aprobación.
              <Link href="/dashboard/gastos" className="ml-2 underline">Ver gastos</Link>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      {/* Mis Tareas Activas */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Mis Tareas Activas</h2>
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
                      No hay tareas asignadas
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
