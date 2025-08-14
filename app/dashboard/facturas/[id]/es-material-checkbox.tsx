"use client"

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { updateItemEsMaterial } from '../actions'
import { useToast } from '@/components/ui/use-toast'

interface EsMaterialCheckboxProps {
  itemId: number
  initialValue: boolean
}

export function EsMaterialCheckbox({ itemId, initialValue }: EsMaterialCheckboxProps) {
  const [esMaterial, setEsMaterial] = useState(initialValue)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleChange = async () => {
    setIsLoading(true)
    try {
      const newValue = !esMaterial
      const result = await updateItemEsMaterial(itemId, newValue)
      
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
    <div className="flex items-center space-x-2">
      <Checkbox 
        id={`es-material-${itemId}`}
        checked={esMaterial}
        onCheckedChange={handleChange}
        disabled={isLoading}
      />
    </div>
  )
}
