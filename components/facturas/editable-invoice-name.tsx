"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { updateInvoiceName } from "@/app/dashboard/facturas/actions"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EditableInvoiceNameProps {
  id: number
  initialValue: string
}

export function EditableInvoiceName({ id, initialValue }: EditableInvoiceNameProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue || "")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    if (value === initialValue) {
      setIsEditing(false)
      return
    }

    setLoading(true)
    try {
      const res = await updateInvoiceName(id, value)
      if (res.success) {
        toast({ title: "Título actualizado", description: "Se guardó correctamente en la DB" })
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
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="text-lg sm:text-2xl font-bold h-10 py-1"
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
        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSave} disabled={loading}>
          <Check className="h-5 w-5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => { setValue(initialValue); setIsEditing(false); }} disabled={loading}>
          <X className="h-5 w-5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditing(true)}>
      <h1 className="text-lg sm:text-2xl font-bold tracking-tight">
        {value || "Sin título"}
      </h1>
      <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}
