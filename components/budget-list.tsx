"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateTime } from "@/lib/utils"
import Link from "next/link"
import { Search, Pencil, Trash2, Loader2, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { EstadoBadge } from "@/components/estado-badge"
import { Button } from "@/components/ui/button"
import { deleteBudget } from "@/app/dashboard/presupuestos/actions"
import { convertirPresupuestoAFactura } from "@/app/dashboard/presupuestos/actions-factura"
import { toast } from "sonner"

interface Budget {
  id: number
  code: string
  materiales: number
  mano_obra: number
  created_at: string
  id_estado_nuevo: number | null
  aprobado?: boolean
  tareas: {
    id?: number
    titulo: string
    code: string
    edificios?: {
      nombre?: string
    }
  }
  estados_presupuestos: {
    id: number
    nombre: string
    color: string
    codigo: string
  } | null
}

interface BudgetListProps {
  budgets: Budget[]
  userRole: string
}

export function BudgetList({ budgets, userRole }: BudgetListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const handleDelete = async (budgetId: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este presupuesto? Esta acción no se puede deshacer.")) {
      return
    }

    setDeletingId(budgetId)
    try {
      const result = await deleteBudget(budgetId)
      if (result.success) {
        toast.success(result.message || "Presupuesto eliminado con éxito.")
      } else {
        toast.error(result.message || "No se pudo eliminar el presupuesto.")
      }
    } catch (error) {
      toast.error("Ocurrió un error inesperado.")
    } finally {
      setDeletingId(null)
    }
  }

  const handleConvertirAFactura = async (budgetId: number) => {
    if (!confirm("¿Deseas convertir este presupuesto en factura? Se crearán todos los ítems correspondientes.")) {
      return
    }

    setProcessingId(budgetId)
    try {
      const result = await convertirPresupuestoAFactura(budgetId)
      if (result.success) {
        toast.success(result.message || "Factura creada con éxito.")
      } else {
        toast.error(result.message || "No se pudo crear la factura.")
      }
    } catch (error) {
      toast.error("Ocurrió un error inesperado al crear la factura.")
    } finally {
      setProcessingId(null)
    }
  }

  const filteredBudgets = budgets.filter((budget) => {
    const term = searchTerm.toLowerCase()
    return (
      (budget.code && budget.code.toLowerCase().includes(term)) ||
      (budget.tareas?.titulo && budget.tareas.titulo.toLowerCase().includes(term)) ||
      (budget.tareas?.edificios?.nombre && budget.tareas.edificios.nombre.toLowerCase().includes(term))
    )
  })

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Presupuestos</CardTitle>
          <CardDescription>Gestiona los presupuestos del sistema</CardDescription>
        </div>
        {/* Eliminamos el botón duplicado de aquí */}
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar presupuestos..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="rounded-md border overflow-hidden">
          <style jsx global>{`
            /* Estilos para evitar scroll horizontal en móvil */
            @media (max-width: 640px) {            
              table.budget-table {
                width: 100%;
                table-layout: fixed;
              }
              
              /* Ocultar columna de Edificio en móvil */
              table.budget-table th:nth-child(2),
              table.budget-table td:nth-child(2) {
                display: none;
              }
              
              /* Ajustar anchos de las columnas visibles */
              table.budget-table th:nth-child(1),
              table.budget-table td:nth-child(1) {
                width: 40%;
                white-space: normal;
                padding: 10px 5px;
              }
              
              table.budget-table th:nth-child(3),
              table.budget-table td:nth-child(3) {
                width: 22%;
                padding: 10px 3px;
              }
              
              table.budget-table th:nth-child(4),
              table.budget-table td:nth-child(4) {
                width: 18%;
                padding: 10px 2px;
                text-align: right;
              }
              
              table.budget-table th:nth-child(5),
              table.budget-table td:nth-child(5) {
                width: 20%;
                padding: 8px 2px;
                text-align: center;
              }
              
              /* Centra los botones de acción */
              table.budget-table td:nth-child(5) > div {
                justify-content: center;
              }
            }
          `}</style>
          <Table className="budget-table">
            <TableHeader>
              <TableRow>
                <TableHead>Tarea</TableHead>
                <TableHead>Edificio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBudgets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No se encontraron presupuestos
                  </TableCell>
                </TableRow>
              ) : (
                filteredBudgets.map((budget) => (
                  <TableRow key={budget.id}>
                    <TableCell>
                      <Link href={`/dashboard/presupuestos-finales/${budget.id}`} className="text-primary hover:underline">
                        {budget.tareas?.titulo || 'Presupuesto #' + budget.id}
                      </Link>
                    </TableCell>
                    <TableCell>{budget.tareas?.edificios?.nombre || 'Sin edificio'}</TableCell>
                                        <TableCell>
                      <EstadoBadge
                        estado={budget.estados_presupuestos}
                        fallbackText="Sin estado"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      ${(budget.materiales + budget.mano_obra).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button asChild variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" title="Editar">
                          <Link href={`/dashboard/presupuestos-finales/editar/${budget.id}`}>
                            <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Link>
                        </Button>
                        {/* Nuevo botón de Convertir a Factura */}
                        {budget.aprobado === true && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 sm:h-9 sm:w-9 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => handleConvertirAFactura(budget.id)}
                            title="Convertir a Factura"
                            disabled={processingId === budget.id || budget.estados_presupuestos?.codigo === 'facturado'}
                          >
                            {processingId === budget.id ? (
                              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 sm:h-9 sm:w-9"
                          onClick={() => handleDelete(budget.id)}
                          title="Eliminar"
                          disabled={deletingId === budget.id}
                        >
                          {deletingId === budget.id ? (
                            <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
