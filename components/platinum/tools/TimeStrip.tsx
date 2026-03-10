"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Info, ArrowUpCircle } from "lucide-react"
import { format, subDays, isSameDay } from "date-fns"
import { es } from "date-fns/locale"

export interface DailyOcupation {
    dateStr: string
    localOcupation: number // En esta tarea (0, 0.5, 1)
    globalOcupation: number // En todas las tareas hoy (0, 0.5, 1, o +)
}

interface DayStatus {
    date: Date
    dateStr: string
    isFullyBlocked: boolean
    isPartiallyBlocked: boolean
    isUpgradeableHere: boolean
    isSelected: boolean
    isToday: boolean
}

interface TimeStripProps {
    selectedDates: string[]
    ocupationData: DailyOcupation[] // Nivel de ocupación calculado en el padre
    onChange: (dates: string[]) => void
    daysToShow?: number
}

export function TimeStrip({ 
    selectedDates, 
    ocupationData, 
    onChange, 
    daysToShow = 8 
}: TimeStripProps) {
    
    const days: DayStatus[] = React.useMemo(() => {
        const today = new Date()
        return Array.from({ length: daysToShow }).map((_, i) => {
            const d = subDays(today, i)
            const dStr = format(d, 'yyyy-MM-dd')
            
            // Buscar la ocupación calculada para esta fecha
            const ocupation = ocupationData.find(o => o.dateStr === dStr)
            const gOcup = ocupation?.globalOcupation || 0
            const lOcup = ocupation?.localOcupation || 0

            return {
                date: d,
                dateStr: dStr,
                // Bloqueado solo si en TODO el sistema tiene >= 1 día completo
                isFullyBlocked: gOcup >= 1.0 && lOcup < 1.0 || (lOcup >= 1.0),
                // Parcialmente bloqueado si globalmente tiene 0.5 pero localmente 0
                isPartiallyBlocked: gOcup >= 0.5 && gOcup < 1.0 && lOcup === 0,
                // Upgradeable si localmente tiene 0.5 (así esté bloqueado globalmente)
                isUpgradeableHere: lOcup > 0 && lOcup < 1.0,
                isSelected: selectedDates.includes(dStr),
                isToday: i === 0
            }
        }).reverse() // De más antiguo a más nuevo (hoy al final)
    }, [selectedDates, ocupationData, daysToShow])

    const toggleDate = (day: DayStatus) => {
        // Bloquear click si ya está completamente bloqueado sin chance de upgrade
        if (day.isFullyBlocked && !day.isUpgradeableHere) return 
        
        if (selectedDates.includes(day.dateStr)) {
            onChange(selectedDates.filter(d => d !== day.dateStr))
        } else {
            onChange([...selectedDates, day.dateStr])
        }
    }

    return (
        <div className="w-full overflow-x-auto no-scrollbar py-2 -mx-1 px-1">
            <div className="flex gap-2 min-w-max pb-1">
                {days.map((day) => {
                    // Determinar el Theme de cada pastilla de tiempo (Optimizados para Dark Mode)
                    let bgClass = 'bg-card border-border/40 hover:border-primary/40' // Libre
                    let textClass = 'text-foreground'
                    let dayTextClass = 'text-muted-foreground'
                    
                    if (day.isSelected) {
                        bgClass = 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/25'
                        textClass = 'text-primary-foreground'
                        dayTextClass = 'text-primary-foreground/80'
                    } else if (day.isUpgradeableHere) {
                        bgClass = 'bg-blue-500/10 border-blue-500/30 dark:bg-blue-500/20' // Celeste Pálido
                        textClass = 'text-blue-700 dark:text-blue-400'
                        dayTextClass = 'text-blue-600/70 dark:text-blue-400/70'
                    } else if (day.isFullyBlocked) {
                        bgClass = 'bg-muted/50 border-transparent opacity-50 cursor-not-allowed' // Gris Plomo
                        textClass = 'text-muted-foreground'
                        dayTextClass = 'text-muted-foreground/60'
                    } else if (day.isPartiallyBlocked) {
                        bgClass = 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-500/20' // Ámbar Palido
                        textClass = 'text-amber-700 dark:text-amber-400'
                        dayTextClass = 'text-amber-600/70 dark:text-amber-400/70'
                    }

                    return (
                        <motion.button
                            key={day.dateStr}
                            whileTap={day.isFullyBlocked && !day.isUpgradeableHere ? {} : { scale: 0.92 }}
                            onClick={() => toggleDate(day)}
                            className={`relative flex flex-col items-center justify-center w-[52px] h-[64px] rounded-2xl border-2 transition-all overflow-hidden ${bgClass}`}
                        >
                            <span className={`text-[9px] font-black uppercase tracking-tighter ${dayTextClass}`}>
                                {format(day.date, 'EEE', { locale: es })}
                            </span>
                            <span className={`text-lg font-black leading-none mt-1 ${textClass}`}>
                                {format(day.date, 'd')}
                            </span>
                            
                            {/* Iconografía Dinámica */}
                            <div className="absolute top-1 right-1">
                               {day.isFullyBlocked && !day.isUpgradeableHere && <Check className="w-2.5 h-2.5 text-emerald-500/60 dark:text-emerald-400/60" />}
                               {day.isUpgradeableHere && <ArrowUpCircle className="w-3 h-3 text-blue-500/70 dark:text-blue-400/80" />}
                               {day.isPartiallyBlocked && <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60 dark:bg-amber-400/60" />}
                            </div>

                            {day.isToday && !day.isSelected && !day.isFullyBlocked && !day.isPartiallyBlocked && !day.isUpgradeableHere && (
                                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
                            )}
                            
                            {/* Fill Bottom Line indicator */}
                            {day.isUpgradeableHere && !day.isSelected && (
                                <div className="absolute inset-x-0 bottom-1 flex justify-center">
                                    <div className="w-4 h-0.5 rounded-full bg-blue-500/40 dark:bg-blue-400/50" />
                                </div>
                            )}
                        </motion.button>
                    )
                })}
            </div>
            
            <div className="mt-2 flex items-center gap-2 px-1">
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    {selectedDates.length > 0 
                        ? `${selectedDates.length} días seleccionados` 
                        : 'Elige los días a registrar'}
                 </p>
                 <div className="flex gap-2 ml-auto">
                     <span className="w-2 h-2 rounded-full bg-amber-500/50 mt-1" title="0.5 en otro sitio" />
                     <span className="w-2 h-2 rounded-full bg-blue-500/50 mt-1" title="Actualizable aquí" />
                 </div>
            </div>
        </div>
    )
}
