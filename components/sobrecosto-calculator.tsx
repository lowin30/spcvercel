"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { AlertTriangle } from "lucide-react"

export function SobrecostoCalculator() {
  const [presupuestoBase, setPresupuestoBase] = useState(100000)
  const [gastosReales, setGastosReales] = useState(120000)
  const [porcentajeDistribucion, setPorcentajeDistribucion] = useState(50)

  const haySobrecosto = gastosReales > presupuestoBase
  const montoSobrecosto = haySobrecosto ? gastosReales - presupuestoBase : 0
  const sobrecostoSupervisor = Math.round(montoSobrecosto / 2)
  const sobrecostoAdmin = montoSobrecosto - sobrecostoSupervisor

  // Calcular ganancias considerando sobrecostos
  const gananciaNeta = haySobrecosto ? 0 : presupuestoBase - gastosReales
  const gananciaSupervisor = haySobrecosto
    ? Math.max(0, Math.round((presupuestoBase * porcentajeDistribucion) / 100) - sobrecostoSupervisor)
    : Math.round((gananciaNeta * porcentajeDistribucion) / 100)
  const gananciaAdmin = haySobrecosto
    ? Math.max(0, Math.round((presupuestoBase * (100 - porcentajeDistribucion)) / 100) - sobrecostoAdmin)
    : Math.round((gananciaNeta * (100 - porcentajeDistribucion)) / 100)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculadora de Sobrecostos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Presupuesto Base</Label>
          <Input type="number" value={presupuestoBase} onChange={(e) => setPresupuestoBase(Number(e.target.value))} />
        </div>

        <div className="space-y-2">
          <Label>Gastos Reales</Label>
          <Input type="number" value={gastosReales} onChange={(e) => setGastosReales(Number(e.target.value))} />
        </div>

        <div className="space-y-2">
          <Label>Distribución de Ganancias</Label>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Supervisor</span>
            <span>Administrador</span>
          </div>
          <Slider
            value={[porcentajeDistribucion]}
            onValueChange={(values) => setPorcentajeDistribucion(values[0])}
            min={0}
            max={100}
            step={5}
          />
          <div className="flex justify-between text-sm">
            <span>{porcentajeDistribucion}%</span>
            <span>{100 - porcentajeDistribucion}%</span>
          </div>
        </div>

        {/* Resultados */}
        {haySobrecosto ? (
          <div className="bg-red-50 p-3 rounded-md border border-red-200 mt-4">
            <h3 className="font-medium text-red-700 mb-1 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" /> Sobrecosto Detectado
            </h3>
            <p className="text-sm">Monto: ${montoSobrecosto.toLocaleString()}</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="p-2 bg-red-100 rounded">
                <p className="text-xs text-red-700">Supervisor ({porcentajeDistribucion}%)</p>
                <p className="font-medium">-${sobrecostoSupervisor.toLocaleString()}</p>
                <p className="text-xs mt-1">Ganancia final: ${gananciaSupervisor.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-red-100 rounded">
                <p className="text-xs text-red-700">Admin ({100 - porcentajeDistribucion}%)</p>
                <p className="font-medium">-${sobrecostoAdmin.toLocaleString()}</p>
                <p className="text-xs mt-1">Ganancia final: ${gananciaAdmin.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 p-3 rounded-md border border-green-200 mt-4">
            <h3 className="font-medium text-green-700 mb-1">No hay sobrecosto</h3>
            <p className="text-sm">Ganancia neta: ${gananciaNeta.toLocaleString()}</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="p-2 bg-green-100 rounded">
                <p className="text-xs text-green-700">Supervisor ({porcentajeDistribucion}%)</p>
                <p className="font-medium">${gananciaSupervisor.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-green-100 rounded">
                <p className="text-xs text-green-700">Admin ({100 - porcentajeDistribucion}%)</p>
                <p className="font-medium">${gananciaAdmin.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
