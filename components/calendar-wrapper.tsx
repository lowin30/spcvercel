"use client"
import React from "react"
import "@/styles/calendar-mobile.css"

// La importación dinámica permite aislar las advertencias y problemas de JSX transform
// al cargar el componente solo cuando es necesario
const CalendarView = React.lazy(() => import("./calendar-view"))

// Este componente envuelve el calendario real y maneja la carga condicional
export default function CalendarWrapper(props: any) {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center w-full h-64">Cargando calendario...</div>}>
      <CalendarView {...props} />
    </React.Suspense>
  )
}
