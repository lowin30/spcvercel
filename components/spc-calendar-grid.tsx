"use client"

import React, { useState, useMemo } from "react"
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday
} from "date-fns"
import { es } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AgendaEvento } from "@/lib/tools/partes/types"

interface SpcCalendarGridProps {
    eventos: AgendaEvento[]
    onDayClick: (date: Date, events: AgendaEvento[]) => void
}

export default function SpcCalendarGrid({ eventos, onDayClick }: SpcCalendarGridProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())

    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 })
        const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
        return eachDayOfInterval({ start, end })
    }, [currentMonth])

    const getEventsForDay = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        return eventos.filter(e => e.fecha === dayStr)
    }

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    return (
        <div className="max-w-5xl mx-auto bg-background/50 backdrop-blur-sm rounded-3xl border border-border/50 shadow-2xl overflow-hidden">
            {/* Header del Calendario - Compacto */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-6 bg-gradient-to-b from-card to-transparent gap-4">
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent capitalize">
                        {format(currentMonth, 'MMMM', { locale: es })}
                    </h2>
                    <p className="text-[10px] sm:text-sm text-muted-foreground font-medium">
                        {format(currentMonth, 'yyyy')}
                    </p>
                </div>

                <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <Button variant="outline" size="icon" onClick={prevMonth} className="rounded-full hover:bg-violet-500/10 hover:text-violet-500 border-border/50">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())} className="rounded-full px-4 border-border/50">
                        Hoy
                    </Button>
                    <Button variant="outline" size="icon" onClick={nextMonth} className="rounded-full hover:bg-violet-500/10 hover:text-violet-500 border-border/50">
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Grid de Dias de la Semana */}
            <div className="grid grid-cols-7 border-b border-border/20">
                {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(day => (
                    <div key={day} className="py-2 text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        {day}
                    </div>
                ))}

            </div>

            {/* Grid de Celdas */}
            <div className="grid grid-cols-7">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentMonth.toISOString()}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="contents"
                    >
                        {days.map((day, idx) => {
                            const dayEvents = getEventsForDay(day)
                            const isCurrentMonth = isSameMonth(day, currentMonth)
                            const isHeute = isToday(day)

                            return (
                                <button
                                    key={day.toISOString()}
                                    onClick={() => onDayClick(day, dayEvents)}
                                    className={`
                                        relative group min-h-[42px] sm:min-h-[60px] p-0.5 sm:p-2 border-r border-b border-border/10
                                        transition-all duration-300 hover:bg-violet-500/5
                                        ${!isCurrentMonth ? 'bg-muted/5 opacity-30 shadow-inner' : ''}
                                        ${idx % 7 === 6 ? 'border-r-0' : ''}
                                    `}



                                >
                                    <div className="flex flex-col items-center justify-center w-full h-full gap-1">
                                        <span className={`
                                            text-xs sm:text-sm font-semibold w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-all
                                            ${isHeute ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 ring-2 ring-violet-600/20' : 'text-foreground/70'}
                                            ${!isCurrentMonth ? 'font-normal' : ''}
                                        `}>
                                            {format(day, 'd')}
                                        </span>

                                        {/* Indicadores de Actividad (Platinium Dots) - Centrados */}
                                        <div className="flex flex-wrap justify-center gap-0.5 sm:gap-1 max-w-full">
                                            {dayEvents.slice(0, 4).map((event, i) => (
                                                <Indicator key={i} tipo={event.tipo} />
                                            ))}
                                            {dayEvents.length > 4 && (
                                                <span className="text-[8px] sm:text-[10px] font-bold text-muted-foreground">
                                                    +{dayEvents.length - 4}
                                                </span>
                                            )}
                                        </div>
                                    </div>


                                    {/* Mobile detail indicator */}
                                    {dayEvents.length > 0 && (
                                        <div className="absolute bottom-1 right-1 sm:hidden">
                                            <div className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse" />
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}

function Indicator({ tipo }: { tipo: AgendaEvento['tipo'] }) {
    const colors = {
        visita: 'bg-blue-500 shadow-blue-500/50',
        proyectado: 'bg-violet-500 shadow-violet-500/50',
        confirmado: 'bg-violet-500 shadow-violet-500/50', // Unificamos a violeta (plan)
        gasto: 'bg-amber-500 shadow-amber-500/50'
    }

    return (
        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shadow-sm hover:scale-150 transition-transform ${colors[tipo]}`} />
    )

}
