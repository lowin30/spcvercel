"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface FacturaConAjuste {
  id: number
  code: string
  nombre: string | null
  datos_afip: string | null
  total: number
  saldo_pendiente: number | string
  total_ajustes: number | string
  tiene_ajustes_pendientes?: boolean
  tiene_ajustes_pagados?: boolean
}

interface AjustesListProps {
  facturas: FacturaConAjuste[]
}

export function AjustesList({ facturas }: AjustesListProps) {
  
  const formatCurrency = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return `$${(num || 0).toLocaleString("es-AR")}`
  }

  return (
    <>
      {/* DESKTOP TABLE */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-primary/20 bg-muted/50">
              <TableHead className="uppercase text-xs tracking-wide">Factura</TableHead>
              <TableHead className="uppercase text-xs tracking-wide text-center">AFIP</TableHead>
              <TableHead className="uppercase text-xs tracking-wide text-right">Total</TableHead>
              <TableHead className="uppercase text-xs tracking-wide text-right">Saldo</TableHead>
              <TableHead className="uppercase text-xs tracking-wide text-right">Ajuste</TableHead>
              <TableHead className="uppercase text-xs tracking-wide text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {facturas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No se encontraron facturas con ajustes
                </TableCell>
              </TableRow>
            ) : (
              facturas.map((factura) => {
                const saldo = typeof factura.saldo_pendiente === 'string' 
                  ? parseFloat(factura.saldo_pendiente) 
                  : factura.saldo_pendiente
                
                const ajuste = typeof factura.total_ajustes === 'string' 
                  ? parseFloat(factura.total_ajustes) 
                  : factura.total_ajustes

                const tieneSaldo = saldo > 0
                const tieneAjuste = ajuste > 0

                return (
                  <TableRow 
                    key={factura.id} 
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* Factura (Nombre) */}
                    <TableCell className="font-medium">
                      <Link 
                        href={`/dashboard/facturas/${factura.id}`}
                        className="hover:underline text-primary"
                      >
                        {factura.nombre || "Sin nombre"}
                      </Link>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {factura.code}
                      </div>
                    </TableCell>

                    {/* AFIP */}
                    <TableCell className="text-center text-sm">
                      {factura.datos_afip || "Sin datos"}
                    </TableCell>

                    {/* Total */}
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(factura.total)}
                    </TableCell>

                    {/* Saldo */}
                    <TableCell className="text-right tabular-nums">
                      <span className={tieneSaldo ? "text-red-600 font-semibold" : "text-green-600"}>
                        {formatCurrency(saldo)}
                        {!tieneSaldo && " ✓"}
                      </span>
                    </TableCell>

                    {/* Ajuste */}
                    <TableCell className="text-right tabular-nums">
                      <span className={tieneAjuste ? "text-orange-600 font-semibold" : ""}>
                        {formatCurrency(ajuste)}
                      </span>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        asChild
                      >
                        <Link href={`/dashboard/facturas/${factura.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden space-y-3">
        {facturas.length === 0 ? (
          <Card className="p-6">
            <p className="text-center text-muted-foreground">
              No se encontraron facturas con ajustes
            </p>
          </Card>
        ) : (
          facturas.map((factura) => {
            const saldo = typeof factura.saldo_pendiente === 'string' 
              ? parseFloat(factura.saldo_pendiente) 
              : factura.saldo_pendiente
            
            const ajuste = typeof factura.total_ajustes === 'string' 
              ? parseFloat(factura.total_ajustes) 
              : factura.total_ajustes

            const tieneSaldo = saldo > 0
            const tieneAjuste = ajuste > 0

            return (
              <Card 
                key={factura.id} 
                className="p-4 hover:shadow-md transition-shadow"
              >
                {/* Nombre y código */}
                <div className="mb-3">
                  <Link 
                    href={`/dashboard/facturas/${factura.id}`}
                    className="font-medium text-base hover:underline text-primary block"
                  >
                    {factura.nombre || "Sin nombre"}
                  </Link>
                  <div className="text-xs text-muted-foreground font-mono mt-1">
                    {factura.code}
                  </div>
                </div>

                {/* Datos AFIP */}
                <div className="text-sm mb-2">
                  <span className="text-muted-foreground">AFIP: </span>
                  <span className="font-medium">{factura.datos_afip || "Sin datos"}</span>
                </div>

                <div className="border-t pt-2 mt-2 space-y-1.5 text-sm">
                  {/* Total */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(factura.total)}
                    </span>
                  </div>

                  {/* Saldo */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saldo:</span>
                    <span className={`font-medium tabular-nums ${tieneSaldo ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(saldo)}
                      {!tieneSaldo && " ✓"}
                    </span>
                  </div>

                  {/* Ajuste - Destacado si > 0 */}
                  {tieneAjuste && (
                    <div className="flex justify-between bg-orange-50 -mx-4 px-4 py-2 mt-2">
                      <span className="text-orange-800 font-medium">🟠 Ajuste:</span>
                      <span className="text-orange-600 font-bold tabular-nums">
                        {formatCurrency(ajuste)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Botón */}
                <div className="mt-3 pt-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full" 
                    asChild
                  >
                    <Link href={`/dashboard/facturas/${factura.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalle
                    </Link>
                  </Button>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </>
  )
}
