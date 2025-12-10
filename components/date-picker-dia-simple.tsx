"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DatePickerDiaSimpleProps {
  date: Date | null
  onDateChange: (date: Date | null) => void
  disabled?: boolean
}

export function DatePickerDiaSimple({ 
  date, 
  onDateChange, 
  disabled = false 
}: DatePickerDiaSimpleProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date || undefined)

  // Sincronizar estado cuando cambia la prop date
  React.useEffect(() => {
    setSelectedDate(date || undefined)
  }, [date])

  // Manejar cambio de fecha
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    
    if (!newValue) {
      setSelectedDate(undefined)
      onDateChange(null)
      return
    }

    // Crear fecha con hora fija 09:00:00 (para compatibilidad con el backend)
    const newDate = new Date(newValue + "T09:00:00")
    setSelectedDate(newDate)
    onDateChange(newDate)
  }

  // Formatear fecha para el input date (YYYY-MM-DD)
  const getInputValue = () => {
    if (!selectedDate) return ""
    const year = selectedDate.getFullYear()
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const day = String(selectedDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <input
        type="date"
        value={getInputValue()}
        onChange={handleDateChange}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selectedDate && "text-muted-foreground"
        )}
      />
    </div>
  )
}
