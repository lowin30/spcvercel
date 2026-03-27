"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { updateItemDetails } from "@/app/dashboard/facturas/actions"
import { useToast } from "@/hooks/use-toast"
import { Check, X, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EditableItemFieldProps {
  itemId: number
  field: "descripcion" | "cantidad" | "precio_unitario"
  initialValue: string | number
  type?: "text" | "number"
  className?: string
  formatValue?: (v: any) => string
}

export function EditableItemField({ itemId, field, initialValue, type = "text", className, formatValue }: EditableItemFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    if (value === initialValue) {
      setIsEditing(false)
      return
    }

    setLoading(true)
    try {
      const res = await updateItemDetails(itemId, { [field]: type === "number" ? Number(value) : value })
      if (res.success) {
        toast({ title: "Ítem actualizado", description: "Se recalcularon los totales y ajustes" })
        setIsEditing(false)
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: "Error al guardar", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 min-w-[80px]">
        <Input
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={cn("h-8 py-1 px-2 text-sm", className)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") {
              setValue(initialValue)
              setIsEditing(false)
            }
          }}
          disabled={loading}
        />
        <div className="flex flex-col gap-0.5">
          <Button size="icon" variant="ghost" className="h-4 w-4 text-green-600 hover:bg-green-50" onClick={handleSave} disabled={loading}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-4 w-4 text-red-600 hover:bg-red-50" onClick={() => { setValue(initialValue); setIsEditing(false); }} disabled={loading}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="group flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1" 
      onClick={() => setIsEditing(true)}
    >
      <span className={cn("text-sm", className)}>
        {formatValue ? formatValue(value) : value}
      </span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  )
}
