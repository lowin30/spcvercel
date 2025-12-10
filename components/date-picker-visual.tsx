"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface DatePickerVisualProps {
  date: Date | null
  onDateChange: (date: Date | null) => void
  disabled?: boolean
}

export function DatePickerVisual({ 
  date, 
  onDateChange, 
  disabled = false 
}: DatePickerVisualProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(date || null)
  const [timeValue, setTimeValue] = React.useState<string>(
    date ? format(date, "HH:mm") : ""
  )

  // Sincronizar estado cuando cambia la prop date
  React.useEffect(() => {
    setSelectedDate(date || null)
    setTimeValue(date ? format(date, "HH:mm") : "")
  }, [date])

  // Manejar cambio de hora en el input
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTimeValue = e.target.value
    setTimeValue(newTimeValue)

    if (selectedDate && newTimeValue) {
      const [hours, minutes] = newTimeValue.split(":").map(Number)
      const newDate = new Date(selectedDate)
      newDate.setHours(hours || 0, minutes || 0)
      onDateChange(newDate)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-4 w-4" />
        <Input
          type="date"
          value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
          onChange={(e) => {
            const newDate = e.target.value ? new Date(e.target.value) : null
            if (newDate && timeValue) {
              const [hours, minutes] = timeValue.split(':').map(Number)
              newDate.setHours(hours || 0, minutes || 0)
            } else if (newDate) {
              newDate.setHours(9, 0, 0, 0) // Hora predeterminada
              setTimeValue('09:00')
            }
            setSelectedDate(newDate)
            onDateChange(newDate)
          }}
          className="w-full"
          disabled={disabled}
        />
      </div>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <Input
          type="time"
          value={timeValue}
          onChange={handleTimeChange}
          className="w-32"
          disabled={!selectedDate || disabled}
        />
      </div>
    </div>
  )
}
