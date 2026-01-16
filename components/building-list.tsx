"use client"

import { useState } from "react"
import Link from "next/link"
import { getEstadoEdificioColor } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Building2, Copy, Map, Edit2 } from "lucide-react"
import { DepartamentosDialog } from "@/components/departamentos-dialog"
import { toast } from "sonner"

interface Building {
  id: number
  code: string
  nombre: string
  direccion: string
  estado: string
  created_at: string
  cuit?: string | null
  mapa_url?: string | null
  notas?: string | null
  nombre_administrador?: string | null
  total_departamentos?: number
  departamentos_codigos?: string[] | null
}

interface BuildingListProps {
  buildings: Building[]
  onBuildingUpdated?: () => void
}

export function BuildingList({ buildings, onBuildingUpdated }: BuildingListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)

  const handleCopiarCuit = (e: React.MouseEvent, cuit: string) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(cuit)
    toast.success('CUIT copiado')
  }

  const handleAbrirDepartamentos = (e: React.MouseEvent, building: Building) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedBuilding(building)
    setDialogOpen(true)
  }

  const handleDepartamentosUpdated = () => {
    if (onBuildingUpdated) {
      onBuildingUpdated()
    }
  }

  if (!buildings || buildings.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hay edificios disponibles</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {buildings.map((building) => (
          <Card 
            key={building.id} 
            className="group hover:shadow-md dark:hover:shadow-lg transition-all duration-200"
          >
            <CardContent className="p-5 space-y-4">
              {/* Header: Nombre + Badge estado */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Link 
                    href={`/dashboard/edificios/${building.id}`}
                    className="block"
                  >
                    <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors mb-1">
                      {building.nombre}
                    </h3>
                  </Link>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="line-clamp-1">{building.direccion}</span>
                  </p>
                </div>
                <Badge 
                  variant="secondary" 
                  className={`${getEstadoEdificioColor(building.estado)} flex-shrink-0`}
                >
                  {building.estado.replace("_", " ")}
                </Badge>
              </div>

              {/* Info compacta */}
              <div className="space-y-2 text-xs text-muted-foreground">
                {building.cuit && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      CUIT: <code className="font-mono">{building.cuit}</code>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => handleCopiarCuit(e, building.cuit!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                {building.nombre_administrador && (
                  <p>Admin: {building.nombre_administrador}</p>
                )}
                
                <p>
                  {building.total_departamentos || 0} depto{building.total_departamentos !== 1 ? 's' : ''}
                  {building.departamentos_codigos && building.departamentos_codigos.length > 0 && (
                    <span className="ml-1 opacity-70">
                      ({building.departamentos_codigos.slice(0, 3).join(', ')}
                      {building.departamentos_codigos.length > 3 && '...'})
                    </span>
                  )}
                </p>

                {building.notas && (
                  <p className="italic line-clamp-2 pt-1 border-t">
                    💬 {building.notas}
                  </p>
                )}
              </div>

              {/* Botones de acción */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                {building.mapa_url && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild
                    className="h-9"
                  >
                    <a href={building.mapa_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                      <Map className="h-3.5 w-3.5 mr-1.5" />
                      Mapa
                    </a>
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={(e) => handleAbrirDepartamentos(e, building)}
                >
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />
                  Deptos
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-9"
                >
                  <Link href={`/dashboard/edificios/${building.id}/editar`} onClick={(e) => e.stopPropagation()}>
                    <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                    Editar
                  </Link>
                </Button>
                
                <Button
                  variant="default"
                  size="sm"
                  asChild
                  className="h-9"
                >
                  <Link href={`/dashboard/edificios/${building.id}`}>
                    Ver más
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Diálogo de Departamentos */}
      {selectedBuilding && (
        <DepartamentosDialog
          edificioId={selectedBuilding.id}
          edificioNombre={selectedBuilding.nombre}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onDepartamentosUpdated={handleDepartamentosUpdated}
        />
      )}
    </>
  )
}
