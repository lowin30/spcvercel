"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Estado {
  nombre: string
  color: string
}

interface EstadoBadgeProps {
  estado: Estado | null | undefined;
  fallbackText?: string;
}

export function EstadoBadge({ estado, fallbackText }: EstadoBadgeProps) {
  if (!estado) {
    return fallbackText ? <span className="text-muted-foreground">{fallbackText}</span> : null;
  }

  return (
    <Badge
      style={{
        backgroundColor: estado.color,
        color: "white"
      }}
      className="border-0"
    >
      {estado.nombre}
    </Badge>
  )
}