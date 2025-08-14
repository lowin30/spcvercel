"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, DollarSign, Eye } from "lucide-react"
import { RegistrarPagoDialog } from "@/components/registrar-pago-dialog"
import Link from "next/link"

interface Factura {
  id: number
  code: string
  total: number
  estado: string
  datos_afip: any
  administrador_facturador?: string
  created_at: string
  presupuestos: {
    tareas: {
      titulo: string
      edificios: {
        nombre: string
      }
    }
  }
}

interface PagosFacturasListProps {
  facturas: Factura[]
}

export function PagosFacturasList({ facturas }: PagosFacturasListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null)

  const filteredFacturas = facturas.filter((factura) => {
    const searchLower = searchTerm.toLowerCase()
    const datoAfip = factura.datos_afip?.numero || ""
    const edificio = factura.presupuestos?.tareas?.edificios?.nombre || ""

    return (
      factura.code.toLowerCase().includes(searchLower) ||
      datoAfip.toString().includes(searchLower) ||
      edificio.toLowerCase().includes(searchLower) ||
      factura.presupuestos?.tareas?.titulo?.toLowerCase().includes(searchLower)
    )
  })

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return <Badge variant="destructive">🔴 Pendiente</Badge>
      case "pagada":
        return (
          <Badge variant="default" className="bg-green-600">
            🟢 Pagada
          </Badge>
        )
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  const getDatoAfip = (factura: Factura) => {
    if (factura.datos_afip?.numero) {
      const admin = factura.administrador_facturador || "Sin asignar"
      return `${factura.datos_afip.numero}-${admin}`
    }
    return "Sin dato AFIP"
  }

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por dato AFIP, código, edificio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Lista de facturas */}
      <div className="space-y-2">
        {filteredFacturas.map((factura) => (
          <div key={factura.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
            <div className="flex-1 space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{factura.code}</span>
                <span className="text-sm text-muted-foreground">AFIP: {getDatoAfip(factura)}</span>
                {getEstadoBadge(factura.estado)}
              </div>

              <div className="text-sm text-muted-foreground">
                {factura.presupuestos?.tareas?.edificios?.nombre} - {factura.presupuestos?.tareas?.titulo}
              </div>

              <div className="text-lg font-semibold">${factura.total.toLocaleString()}</div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/facturas/${factura.id}`}>
                  <Eye className="h-4 w-4 mr-1" />
                  Ver
                </Link>
              </Button>

              <Button size="sm" onClick={() => setSelectedFactura(factura)} disabled={factura.estado === "pagada"}>
                <DollarSign className="h-4 w-4 mr-1" />
                Pagar
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredFacturas.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No se encontraron facturas que coincidan con la búsqueda
        </div>
      )}

      {/* Dialog de registro de pago */}
      {selectedFactura && (
        <RegistrarPagoDialog
          factura={selectedFactura}
          open={!!selectedFactura}
          onOpenChange={() => setSelectedFactura(null)}
        />
      )}
    </div>
  )
}
