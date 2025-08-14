"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"

interface Factura {
  id: number
  code: string
  total: number
  datos_afip: any
  administrador_facturador?: string
  presupuestos: {
    tareas: {
      titulo: string
      edificios: {
        nombre: string
      }
    }
  }
}

interface RegistrarPagoDialogProps {
  factura: Factura
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RegistrarPagoDialog({ factura, open, onOpenChange }: RegistrarPagoDialogProps) {
  const [modalidad, setModalidad] = useState<string>("total")
  const [montoCustom, setMontoCustom] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  const calcularMonto = () => {
    switch (modalidad) {
      case "total":
        return factura.total
      case "50_porciento":
        return Math.round(factura.total * 0.5)
      case "ajustable":
        return Number.parseInt(montoCustom) || 0
      default:
        return 0
    }
  }

  const handleSubmit = async () => {
    const monto = calcularMonto()

    if (monto <= 0) {
      toast({
        title: "Error",
        description: "El monto debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    if (monto > factura.total) {
      toast({
        title: "Error",
        description: "El monto no puede ser mayor al total de la factura",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Registrar el pago
      const { error: pagoError } = await supabase.from("pagos_facturas").insert({
        id_factura: factura.id,
        modalidad_pago: modalidad,
        monto_pagado: monto,
      })

      if (pagoError) throw pagoError

      // Si es pago total, actualizar estado de factura
      if (modalidad === "total") {
        const { error: facturaError } = await supabase
          .from("facturas")
          .update({ estado: "pagada" })
          .eq("id", factura.id)

        if (facturaError) throw facturaError
      }

      toast({
        title: "Pago registrado",
        description: `Pago de $${monto.toLocaleString()} registrado exitosamente`,
      })

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Error al registrar pago:", error)
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getDatoAfip = () => {
    if (factura.datos_afip?.numero) {
      const admin = factura.administrador_facturador || "Sin asignar"
      return `${factura.datos_afip.numero}-${admin}`
    }
    return "Sin dato AFIP"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>
            Factura {factura.code} - AFIP: {getDatoAfip()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm">
              <strong>Edificio:</strong> {factura.presupuestos?.tareas?.edificios?.nombre}
            </div>
            <div className="text-sm">
              <strong>Tarea:</strong> {factura.presupuestos?.tareas?.titulo}
            </div>
            <div className="text-lg font-semibold">
              <strong>Total Factura:</strong> ${factura.total.toLocaleString()}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Modalidad de Pago</Label>
            <RadioGroup value={modalidad} onValueChange={setModalidad}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="total" id="total" />
                <Label htmlFor="total">Total (${factura.total.toLocaleString()})</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="50_porciento" id="50_porciento" />
                <Label htmlFor="50_porciento">50% (${Math.round(factura.total * 0.5).toLocaleString()})</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ajustable" id="ajustable" />
                <Label htmlFor="ajustable">Monto Ajustable</Label>
              </div>
            </RadioGroup>

            {modalidad === "ajustable" && (
              <div className="space-y-2">
                <Label htmlFor="monto">Monto a Pagar</Label>
                <Input
                  id="monto"
                  type="number"
                  placeholder="Ingrese el monto"
                  value={montoCustom}
                  onChange={(e) => setMontoCustom(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">Monto a registrar: ${calcularMonto().toLocaleString()}</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || calcularMonto() <= 0}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
