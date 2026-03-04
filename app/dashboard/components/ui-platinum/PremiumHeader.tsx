"use client"

import React from "react"
import { Wallet, TrendingUp, Calendar } from "lucide-react"

interface PremiumHeaderProps {
    gananciaMes: number
    liquidacionesPendientes: number
}

export function PremiumHeader({ gananciaMes, liquidacionesPendientes }: PremiumHeaderProps) {
    return (
        <div className="flex flex-col gap-6 mb-4 mt-2">
            {/* HUD Superior */}
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                            Sistema Operativo SPC
                        </span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-foreground">
                        MI <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-emerald-500">RADAR</span>
                    </h1>
                </div>

                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 border border-border rounded-full backdrop-blur-md">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-bold text-foreground">Marzo 2026</span>
                    </div>
                </div>
            </div>

            {/* Cards de Resumen Premium */}
            <div className="grid grid-cols-2 gap-3">
                {/* Ganancia Mes */}
                <div className="relative group overflow-hidden rounded-3xl border border-emerald-300/40 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 p-4 transition-all hover:bg-emerald-100 dark:hover:bg-emerald-500/10 active:scale-95">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-emerald-500/20 rounded-2xl">
                            <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <TrendingUp className="h-4 w-4 text-emerald-500/50" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-emerald-600/70 dark:text-emerald-500/70 uppercase tracking-widest mb-1">Ganancia Mes</span>
                        <span className="text-2xl font-black text-foreground tabular-nums">
                            ${gananciaMes.toLocaleString()}
                        </span>
                    </div>
                    {/* Luz ambiental */}
                    <div className="absolute -right-10 -bottom-10 h-24 w-24 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/20 dark:group-hover:bg-emerald-500/30 transition-colors" />
                </div>

                {/* Liquidaciones */}
                <div className="relative group overflow-hidden rounded-3xl border border-sky-300/40 dark:border-sky-500/20 bg-sky-50 dark:bg-sky-500/5 p-4 transition-all hover:bg-sky-100 dark:hover:bg-sky-500/10 active:scale-95">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-sky-500/20 rounded-2xl">
                            <Calendar className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                        </div>
                        <div className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-sky-600/70 dark:text-sky-500/70 uppercase tracking-widest mb-1">Pendientes</span>
                        <span className="text-2xl font-black text-foreground tabular-nums">
                            {liquidacionesPendientes}
                        </span>
                    </div>
                    {/* Luz ambiental */}
                    <div className="absolute -right-10 -bottom-10 h-24 w-24 bg-sky-500/10 dark:bg-sky-500/20 rounded-full blur-3xl group-hover:bg-sky-500/20 dark:group-hover:bg-sky-500/30 transition-colors" />
                </div>
            </div>
        </div>
    )
}
