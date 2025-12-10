"use client"

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { TaskStatusBadge } from "./tasks-badge"
import { formatDate } from "@/lib/date-utils"
import { 
  FileBarChart, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  AlertCircle,
  FileText
} from "lucide-react"

// Componente específico para Admin
export function AdminDashboard({ stats, financialStats, recentTasks, recentBuildings }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel Financiero */}
        <Card className="border shadow-sm">
          <CardHeader className="bg-amber-50 dark:bg-amber-400/10 border-b">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CreditCard className="h-5 w-5" /> Panel Financiero
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Presupuestos Activos</p>
                <p className="text-2xl font-bold">{financialStats?.presupuestos_activos || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Monto Total</p>
                <p className="text-2xl font-bold">${financialStats?.presupuestos_monto_total?.toLocaleString() || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Facturas Pendientes</p>
                <p className="text-2xl font-bold">{financialStats?.facturas_pendientes || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Liquidaciones Pendientes</p>
                <p className="text-2xl font-bold">{financialStats?.liquidaciones_pendientes || 0}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-between gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/presupuestos" className="w-full">
                  <FileBarChart className="h-4 w-4 mr-2" /> Ver Presupuestos
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/facturas" className="w-full">
                  <FileText className="h-4 w-4 mr-2" /> Ver Facturas
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Acciones Rápidas */}
        <Card className="border shadow-sm">
          <CardHeader className="bg-blue-50 dark:bg-blue-400/10 border-b">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="h-5 w-5" /> Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-3">
              <Button asChild>
                <Link href="/dashboard/presupuestos-finales/nuevo">
                  Aprobar Presupuesto
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/facturas/nueva">
                  Generar Factura
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/liquidaciones/nueva">
                  Crear Liquidación
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/pagos/nuevo">
                  Registrar Pago
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas y Notificaciones */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Alertas y Notificaciones</h2>
        {financialStats?.facturas_pendientes > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Facturas pendientes</AlertTitle>
            <AlertDescription>
              Hay {financialStats.facturas_pendientes} facturas pendientes que requieren atención.
              <Link href="/dashboard/facturas" className="ml-2 underline">Ver facturas</Link>
            </AlertDescription>
          </Alert>
        )}
        {financialStats?.liquidaciones_pendientes > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Liquidaciones por procesar</AlertTitle>
            <AlertDescription>
              Hay {financialStats.liquidaciones_pendientes} liquidaciones pendientes que requieren revisión.
              <Link href="/dashboard/liquidaciones" className="ml-2 underline">Ver liquidaciones</Link>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Tareas recientes */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Tareas Recientes</h2>
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
                  <th className="px-4 py-2 text-left font-medium">Fecha</th>
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
                      <td className="px-4 py-2">{formatDate(task.created_at)}</td>
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
