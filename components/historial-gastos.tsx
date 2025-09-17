"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/date-utils"
import { Search, Eye, Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase-client"
import { GastoCompleto } from "@/lib/types"

interface HistorialGastosProps {
  gastos: GastoCompleto[]
  isLoading: boolean
}

export function HistorialGastos({ gastos, isLoading }: HistorialGastosProps) {
  const [filteredGastos, setFilteredGastos] = useState<GastoCompleto[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const filtered = gastos.filter(
      (gasto) =>
        gasto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (gasto.titulo_tarea && gasto.titulo_tarea.toLowerCase().includes(searchTerm.toLowerCase())) ||
        gasto.tipo_gasto.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredGastos(filtered)
  }, [gastos, searchTerm])

  const getTipoGastoColor = (tipo: string) => {
    const colors = {
      material: "bg-blue-100 text-blue-800",
      herramienta: "bg-green-100 text-green-800",
      transporte: "bg-yellow-100 text-yellow-800",
      otro: "bg-gray-100 text-gray-800",
    }
    return colors[tipo as keyof typeof colors] || colors.otro
  }

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(monto)
  }

  const totalGastos = filteredGastos.reduce((sum, gasto) => sum + gasto.monto, 0)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Cargando historial de gastos...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros y estadísticas */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Gastos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descripción, tarea o tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-semibold">{formatMonto(totalGastos)}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Registros: <span className="font-semibold">{filteredGastos.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de gastos */}
      <div className="grid gap-4">
        {filteredGastos.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {searchTerm ? "No se encontraron gastos con ese criterio" : "No hay gastos registrados"}
            </CardContent>
          </Card>
        ) : (
          filteredGastos.map((gasto) => (
            <Card key={gasto.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getTipoGastoColor(gasto.tipo_gasto)}>{gasto.tipo_gasto}</Badge>
                      <span className="text-sm text-muted-foreground">{formatDate(gasto.fecha_gasto)}</span>
                    </div>
                    <div>
                      <p className="font-medium">{gasto.descripcion}</p>
                      <p className="text-sm text-muted-foreground">
                        {gasto.titulo_tarea ? `${gasto.code_tarea} - ${gasto.titulo_tarea}` : "Gasto general (sin tarea específica)"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-lg">{formatMonto(gasto.monto)}</p>
                      <Badge variant={gasto.estado === "aprobado" ? "default" : "secondary"}>{gasto.estado}</Badge>
                    </div>
                    {gasto.comprobante_url && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Comprobante de Gasto</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <p>
                                <strong>Descripción:</strong> {gasto.descripcion}
                              </p>
                              <p>
                                <strong>Monto:</strong> {formatMonto(gasto.monto)}
                              </p>
                              <p>
                                <strong>Fecha:</strong> {formatDate(gasto.fecha_gasto)}
                              </p>
                            </div>
                            <div className="flex justify-center">
                              <img
                                src={gasto.comprobante_url || "/placeholder.svg"}
                                alt="Comprobante"
                                className="max-w-full max-h-96 object-contain rounded-lg border"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = "/placeholder.svg?height=200&width=300&text=Error+al+cargar+imagen"
                                }}
                              />
                            </div>
                            <div className="flex justify-center">
                              <Button asChild variant="outline">
                                <a href={gasto.comprobante_url} target="_blank" rel="noopener noreferrer" download>
                                  <Download className="h-4 w-4 mr-2" />
                                  Descargar
                                </a>
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
