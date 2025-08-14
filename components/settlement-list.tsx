"use client"

import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Settlement {
  id: number
  code: string
  id_tarea: number
  id_presupuesto_base: number
  id_presupuesto_final: number
  gastos_reales: number
  ganancia_supervisor: number
  ganancia_admin: number
  created_at: string
  tareas: {
    titulo: string
    code: string
  }
  presupuesto_base: {
    code: string
  }
  presupuesto_final: {
    code: string
  }
}

interface SettlementListProps {
  settlements: Settlement[]
}

export function SettlementList({ settlements }: SettlementListProps) {
  if (settlements.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hay liquidaciones disponibles</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {settlements.map((settlement) => (
        <Link href={`/dashboard/liquidaciones/${settlement.id}`} key={settlement.id}>
          <Card className="h-full hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">
                    {settlement.tareas.titulo}{" "}
                    <span className="text-sm text-muted-foreground">({settlement.tareas.code})</span>
                  </h3>
                  <div className="flex items-center mt-1">
                    <Badge variant="outline">Liquidación</Badge>
                  </div>
                </div>
                <Badge variant="outline">{settlement.code}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Gastos reales</p>
                  <p className="font-medium">${settlement.gastos_reales.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ganancia total</p>
                  <p className="font-medium">
                    ${(settlement.ganancia_supervisor + settlement.ganancia_admin).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-between items-center border-t">
              <div className="text-xs text-muted-foreground">
                Presupuestos: {settlement.presupuesto_base.code} → {settlement.presupuesto_final.code}
              </div>
              <div className="text-xs text-muted-foreground">{formatDate(settlement.created_at)}</div>
            </CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  )
}
