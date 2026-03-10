"use client"

import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface KPICardProps {
    label: string
    value: string | number
    icon: LucideIcon
    color: string
    bg: string
    description?: string
    className?: string
}

export function KPICard({
    label,
    value,
    icon: Icon,
    color,
    bg,
    description,
    className
}: KPICardProps) {
    return (
        <div className={cn(
            "p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-card border border-border/50 shadow-sm flex items-center gap-3 transition-all hover:border-violet-500/30 hover:shadow-md",
            className
        )}>
            <div className={cn("p-2 rounded-lg shrink-0", bg, color)}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 truncate">
                    {label}
                </p>
                <div className="flex items-baseline gap-1">
                    <p className="text-lg sm:text-2xl font-black tracking-tight truncate">
                        {value}
                    </p>
                    {description && (
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">
                            {description}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
