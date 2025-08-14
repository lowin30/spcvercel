"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
// import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"; // Comentado temporalmente
import { Check, Calculator, Eye, AlertTriangle } from "lucide-react"
import { GenerarAjustesDialog } from "@/components/generar-ajustes-dialog"

interface Factura {
  id: number
  code: string
  total: number
  datos_afip: any
  administrador_facturador: string
  tiene_ajustes: boolean
  ajustes_aprobados: boolean
  presupuestos: {
    tareas: {
      titulo: string
      edificios: {
        nombre: string
      }
    }
  }
  ajustes_facturas: Array<{
    id: number
    monto_ajuste: number
    aprobado: boolean
  }>
}

interface AjustesFacturasListProps {
  facturas: Factura[]
}

export function AjustesFacturasList({ facturas }: AjustesFacturasListProps) {
  const [isLoading, setIsLoading] = useState<number | null>(null)
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientComponentClient()

  const calcularTotalAjustes = (factura: Factura) => {
    return factura.ajustes_facturas?.reduce((sum, ajuste) => sum + Number(ajuste.monto_ajuste), 0) || 0
  }

  const aprobarAjustes = async (facturaId: number) => {
    setIsLoading(facturaId)

    try {
      // Aprobar todos los ajustes de la factura
      const { error: ajustesError } = await supabase
        .from("ajustes_facturas")
        .update({
          aprobado: true,
          fecha_aprobacion: new Date().toISOString(),
        })
        .eq("id_factura", facturaId)

      if (ajustesError) throw ajustesError

      // Marcar factura como ajustes aprobados
      const { error: facturaError } = await supabase
        .from("facturas")
        .update({ ajustes_aprobados: true })
        .eq("id", facturaId)

      if (facturaError) throw facturaError

      toast({
        title: "Ajustes aprobados",
        description: "Los ajustes han sido aprobados exitosamente",
      })

      router.refresh()
    } catch (error) {
      console.error("Error al aprobar ajustes:", error)
      toast({
        title: "Error",
        description: "No se pudieron aprobar los ajustes",
        variant: "destructive",
      })
    } finally {
      setIsLoading(null)
    }
  }

  const getDatoAfip = (factura: Factura) => {
    if (factura.datos_afip?.numero) {
      return `${factura.datos_afip.numero}`
    }
    return "Sin dato AFIP"
  }

  // Filtrar solo facturas que requieren ajustes y no están aprobados
  const facturasPendientes = facturas.filter((f) => f.tiene_ajustes && !f.ajustes_aprobados)

  if (facturasPendientes.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <div className="text-lg font-medium text-gray-900">No hay facturas con ajustes pendientes</div>
        <div className="text-muted-foreground">Todas las facturas con ajustes han sido procesadas</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {facturasPendientes.map((factura) => {
        const totalAjustes = calcularTotalAjustes(factura)
        const tieneAjustesGenerados = factura.ajustes_facturas?.length > 0

        return (
          <Card key={factura.id} className="border-orange-200 bg-orange-50/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{factura.code}</span>
                    <Badge variant="outline" className="bg-red-100 text-red-800">
                      AFIP: {getDatoAfip(factura)}
                    </Badge>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      {factura.administrador_facturador || "Sin administrador"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {factura.presupuestos?.tareas?.edificios?.nombre} - {factura.presupuestos?.tareas?.titulo}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total Factura</div>
                  <div className="text-lg font-bold">${factura.total.toLocaleString()}</div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  {tieneAjustesGenerados ? (
                    <div>
                      <div className="text-sm font-medium">Ajustes Calculados:</div>
                      <div className="text-xl font-bold text-orange-600">${totalAjustes.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {factura.ajustes_facturas.length} item(s) con ajuste del 10%
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-muted-foreground">Ajustes no calculados</div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Pendiente de cálculo
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {!tieneAjustesGenerados ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFactura(factura)}
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <Calculator className="h-4 w-4 mr-1" />
                      Calcular Ajustes
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalles
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => aprobarAjustes(factura.id)}
                        disabled={isLoading === factura.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {isLoading === factura.id ? "Aprobando..." : "Aprobar"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Dialog para generar ajustes */}
      {selectedFactura && (
        <GenerarAjustesDialog
          factura={selectedFactura}
          open={!!selectedFactura}
          onOpenChange={() => setSelectedFactura(null)}
        />
      )}
    </div>
  )
}
