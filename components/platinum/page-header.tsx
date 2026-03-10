"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
    title: string
    highlight?: string
    subtitle?: string
    actions?: React.ReactNode
    className?: string
}

export function PageHeader({
    title,
    highlight,
    subtitle,
    actions,
    className
}: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-4 p-1", className)}>
            <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tighter text-foreground sm:text-5xl lg:text-6xl">
                    {title} {highlight && <span className="text-violet-600">{highlight}</span>}
                </h1>
                {subtitle && (
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl">
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    )
}
