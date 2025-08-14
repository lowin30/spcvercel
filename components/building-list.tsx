"use client"

import Link from "next/link"
import { getEstadoEdificioColor, formatCuit } from "@/lib/utils"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin } from "lucide-react"
import { BuildingIcon } from "lucide-react"

interface Building {
  id: number
  code: string
  nombre: string
  direccion: string
  estado: string
  created_at: string
  cuit?: string | null
  nombre_administrador?: string | null
  total_tareas?: number
  total_presupuestos_base?: number
}

interface BuildingListProps {
  buildings: Building[]
}

export function BuildingList({ buildings }: BuildingListProps) {
  if (!buildings || buildings.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hay edificios disponibles</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {buildings.map((building) => (
        <Link href={`/dashboard/edificios/${building.id}`} key={building.id}>
          <Card className="h-full hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{building.nombre}</h3>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <MapPin className="mr-1 h-3 w-3" />
                    {building.direccion}
                  </p>
                  {building.cuit && (
                    <p className="text-sm text-muted-foreground flex items-center mt-1">
                      <BuildingIcon className="mr-1 h-3 w-3" />
                      CUIT: {formatCuit(building.cuit)}
                    </p>
                  )}
                </div>
                <Badge variant="outline">{building.code}</Badge>
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-between items-center border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className={getEstadoEdificioColor(building.estado)}>
                  {building.estado.replace("_", " ")}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {building.nombre_administrador || "Sin administrador"}
              </div>
            </CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  )
}
