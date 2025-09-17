"use client"

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { updateItemEsMaterial } from '../../actions'
import { useToast } from '@/components/ui/use-toast'

interface EsMaterialCheckboxProps {
  itemId: number
  initialValue: boolean | null | undefined
  presupuestoId: number
}

export function EsMaterialCheckbox({ itemId, initialValue, presupuestoId }: EsMaterialCheckboxProps) {
  const [esMaterial, setEsMaterial] = useState(!!initialValue)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleChange = async () => {
    setIsLoading(true)
    try {
      const newValue = !esMaterial
      const result = await updateItemEsMaterial(itemId, newValue, presupuestoId)
      
      if (result.success) {
        setEsMaterial(newValue)
        toast({
          title: "Actualizado",
          description: result.message,
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar el ítem",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center space-x-2 es-material-checkbox">
      <Checkbox 
        id={`es-material-${itemId}`}
        checked={esMaterial}
        onCheckedChange={handleChange}
        disabled={isLoading}
      />
      <label 
        htmlFor={`es-material-${itemId}`}
        className="text-sm cursor-pointer"
      >
        <span className="hidden sm:inline">Material</span>
        <span className="inline sm:hidden">Mat.</span>
      </label>
    </div>
  )
}
