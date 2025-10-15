"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { convertirPresupuestoADosFacturas, desaprobarPresupuesto } from "../../actions-factura"

interface AprobadoCheckboxProps {
  presupuestoId: number
  initialValue?: boolean
  className?: string
  disabled?: boolean
}

export function AprobadoCheckbox({ presupuestoId, initialValue = false, className = "", disabled = false }: AprobadoCheckboxProps) {
  const [checked, setChecked] = useState<boolean>(initialValue)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    setChecked(initialValue)
  }, [initialValue])

  const handleChange = async (checked: boolean) => {
    if (!checked) {
      // Si se está desmarcando, intentar desaprobar
      if (!window.confirm("¿Estás seguro que deseas desaprobar este presupuesto? Esto cambiará el estado a 'Presupuestado'.")) {
        return
      }

      setLoading(true)
      try {
        const result = await desaprobarPresupuesto(presupuestoId)
        
        if (result.success) {
          toast.success(result.message || "Presupuesto desaprobado correctamente")
          setChecked(false)
          
          // Recargar la página después de un breve retraso
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        } else {
          toast.error(result.message || "Error al desaprobar el presupuesto")
          setChecked(initialValue) // Revertir al valor original
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

    // Confirmación antes de proceder
    if (!window.confirm("¿Estás seguro que deseas aprobar este presupuesto y crear las facturas correspondientes? Esta acción creará dos facturas: una para ítems regulares y otra para materiales.")) {
      return
    }

    setLoading(true)
    try {
      const result = await convertirPresupuestoADosFacturas(presupuestoId)
      
      if (result.success) {
        toast.success(result.message || "Facturas creadas con éxito")
        setChecked(true)
        
        // Después de un breve retraso, redirigir a la página de facturas
        setTimeout(() => {
          window.location.href = "/dashboard/facturas"
        }, 2000)
      } else {
        toast.error(result.message || "Error al crear las facturas")
        setChecked(initialValue) // Revertir al valor original
      }
    } catch (error: any) {
      console.error("Error al procesar la aprobación:", error)
      toast.error(`Error: ${error.message || "Error desconocido"}`)
      setChecked(initialValue) // Revertir al valor original
    } finally {
      setLoading(false)
    }
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
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {loading ? "Procesando..." : "Aprobado"}
      </label>
    </div>
  )
}
