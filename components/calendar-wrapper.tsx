"use client"
import React, { useEffect } from "react"
import "react-big-calendar/lib/css/react-big-calendar.css"
import "@/styles/calendar-mobile.css"

// La importación dinámica permite aislar las advertencias y problemas de JSX transform
// al cargar el componente solo cuando es necesario
const CalendarView = React.lazy(() => import("./calendar-view"))

// Este componente envuelve el calendario real y maneja la carga condicional
export default function CalendarWrapper(props: any) {
  // Silenciamos advertencias específicas mientras el componente está montado
  useEffect(() => {
    // Guardamos la referencia al console.warn original
    const originalWarn = console.warn
    
    // Reemplazamos temporalmente console.warn con nuestra versión filtrada
    console.warn = function filteredWarn(message: any, ...args: any[]) {
      // Si el mensaje incluye la advertencia de JSX, la suprimimos
      if (typeof message === "string" && 
          (message.includes("outdated JSX transform") || 
           message.includes("using an outdated JSX transform"))) {
        return
      }
      // Para cualquier otra advertencia, usamos el comportamiento normal
      return originalWarn.apply(console, [message, ...args])
    }
    
    // Restauramos el console.warn original cuando el componente se desmonta
    return () => {
      console.warn = originalWarn
    }
  }, [])
  
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center w-full h-64">Cargando calendario...</div>}>
      <CalendarView {...props} />
    </React.Suspense>
  )
}
