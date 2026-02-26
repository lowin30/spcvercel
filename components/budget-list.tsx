"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateTime } from "@/lib/utils"
import Link from "next/link"
import { Pencil, Trash2, Loader2, FileText, Send, Building2, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { EstadoBadge } from "@/components/estado-badge"
import { Button } from "@/components/ui/button"
import { deleteBudget, marcarPresupuestoComoEnviado } from "@/app/dashboard/presupuestos-finales/actions"
import { toast } from "sonner"
import { BudgetApproveAction } from "@/components/budget-approve-action"

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
  nombre_administrador?: string
}

interface BudgetListProps {
  budgets: Budget[]
  userRole: string
}

export function BudgetList({ budgets, userRole }: BudgetListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null)
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
        <div className="md:hidden space-y-4">
          {filteredBudgets.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/20 rounded-2xl border-2 border-dashed">
              <p className="text-sm text-muted-foreground">No se encontraron presupuestos</p>
            </div>
          ) : (
            filteredBudgets.map((budget) => {
              const codigo = budget.estados_presupuestos?.codigo
              const total = budget.materiales + budget.mano_obra
              return (
                <div
                  key={budget.id}
                  className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-[0.98] relative"
                >
                  {/* Status Indicator Bar */}
                  <div 
                    className="absolute top-0 left-0 bottom-0 w-1.5"
                    style={{ backgroundColor: budget.estados_presupuestos?.color || '#cbd5e1' }}
                  />
                  
                  <div className="p-4 pl-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="space-y-1">
                        <Link 
                          href={`/dashboard/presupuestos-finales/${budget.id}`} 
                          className="font-bold text-sm leading-tight hover:text-primary transition-colors block line-clamp-2"
                        >
                          {budget.tareas?.titulo || ('Presupuesto #' + budget.id)}
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {budget.code || `#${budget.id}`}
                          </span>
                          <EstadoBadge
                            estado={budget.estados_presupuestos}
                            fallbackText="Sin estado"
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest block">Total</span>
                        <span className="text-lg font-black tracking-tight">
                          ${total.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-4">
                      <User className="h-3 w-3" />
                      <span className="truncate">{budget.nombre_administrador || 'Sin administrador'}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                       <span className="text-[10px] text-muted-foreground/50">
                        {formatDateTime(budget.created_at)}
                       </span>
                       <div className="flex items-center gap-1.5">
                          <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" title="Editar">
                            <Link href={`/dashboard/presupuestos-finales/editar/${budget.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>

                          {(codigo !== 'enviado' && codigo !== 'facturado' && codigo !== 'rechazado' && (userRole === 'admin' || userRole === 'supervisor')) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                              onClick={() => handleMarcarComoEnviado(budget.id)}
                              disabled={enviandoId === budget.id}
                            >
                              {enviandoId === budget.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                          )}

                          {(codigo === 'enviado' || (budget.aprobado === true && codigo !== 'facturado')) && (
                            <BudgetApproveAction
                              budgetId={budget.id}
                              tipo="final"
                              tareaId={budget.tareas?.id || 0}
                              userRol={userRole}
                              budgetCode={budget.code}
                              variant="icon"
                              className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20"
                            />
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleDelete(budget.id)}
                            disabled={deletingId === budget.id}
                          >
                            {deletingId === budget.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                       </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="hidden md:block rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="font-bold py-4">Tarea / Obra</TableHead>
                <TableHead className="font-bold">Administrador</TableHead>
                <TableHead className="font-bold text-center">Estado</TableHead>
                <TableHead className="font-bold text-right">Monto Total</TableHead>
                <TableHead className="font-bold text-right pr-6">Acciones</TableHead>
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
                      <TableCell>{budget.nombre_administrador || 'Sin administrador'}</TableCell>
                      <TableCell className="text-center">
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
                          {/* Botón de Aprobar / Facturar Unificado */}
                          {(codigo === 'enviado' || (budget.aprobado === true && codigo !== 'facturado')) && (
                            <BudgetApproveAction
                              budgetId={budget.id}
                              tipo="final"
                              tareaId={budget.tareas?.id || 0}
                              userRol={userRole}
                              budgetCode={budget.code}
                              variant="icon"
                              className="h-7 w-7 sm:h-9 sm:w-9 text-blue-600"
                            />
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
