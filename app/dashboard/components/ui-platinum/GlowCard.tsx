"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface GlowCardProps {
    children: React.ReactNode
    className?: string
    glowColor?: "rose" | "emerald" | "amber" | "sky" | "slate"
    intensity?: "low" | "medium" | "high"
}

export function GlowCard({
    children,
    className,
    glowColor = "slate",
    intensity = "medium"
}: GlowCardProps) {

    const glowStyles = {
        rose: "shadow-[0_0_20px_-5px_rgba(225,29,72,0.25)] dark:shadow-[0_0_20px_-5px_rgba(225,29,72,0.3)] border-rose-300/40 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/5",
        emerald: "shadow-[0_0_20px_-5px_rgba(16,185,129,0.25)] dark:shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] border-emerald-300/40 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5",
        amber: "shadow-[0_0_20px_-5px_rgba(245,158,11,0.25)] dark:shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)] border-amber-300/40 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5",
        sky: "shadow-[0_0_20px_-5px_rgba(14,165,233,0.25)] dark:shadow-[0_0_20px_-5px_rgba(14,165,233,0.3)] border-sky-300/40 dark:border-sky-500/20 bg-sky-50 dark:bg-sky-500/5",
        slate: "shadow-[0_0_15px_-5px_rgba(148,163,184,0.1)] border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40"
    }

    const intensityMap = {
        low: "shadow-sm",
        medium: "",
        high: ""
    }

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300",
                glowStyles[glowColor],
                intensityMap[intensity],
                className
            )}
        >
            {/* Reflejo superior sutil */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/5 dark:via-white/10 to-transparent" />

            <div className="relative z-10">
                {children}
            </div>

            {/* Brillo ambiental interno */}
            <div
                className={cn(
                    "absolute -right-20 -top-20 h-40 w-40 rounded-full blur-[80px] pointer-events-none opacity-10 dark:opacity-20",
                    glowColor === "rose" && "bg-rose-500",
                    glowColor === "emerald" && "bg-emerald-500",
                    glowColor === "amber" && "bg-amber-500",
                    glowColor === "sky" && "bg-sky-500",
                    glowColor === "slate" && "bg-slate-400"
                )}
            />
        </div>
    )
}
