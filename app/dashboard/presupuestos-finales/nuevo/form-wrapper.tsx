"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import PresupuestoFinalForm from "@/components/presupuesto-final-form"

export default function PresupuestoFinalFormWrapper({
    presupuestosBase,
    userId,
    initialTaskId
}: {
    presupuestosBase: any[],
    userId: string,
    initialTaskId?: string
}) {
    const [selectedPB, setSelectedPB] = useState<any>(() => {
        if (initialTaskId) {
            return presupuestosBase.find(pb => pb.id_tarea?.toString() === initialTaskId) || null;
        }
        return null;
    })

    if (selectedPB) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" onClick={() => setSelectedPB(null)} className="mb-4">
                    ← Volver a la lista
                </Button>
                <PresupuestoFinalForm
                    presupuestoBase={selectedPB}
                    userId={userId}
                    onCancel={() => setSelectedPB(null)}
                />
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Selecciona un Presupuesto Base Aprobado</CardTitle>
            </CardHeader>
            <CardContent>
                {presupuestosBase.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No hay presupuestos base pendientes de finalizar.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Tarea</TableHead>
                                <TableHead>Total Base</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {presupuestosBase.map(pb => (
                                <TableRow key={pb.id}>
                                    <TableCell>{new Date(pb.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{pb.tareas?.titulo}</div>
                                        <div className="text-xs text-muted-foreground">{pb.code}</div>
                                    </TableCell>
                                    <TableCell>{formatCurrency(pb.total || 0)}</TableCell>
                                    <TableCell>
                                        <Button onClick={() => setSelectedPB(pb)}>
                                            Seleccionar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
