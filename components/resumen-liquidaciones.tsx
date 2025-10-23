"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Receipt, CalendarDays, DollarSign, AlertCircle, TrendingUp } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface ResumenPorTarea {
  id_tarea: number
  titulo_tarea: string
  code_tarea: string
  gastos_monto: number
  gastos_count: number
  jornales_monto: number
  jornales_dias: number
  total_tarea: number
}

interface ResumenLiquidacionesProps {
  userId: string
  userRole: string
  gastosPendientes: { total: number; count: number }
  jornalesPendientes: { total: number; count: number; dias: number }
  ultimaLiquidacion?: { monto: number; fecha: string } | null
  desglosePorTarea?: ResumenPorTarea[]
}

export function ResumenLiquidaciones({
  gastosPendientes,
  jornalesPendientes,
  ultimaLiquidacion,
  desglosePorTarea = []
}: ResumenLiquidacionesProps) {
  
  const totalGeneral = gastosPendientes.total + jornalesPendientes.total
  const tieneAlertaPendiente = totalGeneral > 200000 // Más de $200k pendiente

  return (
    <div className="space-y-6">
      {/* Alerta si hay mucho pendiente */}
      {tieneAlertaPendiente && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <div>
              <p className="font-semibold text-orange-900">Monto alto pendiente de liquidación</p>
              <p className="text-sm text-orange-700">
                Tienes ${totalGeneral.toLocaleString('es-CL')} pendiente de cobrar. Considera solicitar liquidación.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de resumen */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card Gastos Pendientes */}
        <Card className="border-purple-200 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Pendientes</CardTitle>
            <Receipt className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              ${gastosPendientes.total.toLocaleString('es-CL')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {gastosPendientes.count} comprobante{gastosPendientes.count !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Card Jornales Pendientes */}
        <Card className="border-blue-200 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jornales Pendientes</CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              ${jornalesPendientes.total.toLocaleString('es-CL')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {jornalesPendientes.dias} día{jornalesPendientes.dias !== 1 ? 's' : ''} trabajado{jornalesPendientes.dias !== 1 ? 's' : ''} • {jornalesPendientes.count} parte{jornalesPendientes.count !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Card Total a Cobrar */}
        <Card className="border-green-200 hover:shadow-md transition-shadow bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Cobrar</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              ${totalGeneral.toLocaleString('es-CL')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gastos + Jornales
            </p>
          </CardContent>
        </Card>

        {/* Card Última Liquidación */}
        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Pago</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            {ultimaLiquidacion ? (
              <>
                <div className="text-2xl font-bold text-slate-700">
                  ${ultimaLiquidacion.monto.toLocaleString('es-CL')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(ultimaLiquidacion.fecha).toLocaleDateString('es-CL', { 
                    day: '2-digit', 
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-400">N/A</div>
                <p className="text-xs text-muted-foreground mt-1">Sin pagos registrados</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Desglose por Tarea */}
      {desglosePorTarea.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              📊 Desglose por Tarea
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Detalle de gastos y jornales pendientes por cada tarea
            </p>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {desglosePorTarea.map((tarea, index) => (
                <AccordionItem key={tarea.id_tarea} value={`tarea-${tarea.id_tarea}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {tarea.code_tarea}
                        </Badge>
                        <span className="font-medium text-left">{tarea.titulo_tarea}</span>
                      </div>
                      <div className="text-sm font-semibold text-primary">
                        ${tarea.total_tarea.toLocaleString('es-CL')}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-4 pr-4 pt-2 space-y-3">
                      {/* Gastos */}
                      {tarea.gastos_count > 0 && (
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-md border border-purple-100">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-900">Gastos</span>
                            <Badge variant="secondary" className="text-xs">
                              {tarea.gastos_count}
                            </Badge>
                          </div>
                          <span className="text-sm font-semibold text-purple-700">
                            ${tarea.gastos_monto.toLocaleString('es-CL')}
                          </span>
                        </div>
                      )}

                      {/* Jornales */}
                      {tarea.jornales_dias > 0 && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md border border-blue-100">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">Jornales</span>
                            <Badge variant="secondary" className="text-xs">
                              {tarea.jornales_dias} día{tarea.jornales_dias !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <span className="text-sm font-semibold text-blue-700">
                            ${tarea.jornales_monto.toLocaleString('es-CL')}
                          </span>
                        </div>
                      )}

                      {/* Total */}
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-md border border-green-200 mt-2">
                        <span className="text-sm font-semibold text-green-900">Total Tarea</span>
                        <span className="text-base font-bold text-green-700">
                          ${tarea.total_tarea.toLocaleString('es-CL')}
                        </span>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Mensaje si no hay nada pendiente */}
      {totalGeneral === 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-green-100 p-3">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900">¡Estás al día!</h3>
                <p className="text-sm text-green-700 mt-1">
                  No tienes gastos ni jornales pendientes de liquidar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
