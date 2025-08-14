"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Clock } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(date)
  const [timeValue, setTimeValue] = React.useState<string>(
    date ? format(date, "HH:mm") : ""
  )

  // Sincronizar estado cuando cambia la prop date
  React.useEffect(() => {
    setSelectedDate(date)
    setTimeValue(date ? format(date, "HH:mm") : "")
  }, [date])

  // Manejar cambio de fecha en el calendario
  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      setSelectedDate(null)
      onDateChange(null)
      return
    }

    // Mantener la hora anterior si existía
    if (selectedDate && timeValue) {
      const [hours, minutes] = timeValue.split(":").map(Number)
      newDate.setHours(hours || 0, minutes || 0)
    } else {
      // Hora predeterminada para nuevas selecciones: 9:00
      newDate.setHours(9, 0, 0, 0)
      setTimeValue("09:00")
    }

    setSelectedDate(newDate)
    onDateChange(newDate)
  }

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
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, "PPP, HH:mm", { locale: es })
          ) : (
            <span>Seleccionar fecha y hora</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4" />
            <Input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="w-32"
              disabled={!selectedDate || disabled}
            />
          </div>
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={(date) => handleDateSelect(date)}
            initialFocus
            disabled={disabled}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
