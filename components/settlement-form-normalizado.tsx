"use client"

import type React from "react"

import { useState } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, AlertTriangle } from "lucide-react"

interface Factura {
  id: number
  total: number
  id_presupuesto_final: number
  presupuesto_final: {
    id: number
    code: string
    materiales: number
    mano_obra: number
    total: number
    total_base: number
    ajuste_admin: number
    id_presupuesto_base: number
    presupuesto_base: {
      id: number
      code: string
      materiales: number
      mano_obra: number
      total: number
      id_tarea: number
      tarea: {
        id: number
        titulo: string
        code: string
      }
    }
  }
}

interface SettlementFormNormalizadoProps {
  factura: Factura
  userRole: string
}

export function SettlementFormNormalizado({ factura, userRole }: SettlementFormNormalizadoProps) {
  // Extraer datos para facilitar el acceso
  const presupuestoFinal = factura.presupuesto_final
  const presupuestoBase = presupuestoFinal.presupuesto_base
  const tarea = presupuestoBase.tarea

  // Valores iniciales
  const [gastosReales, setGastosReales] = useState(
    Math.round(presupuestoBase.total * 0.8), // Estimación inicial del 80%
  )
  const [porcentajeDistribucion, setPorcentajeDistribucion] = useState(50) // Porcentaje para el supervisor
  const [observaciones, setObservaciones] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { supabase } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  // Calcular ganancias según la lógica de negocio
  const haySobrecosto = gastosReales > presupuestoBase.total
  const montoSobrecosto = haySobrecosto ? gastosReales - presupuestoBase.total : 0
  const sobrecostoSupervisor = Math.round(montoSobrecosto / 2)
  const sobrecostoAdmin = montoSobrecosto - sobrecostoSupervisor

  // Calcular ganancias considerando sobrecostos
  const gananciaNeta = haySobrecosto ? 0 : presupuestoBase.total - gastosReales
  const gananciaSupervisor = haySobrecosto
    ? Math.max(0, Math.round((presupuestoBase.total * porcentajeDistribucion) / 100) - sobrecostoSupervisor)
    : Math.round((gananciaNeta * porcentajeDistribucion) / 100)
  const gananciaAdmin = haySobrecosto
    ? Math.max(
        0,
        Math.round((presupuestoBase.total * (100 - porcentajeDistribucion)) / 100) -
          sobrecostoAdmin +
          presupuestoFinal.ajuste_admin,
      )
    : Math.round((gananciaNeta * (100 - porcentajeDistribucion)) / 100) + presupuestoFinal.ajuste_admin

  // Validar que solo los administradores puedan crear liquidaciones
  if (userRole !== "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acceso Denegado</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Solo los administradores pueden crear liquidaciones.</p>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (gastosReales <= 0) {
      toast({
        title: "Error",
        description: "Los gastos reales deben ser mayores a cero",
        variant: "destructive",
      })
      return
    }

    if (gastosReales > presupuestoBase.total) {
      toast({
        title: "Error",
        description: "Los gastos reales no pueden ser mayores al presupuesto base",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Crear liquidación con la nueva estructura normalizada
      const { data: liquidacion, error } = await supabase
        .from("liquidaciones_nuevas")
        .insert({
          id_tarea: tarea.id,
          id_presupuesto_base: presupuestoBase.id,
          id_presupuesto_final: presupuestoFinal.id,
          id_factura: factura.id,
          gastos_reales: gastosReales,
          total_base: presupuestoBase.total,
          ganancia_neta: gananciaNeta,
          porcentaje_distribucion: porcentajeDistribucion,
          ganancia_supervisor: gananciaSupervisor,
          ajuste_admin: presupuestoFinal.ajuste_admin,
          ganancia_admin: gananciaAdmin,
          observaciones: observaciones,
          // Nuevos campos de sobrecosto
          sobrecosto: haySobrecosto,
          monto_sobrecosto: montoSobrecosto,
          sobrecosto_supervisor: sobrecostoSupervisor,
          sobrecosto_admin: sobrecostoAdmin,
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: "Liquidación creada",
        description: "La liquidación ha sido creada correctamente",
      })

      router.push(`/dashboard/liquidaciones/${liquidacion.id}`)
    } catch (error: any) {
      console.error("Error al crear liquidación:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la liquidación",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información de la Liquidación</CardTitle>
            <p className="text-sm text-muted-foreground">Liquidación basada en el Presupuesto Base (no en el Final)</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tarea</Label>
              <div className="p-2 border rounded-md">
                <p className="font-medium">
                  {tarea.code} - {tarea.titulo}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Presupuesto Base (Referencia)</Label>
                <div className="p-2 border rounded-md bg-blue-50">
                  <p className="text-lg font-medium">${presupuestoBase.total.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Mat: ${presupuestoBase.materiales.toLocaleString()} + MO: $
                    {presupuestoBase.mano_obra.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Presupuesto Final</Label>
                <div className="p-2 border rounded-md">
                  <p className="text-lg font-medium">${presupuestoFinal.total.toLocaleString()}</p>
                  <p className="text-xs text-green-600">
                    Ajuste Admin: ${presupuestoFinal.ajuste_admin.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gastosReales">Gastos Reales *</Label>
              <Input
                id="gastosReales"
                type="number"
                min="1"
                max={presupuestoBase.total}
                value={gastosReales}
                onChange={(e) => setGastosReales(Number(e.target.value))}
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-muted-foreground">
                Solo materiales + trabajador (no incluye supervisor/admin)
              </p>
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
                disabled={isSubmitting}
              />
              <div className="flex justify-between text-sm">
                <span>{porcentajeDistribucion}%</span>
                <span>{100 - porcentajeDistribucion}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                disabled={isSubmitting}
                rows={3}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Crear Liquidación
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen Financiero</CardTitle>
            <p className="text-sm text-muted-foreground">Cálculo según tu lógica de negocio</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-md">
              <h3 className="text-sm font-medium mb-1">Base para Liquidación</h3>
              <p className="text-lg font-bold">${presupuestoBase.total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Presupuesto Base (no el Final)</p>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-1">Gastos Reales</h3>
              <p className="text-lg">${gastosReales.toLocaleString()}</p>
            </div>

            <div className="pt-2 border-t">
              <h3 className="text-sm font-medium mb-1">Ganancia Neta</h3>
              <p className="text-lg font-bold text-green-600">${gananciaNeta.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                Presupuesto Base - Gastos Reales = ${presupuestoBase.total.toLocaleString()} - $
                {gastosReales.toLocaleString()}
              </p>
            </div>

            {haySobrecosto && (
              <div className="bg-red-50 p-3 rounded-md border border-red-200 mt-2">
                <h3 className="text-sm font-medium mb-1 flex items-center text-red-700">
                  <AlertTriangle className="h-4 w-4 mr-1" /> Sobrecosto Detectado
                </h3>
                <p className="text-sm">
                  Los gastos reales superan el presupuesto base por ${montoSobrecosto.toLocaleString()}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="p-2 bg-red-100 rounded">
                    <p className="text-xs text-red-700">Impacto Supervisor</p>
                    <p className="font-medium">-${sobrecostoSupervisor.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded">
                    <p className="text-xs text-red-700">Impacto Admin</p>
                    <p className="font-medium">-${sobrecostoAdmin.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 border-t">
              <h3 className="text-sm font-medium mb-1">Rentabilidad</h3>
              <p className="text-lg">
                {gananciaNeta > 0 && gastosReales > 0 ? ((gananciaNeta / gastosReales) * 100).toFixed(2) : "0.00"}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
