"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Calculator, FileText, AlertTriangle, Check, Ban, ExternalLink, Loader2, Plus, X, Pencil, Zap, Handshake } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { toast as sonnerToast } from "sonner"
import {
  createPresupuestoBaseAction,
  aprobarPresupuestoAction,
  rechazarPresupuestoAction
} from "@/app/dashboard/tareas/actions"
import {
  marcarPresupuestoComoEnviado
} from "@/app/dashboard/presupuestos-finales/actions"
import { BudgetApproveAction } from "@/components/budget-approve-action"

// Tipos
export interface PresupuestoType {
  id: number
  code: string
  tipo: "base" | "final"
  total?: number
  materiales?: number
  mano_obra?: number
  created_at: string
  updated_at?: string
  aprobado?: boolean
  rechazado?: boolean
  observaciones?: string
  observaciones_admin?: string  // ← Agregado
  nota_pb?: string
  // Relaciones
  id_tarea?: number
  id_estado?: number  // ← Agregado para referencia a estados_presupuestos
  // Estado de facturación (solo para presupuestos finales)
  tiene_facturas?: boolean
  facturas_pagadas?: boolean
}

interface PresupuestosInteractivosProps {
  tareaId: number
  userId: string // <-- AÑADIDO: userId es necesario para id_supervisor
  id_administrador_tarea?: number | null // Prop para el ID del administrador de la tarea
  id_edificio_tarea?: number | null      // Prop para el ID del edificio de la tarea
  presupuestoBase: PresupuestoType | null
  presupuestoFinal: PresupuestoType | null
  userRol: "admin" | "supervisor" | "trabajador"
  onPresupuestoChange?: () => void
  className?: string
}

export function PresupuestosInteractivos({
  tareaId,
  userId, // <-- AÑADIDO: userId obtenido de props
  id_administrador_tarea,
  id_edificio_tarea,
  presupuestoBase,
  presupuestoFinal,
  userRol,
  onPresupuestoChange,
  className = ""
}: PresupuestosInteractivosProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isAprobando, setIsAprobando] = useState(false)
  const [isRechazando, setIsRechazando] = useState(false)

  // Estado local para reflejar cambios inmediatos en la UI
  const [presupuestoBaseLocal, setPresupuestoBaseLocal] = useState<PresupuestoType | null>(presupuestoBase)
  const [presupuestoFinalLocal, setPresupuestoFinalLocal] = useState<PresupuestoType | null>(presupuestoFinal)

  // Estado para el diálogo de rechazo
  const [showRechazarDialog, setShowRechazarDialog] = useState(false)
  const [observacionRechazo, setObservacionRechazo] = useState("")
  const [presupuestoARechazar, setPresupuestoARechazar] = useState<PresupuestoType | null>(null)

  // Sync state with props when they change (after router.refresh)
  React.useEffect(() => {
    setPresupuestoBaseLocal(presupuestoBase)
    setPresupuestoFinalLocal(presupuestoFinal)
  }, [presupuestoBase, presupuestoFinal])

  // Funciones auxiliares
  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getEstadoPresupuesto = (presupuesto: PresupuestoType | null) => {
    if (!presupuesto) return null
    if (presupuesto.rechazado) return "rechazado"
    if (presupuesto.aprobado) return "aprobado"
    return "pendiente"
  }

  // Funciones para aprobar/rechazar presupuestos
  const handleAprobarPresupuesto = async (presupuesto: PresupuestoType) => {
    if (userRol !== "admin") {
      toast({
        title: "Acción no permitida",
        description: "Solo los administradores pueden aprobar presupuestos",
        variant: "destructive",
      })
      return
    }

    setIsAprobando(true)

    try {
      const res = await aprobarPresupuestoAction(presupuesto.id, presupuesto.tipo, tareaId)

      if (!res.success) throw new Error(res.message)

      // Actualizar estado local
      if (presupuesto.tipo === "base") {
        setPresupuestoBaseLocal({
          ...presupuesto,
          aprobado: true,
          rechazado: false,
          updated_at: new Date().toISOString()
        })
      } else {
        setPresupuestoFinalLocal({
          ...presupuesto,
          aprobado: true,
          rechazado: false,
          updated_at: new Date().toISOString()
        })

        // La creación de facturas ahora se maneja dentro de la server action (aprobarPresupuestoAction)
        sonnerToast.success("Facturas creadas con éxito");
      }

      // Notificar al usuario
      toast({
        title: "Presupuesto aprobado",
        description: `El presupuesto ${presupuesto.code} ha sido aprobado`,
      })

      // Notificar al componente padre para recarga si es necesario
      if (onPresupuestoChange) onPresupuestoChange()

    } catch (err) {
      console.error("Error al aprobar presupuesto:", err)
      toast({
        title: "Error",
        description: `No se pudo aprobar el presupuesto. ${err instanceof Error ? err.message : ""}`,
        variant: "destructive",
      })
    } finally {
      setIsAprobando(false)
    }
  }

  const handleRechazarPresupuesto = async (presupuesto: PresupuestoType, observacion: string = "") => {
    if (userRol !== "admin") {
      toast({
        title: "Acción no permitida",
        description: "Solo los administradores pueden rechazar presupuestos",
        variant: "destructive",
      })
      return
    }

    setIsRechazando(true)

    try {
      const res = await rechazarPresupuestoAction(presupuesto.id, presupuesto.tipo, tareaId, observacion)

      if (!res.success) throw new Error(res.message)

      // Actualizar estado local
      if (presupuesto.tipo === "base") {
        setPresupuestoBaseLocal({
          ...presupuesto,
          aprobado: false,
          rechazado: true,
          observaciones_admin: observacion || undefined,
          updated_at: new Date().toISOString()
        })
      } else {
        setPresupuestoFinalLocal({
          ...presupuesto,
          aprobado: false,
          rechazado: true,
          observaciones_admin: observacion || undefined,
          updated_at: new Date().toISOString()
        })
      }

      // Notificar al usuario
      toast({
        title: "Presupuesto rechazado",
        description: `El presupuesto ${presupuesto.code} ha sido rechazado`,
      })

      // Notificar al componente padre para recarga si es necesario
      if (onPresupuestoChange) onPresupuestoChange()

    } catch (err) {
      console.error("Error al rechazar presupuesto:", err)
      toast({
        title: "Error",
        description: `No se pudo rechazar el presupuesto. ${err instanceof Error ? err.message : ""}`,
        variant: "destructive",
      })
    } finally {
      setIsRechazando(false)
    }
  }



  // Renderizar badge de estado
  const renderEstadoBadge = (estado: string | null) => {
    if (!estado) return null

    switch (estado) {
      case "pendiente":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>
      case "aprobado":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Aprobado</Badge>
      case "rechazado":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rechazado</Badge>
      default:
        return null
    }
  }

  // Renderizar tarjeta de presupuesto
  const renderPresupuestoCard = (presupuesto: PresupuestoType | null, tipo: "base" | "final") => {
    const titulo = tipo === "base" ? "Presupuesto Base" : "Presupuesto Final"
    const colorClase = tipo === "base" ? "border-blue-100" : "border-purple-100"
    const estadoPresupuesto = getEstadoPresupuesto(presupuesto)

    // Si no hay presupuesto, mostrar botón para crear
    if (!presupuesto) {
      // Supervisores y admins pueden crear presupuestos base
      if (tipo === "base" && !(userRol === "supervisor" || userRol === "admin")) {
        return null
      }

      // Solo admins pueden crear presupuestos finales
      if (tipo === "final" && userRol !== "admin") {
        return null
      }

      // Mostrar opción para crear presupuesto base si el usuario es admin o supervisor
      if (tipo === "base" && (userRol === "admin" || userRol === "supervisor")) {
        return (
          <div className="space-y-3 p-4 rounded-xl border border-blue-100/60 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/40 to-transparent dark:from-blue-950/20 shadow-sm flex flex-col justify-center min-h-[140px]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Calculator className="h-3.5 w-3.5 fill-current" />
                PRESUPUESTO BASE
              </h3>
              <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[9px] h-4 px-1.5 font-black rounded-md border-none uppercase tracking-widest">
                Estimación
              </Badge>
            </div>
            <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 shadow-sm border-none transition-all hover:scale-[1.02]" asChild>
              <Link href={`?action=crear-pb&id_tarea=${tareaId}`}>
                <Calculator className="mr-1.5 h-4 w-4" />
                Generar Presupuesto Base
              </Link>
            </Button>
          </div>
        )
      }

      // Mostrar opción para crear presupuesto final si hay presupuesto base, no hay presupuesto final, y el usuario es admin o supervisor
      if (tipo === "final" && presupuestoBaseLocal && !presupuestoFinalLocal && (userRol === "admin" || userRol === "supervisor")) {
        return (
          <div className="space-y-3 p-4 rounded-xl border border-indigo-100/60 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/40 to-transparent dark:from-indigo-950/20 shadow-sm flex flex-col justify-center h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <Zap className="h-3.5 w-3.5 fill-current" />
                CONTROL PLATINUM
              </h3>
              {presupuestoFinalLocal && (
                <Badge className="bg-indigo-500 text-[9px] h-4 px-1.5 font-black rounded-md border-none text-white">
                  MODO DIOS
                </Badge>
              )}
            </div>

            {!presupuestoFinalLocal ? (
              presupuestoBaseLocal ? (
                <Button asChild size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10 shadow-sm border-none transition-all hover:scale-[1.02]">
                  <Link href={`?action=crear-pf&id_tarea=${tareaId}`}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Generar PF Platinum
                  </Link>
                </Button>
              ) : (
                <div className="text-sm text-center text-muted-foreground p-4 bg-white/60 dark:bg-black/20 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800 h-full flex items-center justify-center">
                  Genera el Presupuesto Base primero para habilitar el Control Platinum.
                </div>
              )
            ) : null}
          </div>
        )
      }

      return null
    }

    // Si hay presupuesto, mostrar sus detalles (Mismo esqueleto que el final)
    const isBase = tipo === "base";
    const accentColor = isBase ? "blue" : "indigo";

    return (
      <div className={`space-y-3 p-4 rounded-xl border border-${accentColor}-100/60 dark:border-${accentColor}-900/40 bg-gradient-to-br from-${accentColor}-50/40 to-transparent dark:from-${accentColor}-950/20 shadow-sm flex flex-col justify-center h-full`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-black flex items-center gap-1.5 text-${accentColor}-600 dark:text-${accentColor}-400`}>
            {isBase ? <Calculator className="h-3.5 w-3.5 fill-current" /> : <Zap className="h-3.5 w-3.5 fill-current" />}
            {isBase ? "PRESUPUESTO BASE" : "CONTROL PLATINUM"}
          </h3>
          <Badge className={`bg-${accentColor}-500/20 text-${accentColor}-700 dark:text-${accentColor}-300 text-[9px] h-4 px-1.5 font-black rounded-md border-none uppercase tracking-widest`}>
            {estadoPresupuesto || "BORRADOR"}
          </Badge>
        </div>

        <Card className="border shadow-none bg-white/50 dark:bg-black/20 backdrop-blur-sm overflow-hidden rounded-xl">
          <CardContent className="p-3.5 space-y-3.5">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-bold text-muted-foreground tracking-wider">{presupuesto.code}</span>
                  {presupuesto.aprobado && <Check className="h-3 w-3 text-green-600" />}
                </div>
                <p className={`text-xl font-black tracking-tighter text-${accentColor}-700 dark:text-${accentColor}-400 leading-none`}>
                  {formatCurrency(presupuesto.total || 0)}
                </p>
              </div>
              <div className="flex gap-2">
                {userRol === "admin" && estadoPresupuesto === "pendiente" && (
                  <>
                    <BudgetApproveAction
                      budgetId={presupuesto.id}
                      tipo={tipo}
                      tareaId={tareaId}
                      userRol={userRol}
                      budgetCode={presupuesto.code}
                      onSuccess={() => {
                        if (tipo === "base") {
                          setPresupuestoBaseLocal({ ...presupuesto, aprobado: true, rechazado: false })
                        } else {
                          setPresupuestoFinalLocal({ ...presupuesto, aprobado: true, rechazado: false })
                        }
                        if (onPresupuestoChange) onPresupuestoChange()
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg h-8 px-3 text-xs shadow-none"
                      variant="default"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 rounded-lg dark:bg-red-950/30 dark:border-red-900/50"
                      onClick={() => {
                        setPresupuestoARechazar(presupuesto);
                        setObservacionRechazo("");
                        setShowRechazarDialog(true);
                      }}
                      disabled={isAprobando || isRechazando}
                      title="Rechazar"
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}

                <Button asChild size="sm" variant="outline" className={`h-8 w-8 p-0 rounded-lg hover:bg-${accentColor}-50 border-${accentColor}-100 dark:border-${accentColor}-800 dark:hover:bg-${accentColor}-900/30`}>
                  <Link href={tipo === "base" ? `/dashboard/presupuestos-base/${presupuesto.id}` : `/dashboard/presupuestos-finales/${presupuesto.id}`}>
                    <ExternalLink className={`h-3.5 w-3.5 text-${accentColor}-600 dark:text-${accentColor}-400`} />
                  </Link>
                </Button>
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-3 text-center border-t border-${accentColor}-100/80 dark:border-${accentColor}-900/50 pt-3`}>
              <div className="bg-white/40 dark:bg-black/30 rounded-lg py-1.5">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-0.5">Materiales</span>
                <span className="text-xs font-bold text-foreground">{formatCurrency(presupuesto.materiales || 0)}</span>
              </div>
              <div className="bg-white/40 dark:bg-black/30 rounded-lg py-1.5">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-0.5">Mano de Obra</span>
                <span className="text-xs font-bold text-foreground">{formatCurrency(presupuesto.mano_obra || 0)}</span>
              </div>
            </div>

            {(presupuesto.observaciones_admin || presupuesto.nota_pb) && (
              <div className={`text-[10px] bg-amber-500/10 dark:bg-amber-500/5 px-2.5 py-2 rounded-lg border border-amber-500/20 text-amber-700 dark:text-amber-400 mt-2 flex gap-1.5`}>
                <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                <span className="leading-tight">{presupuesto.observaciones_admin || presupuesto.nota_pb}</span>
              </div>
            )}

            {isBase && (userRol === "admin" || userRol === "supervisor") ? (
              <Button asChild className={`w-full bg-${accentColor}-600 hover:bg-${accentColor}-700 text-white font-bold rounded-xl h-10 text-xs shadow-md shadow-${accentColor}-200/50 dark:shadow-none border-none transition-all hover:scale-[1.02] mt-1`}>
                <Link href={`?edit-pb=${presupuesto.id}`}>
                  <Calculator className="mr-1.5 h-3.5 w-3.5 fill-white/20" />
                  Gestionar Planificación
                </Link>
              </Button>
            ) : (
              <Button asChild className={`w-full bg-${accentColor}-600 hover:bg-${accentColor}-700 text-white font-bold rounded-xl h-10 text-xs shadow-md shadow-${accentColor}-200/50 dark:shadow-none border-none transition-all hover:scale-[1.02] mt-1`}>
                <Link href={`?edit-pf=${presupuesto.id}`}>
                  <Zap className="mr-1.5 h-3.5 w-3.5 fill-white/20" />
                  Gestionar Platinum
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Si el usuario es trabajador, no mostrar nada
  if (userRol === "trabajador") {
    return null
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Diálogo para rechazar presupuesto con observaciones */}
      <Dialog open={showRechazarDialog} onOpenChange={setShowRechazarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar presupuesto</DialogTitle>
            <DialogDescription>
              Indique el motivo por el cual rechaza este presupuesto.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Observaciones (opcional)"
              value={observacionRechazo}
              onChange={(e) => setObservacionRechazo(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRechazarDialog(false)}
              disabled={isRechazando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (presupuestoARechazar) {
                  handleRechazarPresupuesto(presupuestoARechazar, observacionRechazo);
                  setShowRechazarDialog(false);
                }
              }}
              disabled={isRechazando}
            >
              {isRechazando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <h3 className="text-lg font-semibold">Presupuestos</h3>

      <div className={`grid grid-cols-1 ${userRol === "admin" ? "md:grid-cols-2" : ""} gap-4`}>
        {/* Presupuesto Base - visible para admins y supervisores */}
        {renderPresupuestoCard(presupuestoBaseLocal, "base")}

        {userRol === "admin" && (
          <div className="space-y-3 p-4 rounded-xl border border-indigo-100/60 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/40 to-transparent dark:from-indigo-950/20 shadow-sm flex flex-col justify-center">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <Zap className="h-3.5 w-3.5 fill-current" />
                CONTROL PLATINUM
              </h3>
              {presupuestoFinalLocal && (
                <Badge className="bg-indigo-500 text-[9px] h-4 px-1.5 font-black rounded-md border-none text-white">
                  MODO DIOS
                </Badge>
              )}
            </div>

            {!presupuestoFinalLocal ? (
              presupuestoBaseLocal ? (
                <Button asChild size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10 shadow-sm border-none transition-all hover:scale-[1.02]">
                  <Link href={`?action=crear-pf&id_tarea=${tareaId}`}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Generar PF Platinum
                  </Link>
                </Button>
              ) : (
                <div className="text-sm text-center text-muted-foreground p-4 bg-white/60 dark:bg-black/20 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800">
                  Genera el Presupuesto Base primero para habilitar el Control Platinum.
                </div>
              )
            ) : (
              <Card className="border shadow-none bg-white/50 dark:bg-black/20 backdrop-blur-sm overflow-hidden rounded-xl">
                <CardContent className="p-3.5 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold text-muted-foreground tracking-wider">{presupuestoFinalLocal.code}</span>
                        {presupuestoFinalLocal.aprobado && <Check className="h-3 w-3 text-green-600" />}
                      </div>
                      <p className="text-xl font-black tracking-tighter text-indigo-700 dark:text-indigo-400 leading-none">
                        {formatCurrency(presupuestoFinalLocal.total || 0)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!presupuestoFinalLocal.aprobado && (
                        <BudgetApproveAction
                          budgetId={presupuestoFinalLocal.id}
                          tipo="final"
                          tareaId={tareaId}
                          userRol={userRol}
                          budgetCode={presupuestoFinalLocal.code}
                          onSuccess={() => {
                            setPresupuestoFinalLocal({
                              ...presupuestoFinalLocal,
                              aprobado: true,
                              rechazado: false,
                              updated_at: new Date().toISOString()
                            })
                            if (onPresupuestoChange) onPresupuestoChange()
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg h-8 px-3 text-xs shadow-none"
                          variant="default"
                        />
                      )}
                      <Button asChild size="sm" variant="outline" className="h-8 w-8 p-0 rounded-lg hover:bg-indigo-50 border-indigo-100 dark:border-indigo-800 dark:hover:bg-indigo-900/30">
                        <Link href={`/dashboard/presupuestos-finales/${presupuestoFinalLocal.id}`}>
                          <ExternalLink className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center border-t border-indigo-100/80 dark:border-indigo-900/50 pt-3">
                    <div className="bg-white/40 dark:bg-black/30 rounded-lg py-1.5">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-0.5">Materiales</span>
                      <span className="text-xs font-bold text-foreground">{formatCurrency(presupuestoFinalLocal.materiales || 0)}</span>
                    </div>
                    <div className="bg-white/40 dark:bg-black/30 rounded-lg py-1.5">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-0.5">Mano de Obra</span>
                      <span className="text-xs font-bold text-foreground">{formatCurrency(presupuestoFinalLocal.mano_obra || 0)}</span>
                    </div>
                  </div>

                  <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10 text-xs shadow-md shadow-indigo-200/50 dark:shadow-none border-none transition-all hover:scale-[1.02]">
                    <Link href={`?edit-pf=${presupuestoFinalLocal.id}`}>
                      <Zap className="mr-1.5 h-3.5 w-3.5 fill-white/20" />
                      Gestionar Platinum
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
