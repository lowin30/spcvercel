"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Lock, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { convertirPresupuestoADosFacturas, desaprobarPresupuesto } from "@/app/dashboard/presupuestos-finales/actions-factura"

interface AprobadoCheckboxProps {
  presupuestoId: number
  initialValue?: boolean
  estadoCodigo?: string  // codigo del estado actual del PF (ej: 'facturado', 'aceptado', 'borrador')
  className?: string
  disabled?: boolean
}

export function AprobadoCheckbox({ presupuestoId, initialValue = false, estadoCodigo, className = "", disabled = false }: AprobadoCheckboxProps) {
  const [checked, setChecked] = useState<boolean>(initialValue)
  const [loading, setLoading] = useState<boolean>(false)

  // Si el PF ya esta facturado, el checkbox es de solo lectura
  const estaFacturado = estadoCodigo === 'facturado'

  useEffect(() => {
    setChecked(initialValue)
  }, [initialValue])

  const handleChange = async (checked: boolean) => {
    if (estaFacturado) return // guard UI adicional

    if (!checked) {
      if (!window.confirm("¿Estás seguro que deseas desaprobar este presupuesto? Esto cambiará el estado a 'Aceptado'.")) {
        return
      }

      setLoading(true)
      try {
        const result = await desaprobarPresupuesto(presupuestoId)
        
        if (result.success) {
          toast.success(result.message || "Presupuesto desaprobado correctamente")
          setChecked(false)
          setTimeout(() => { window.location.reload() }, 1500)
        } else {
          toast.error(result.message || "Error al desaprobar el presupuesto")
          setChecked(initialValue)
        }
      } catch (error: any) {
        console.error("Error al desaprobar:", error)
        toast.error(`Error: ${error.message || "Error desconocido"}`)
        setChecked(initialValue)
      } finally {
        setLoading(false)
      }
      return
    }

    if (!window.confirm("¿Estás seguro que deseas aprobar este presupuesto y crear las facturas correspondientes? Esta acción creará dos facturas: una para ítems regulares y otra para materiales.")) {
      return
    }

    setLoading(true)
    try {
      const result = await convertirPresupuestoADosFacturas(presupuestoId)
      
      if (result.success) {
        toast.success(result.message || "Facturas creadas con éxito")
        setChecked(true)
        setTimeout(() => { window.location.href = "/dashboard/facturas" }, 2000)
      } else {
        toast.error(result.message || "Error al crear las facturas")
        setChecked(initialValue)
      }
    } catch (error: any) {
      console.error("Error al procesar la aprobación:", error)
      toast.error(`Error: ${error.message || "Error desconocido"}`)
      setChecked(initialValue)
    } finally {
      setLoading(false)
    }
  }

  // Si ya esta facturado: mostrar estado bloqueado, no el checkbox interactivo
  if (estaFacturado) {
    return (
      <div className="flex items-center space-x-2 opacity-60 cursor-not-allowed" title="Este presupuesto ya fue facturado">
        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Facturado</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Checkbox
          id={`aprobado-${presupuestoId}`}
          className={className}
          checked={checked}
          onCheckedChange={handleChange}
          disabled={disabled || loading}
        />
      )}
      <label
        htmlFor={`aprobado-${presupuestoId}`}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
      >
        {loading ? "Procesando..." : "Aprobar y Facturar"}
      </label>
    </div>
  )
}
