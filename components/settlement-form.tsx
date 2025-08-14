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
import { Loader2 } from "lucide-react"

interface Factura {
  id: number
  total: number
  presupuestos: {
    id: number
    materiales: number
    mano_obra: number
    tipo: string
    id_padre?: number
    tareas: {
      id: number
      titulo: string
      code: string
    }
  }
}

interface PresupuestoBase {
  id: number
  materiales: number
  mano_obra: number
  id_cliente: number // Propiedad añadida para consistencia de tipos
}

interface SettlementFormProps {
  factura: Factura
  presupuestoBase: PresupuestoBase // This object is from 'presupuestos' table, type 'base'
  idTarea: number
}

export function SettlementForm({ factura, presupuestoBase, idTarea }: SettlementFormProps) {
  // Calcular totales según tu lógica de negocio
  const totalPresupuestoBase = presupuestoBase.materiales + presupuestoBase.mano_obra
  const totalPresupuestoFinal = factura.presupuestos.materiales + factura.presupuestos.mano_obra
  const ajusteAdmin = totalPresupuestoFinal - totalPresupuestoBase

  const [gastosReales, setGastosReales] = useState(
    Math.round(totalPresupuestoBase * 0.8), // Estimación inicial del 80%
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { supabase } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  // Calcular ganancias según tu lógica de negocio (moved inside useEffect or calculated dynamically as gastosReales changes)
  // These will be recalculated before submit based on the final gastosReales
  let gananciaNeta = totalPresupuestoBase - gastosReales
  let gananciaSupervisor = Math.round(gananciaNeta / 2) // 50% para supervisor
  let gananciaAdmin = Math.round(gananciaNeta / 2) + ajusteAdmin // 50% + ajuste para admin

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

    if (gastosReales > totalPresupuestoBase) {
      toast({
        title: "Error",
        description: "Los gastos reales no pueden ser mayores al presupuesto base",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Recalculate gains just before submission with the final gastosReales value
      const currentGananciaNeta = totalPresupuestoBase - gastosReales;
      const currentGananciaSupervisor = Math.round(currentGananciaNeta / 2);
      const currentGananciaAdmin = Math.round(currentGananciaNeta / 2) + ajusteAdmin;

      // 1. Fetch the actual ID from 'presupuestos_base' table for the given task
      const { data: pbData, error: pbError } = await supabase
        .from("presupuestos_base")
        .select("id")
        .eq("id_tarea", idTarea)
        .single();

      if (pbError || !pbData) {
        console.error("Error fetching presupuestos_base ID:", pbError);
        toast({
          title: "Error de datos",
          description: "No se pudo encontrar el presupuesto base específico para la tarea.",
          variant: "destructive",
        });
        return;
      }
      const actualIdPresupuestoBase = pbData.id;

      // 2. Fetch the actual ID from 'presupuestos_finales' table
      const { data: pfData, error: pfError } = await supabase
        .from("presupuestos_finales")
        .select("id")
        .eq("id_presupuesto_base", actualIdPresupuestoBase) // Assumes one final per base, or further filtering might be needed
        .single();

      if (pfError || !pfData) {
        console.error("Error fetching presupuestos_finales ID:", pfError);
        toast({
          title: "Error de datos",
          description: "No se pudo encontrar el presupuesto final específico para la tarea.",
          variant: "destructive",
        });
        return;
      }
      const actualIdPresupuestoFinal = pfData.id;

      // 3. Fetch the assigned supervisor's ID for the task
      const { data: supData, error: supError } = await supabase
        .from("supervisores_tareas")
        .select("id_supervisor")
        .eq("id_tarea", idTarea)
        .single();

      if (supError || !supData) {
        console.error("Error fetching supervisor ID:", supError);
        toast({
          title: "Error de datos",
          description: "No se pudo encontrar el supervisor asignado a la tarea.",
          variant: "destructive",
        });
        return;
      }
      const idSupervisorAsignado = supData.id_supervisor;

      // 4. Insert into 'liquidaciones_nuevas'
      const { data: liquidacion, error } = await supabase
        .from("liquidaciones_nuevas") // Changed table name
        .insert({
          id_tarea: idTarea,
          id_presupuesto_base: actualIdPresupuestoBase,      // FK to presupuestos_base.id
          id_presupuesto_final: actualIdPresupuestoFinal,    // FK to presupuestos_finales.id
          id_factura: factura.id,                          // FK to facturas.id
          gastos_reales: gastosReales,
          ganancia_supervisor: currentGananciaSupervisor,
          ganancia_admin: currentGananciaAdmin,
          id_supervisor: idSupervisorAsignado,             // FK to usuarios.id (supervisor)
          // estado: 'pendiente', // Consider adding a default state if applicable
        })
        .select("id") // Only select id, or whatever is needed for the redirect
        .single();

      if (error) {
        console.error("Error al crear liquidación nueva:", error);
        throw new Error(error.message);
      }

      toast({
        title: "Liquidación (Nueva) Creada",
        description: "La liquidación ha sido creada correctamente en el nuevo sistema.",
      });

      // Assuming the detail page for new liquidations might be the same or similar path
      router.push(`/dashboard/liquidaciones/${liquidacion.id}`); 
    } catch (error) {
      console.error("Error al crear liquidación:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la liquidación",
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
                  {factura.presupuestos.tareas.code} - {factura.presupuestos.tareas.titulo}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Presupuesto Base (Referencia)</Label>
                <div className="p-2 border rounded-md bg-blue-50">
                  <p className="text-lg font-medium">${totalPresupuestoBase.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Mat: ${presupuestoBase.materiales.toLocaleString()} + MO: $
                    {presupuestoBase.mano_obra.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Presupuesto Final</Label>
                <div className="p-2 border rounded-md">
                  <p className="text-lg font-medium">${totalPresupuestoFinal.toLocaleString()}</p>
                  <p className="text-xs text-green-600">Ajuste Admin: ${ajusteAdmin.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gastosReales">Gastos Reales *</Label>
              <Input
                id="gastosReales"
                type="number"
                min="1"
                max={totalPresupuestoBase}
                value={gastosReales}
                onChange={(e) => setGastosReales(Number(e.target.value))}
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-muted-foreground">
                Solo materiales + trabajador (no incluye supervisor/admin)
              </p>
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
              <p className="text-lg font-bold">${totalPresupuestoBase.toLocaleString()}</p>
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
                Presupuesto Base - Gastos Reales = ${totalPresupuestoBase.toLocaleString()} - $
                {gastosReales.toLocaleString()}
              </p>
            </div>

            <div className="pt-2 border-t">
              <h3 className="text-sm font-medium mb-1">Distribución Final</h3>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-orange-50 p-2 rounded">
                  <p className="text-xs text-muted-foreground">Supervisor (50%)</p>
                  <p className="font-medium">${gananciaSupervisor.toLocaleString()}</p>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <p className="text-xs text-muted-foreground">Admin (50% + ajuste)</p>
                  <p className="font-medium">${gananciaAdmin.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    ${Math.round(gananciaNeta / 2).toLocaleString()} + ${ajusteAdmin.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

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
