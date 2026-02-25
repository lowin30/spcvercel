"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateTime } from "@/lib/utils"
import Link from "next/link"
import { Pencil, Trash2, Loader2, FileText, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { EstadoBadge } from "@/components/estado-badge"
import { Button } from "@/components/ui/button"
import { deleteBudget, marcarPresupuestoComoEnviado, convertirPresupuestoAFactura } from "@/app/dashboard/presupuestos-finales/actions"
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
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [enviandoId, setEnviandoId] = useState<number | null>(null)

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

  const handleMarcarComoEnviado = async (budgetId: number) => {
    if (!confirm("¿Marcar este presupuesto como enviado?")) {
      return
    }

    setEnviandoId(budgetId)
    try {
      const result = await marcarPresupuestoComoEnviado(budgetId)
      if (result.success) {
        toast.success(result.message || "Presupuesto marcado como enviado")
      } else {
        toast.error(result.message || "No se pudo marcar como enviado")
      }
    } catch (error) {
      toast.error("Ocurrió un error inesperado")
    } finally {
      setEnviandoId(null)
    }
  }

  // Los presupuestos ya vienen filtrados desde la página principal
  const filteredBudgets = budgets;

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
        <div className="block sm:hidden space-y-3">
          {filteredBudgets.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">
              No se encontraron presupuestos
            </div>
          ) : (
            filteredBudgets.map((budget) => {
              const codigo = budget.estados_presupuestos?.codigo
              return (
                <div key={budget.id} className="bg-background border rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98] border-l-4" style={{ borderLeftColor: budget.estados_presupuestos?.color || '#ccc' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <Link href={`/dashboard/presupuestos-finales/${budget.id}`} className="text-sm font-bold hover:text-primary transition-colors line-clamp-2">
                        {budget.tareas?.titulo || ('Presupuesto #' + budget.id)}
                      </Link>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">
                        {budget.code || `#${budget.id}`} • {budget.tareas?.edificios?.nombre || 'Sin edificio'}
                      </p>
                    </div>
                    <EstadoBadge
                      estado={budget.estados_presupuestos}
                      fallbackText="Sin estado"
                    />
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div className="text-2xl font-black tracking-tighter text-foreground/90">
                      ${(budget.materiales + budget.mano_obra).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button asChild variant="outline" size="icon" className="h-7 w-7" title="Editar">
                        <Link href={`/dashboard/presupuestos-finales/editar/${budget.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      {(codigo !== 'enviado' && codigo !== 'facturado' && codigo !== 'rechazado' && (userRole === 'admin' || userRole === 'supervisor')) && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                          onClick={() => handleMarcarComoEnviado(budget.id)}
                          title="Marcar como Enviado"
                          disabled={enviandoId === budget.id}
                        >
                          {enviandoId === budget.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {budget.aprobado === true && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          onClick={() => handleConvertirAFactura(budget.id)}
                          title="Convertir a Factura"
                          disabled={processingId === budget.id || budget.estados_presupuestos?.codigo === 'facturado'}
                        >
                          {processingId === budget.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(budget.id)}
                        title="Eliminar"
                        disabled={deletingId === budget.id}
                      >
                        {deletingId === budget.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="hidden sm:block rounded-md border overflow-hidden budget-table-wrapper">
          <style jsx global>{`
            @media (max-width: 640px) {
              .budget-table-wrapper > div { /* override Table wrapper */
                overflow-x: hidden !important;
                max-width: 100% !important;
              }
              table.budget-table th,
              table.budget-table td {
                white-space: normal;
                overflow-wrap: anywhere;
              }
              table.budget-table {
                width: 100%;
                table-layout: fixed;
                border-collapse: collapse;
              }
              table.budget-table th:nth-child(2),
              table.budget-table td:nth-child(2) {
                display: none;
              }
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
                filteredBudgets.map((budget) => {
                  // Determinar color y opacidad según estado
                  const codigo = budget.estados_presupuestos?.codigo
                  const color = budget.estados_presupuestos?.color

                  let backgroundColor = 'transparent'
                  let borderLeft = 'none'

                  if (color) {
                    if (codigo === 'borrador') {
                      // Borrador: MÁS intenso (30% opacidad) + borde destacado
                      backgroundColor = `${color}30`
                      borderLeft = `4px solid ${color}`
                    } else if (codigo === 'facturado') {
                      // Facturado: MUY suave (8% opacidad) - ya procesado
                      backgroundColor = `${color}08`
                    } else {
                      // Resto: Opacidad media (15%)
                      backgroundColor = `${color}15`
                    }
                  }

                  return (
                    <TableRow
                      key={budget.id}
                      className="cursor-pointer transition-all hover:bg-muted/30 group border-l-4"
                      style={{ borderLeftColor: budget.estados_presupuestos?.color || 'transparent' }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {codigo === 'borrador' && (
                            <span className="text-red-500 animate-pulse text-lg" title="Acción requerida">
                              ⚠️
                            </span>
                          )}
                          <Link href={`/dashboard/presupuestos-finales/${budget.id}`} className="text-primary hover:underline">
                            {budget.tareas?.titulo || 'Presupuesto #' + budget.id}
                          </Link>
                        </div>
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
                        <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end sm:gap-2">
                          <Button asChild variant="outline" size="icon" className="h-7 w-7 sm:h-9 sm:w-9" title="Editar">
                            <Link href={`/dashboard/presupuestos-finales/editar/${budget.id}`}>
                              <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Link>
                          </Button>
                          {/* Botón Marcar como Enviado */}
                          {codigo !== 'enviado' && codigo !== 'facturado' && codigo !== 'rechazado' && (userRole === 'admin' || userRole === 'supervisor') && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 sm:h-9 sm:w-9 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                              onClick={() => handleMarcarComoEnviado(budget.id)}
                              title="Marcar como Enviado (o Facturado si ya tiene factura)"
                              disabled={enviandoId === budget.id}
                            >
                              {enviandoId === budget.id ? (
                                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              )}
                            </Button>
                          )}
                          {/* Botón de Convertir a Factura */}
                          {budget.aprobado === true && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 sm:h-9 sm:w-9 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
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
                            className="h-7 w-7 sm:h-9 sm:w-9"
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
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
