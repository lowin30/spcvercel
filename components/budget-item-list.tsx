"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

interface Item {
  id: number
  descripcion: string
  cantidad: number
  precio: number
  es_producto?: boolean
  producto_id?: string
  productos?: {
    code: number
    nombre: string
  }
}

interface BudgetItemListProps {
  items: Item[]
}

export function BudgetItemList({ items }: BudgetItemListProps) {
  const calculateSubtotal = (item: Item) => {
    return item.cantidad * item.precio
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + calculateSubtotal(item), 0)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Precio Unitario</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No hay ítems en este presupuesto.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.descripcion}
                    {item.producto_id && (
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Producto
                        </Badge>
                        {item.productos && (
                          <span className="text-xs text-muted-foreground">Código: {item.productos.code}</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.cantidad}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.precio)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(calculateSubtotal(item))}</TableCell>
                </TableRow>
              ))
            )}
            <TableRow>
              <TableCell colSpan={3} className="text-right font-bold">
                Total
              </TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(calculateTotal())}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
