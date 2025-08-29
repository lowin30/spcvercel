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
import { Calculator, FileText, AlertTriangle, Check, Ban, ExternalLink, Loader2, Plus, X } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { createClient } from "@/lib/supabase-client"
import { convertirPresupuestoADosFacturas } from "@/app/dashboard/presupuestos-finales/actions-factura"
import { toast as sonnerToast } from "sonner"

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
  nota_pb?: string
  // Relaciones
  id_tarea?: number
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
  
  // Estados para el modal de creación rápida
  const [showCrearRapido, setShowCrearRapido] = useState(false)
  const [materiales, setMateriales] = useState("")
  const [manoObra, setManoObra] = useState("")
  const [notaInterna, setNotaInterna] = useState("")
  const [isCreando, setIsCreando] = useState(false)
  
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
      const supabase = createClient()
      if (!supabase) {
        throw new Error("No se pudo inicializar el cliente de Supabase")
      }
      
      // Actualizar en la base de datos según tipo de presupuesto
      const tabla = presupuesto.tipo === "base" ? "presupuestos_base" : "presupuestos_finales"
      const { error } = await supabase
        .from(tabla)
        .update({ 
          aprobado: true,
          rechazado: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", presupuesto.id)
      
      if (error) throw error
      
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
        
        // Si es un presupuesto final, crear las facturas automáticamente
        try {
          const result = await convertirPresupuestoADosFacturas(presupuesto.id);
          if (result.success) {
            sonnerToast.success(result.message || "Facturas creadas con éxito");
          } else {
            sonnerToast.error(result.message || "Error al crear las facturas");
            console.error("Error al crear facturas:", result.message);
          }
        } catch (facturaError) {
          console.error("Error al crear facturas:", facturaError);
          sonnerToast.error(`Error al crear las facturas: ${(facturaError as Error).message}`);
        }
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
      const supabase = createClient()
      if (!supabase) {
        throw new Error("No se pudo inicializar el cliente de Supabase")
      }
      
      // Actualizar en la base de datos según tipo de presupuesto
      const tabla = presupuesto.tipo === "base" ? "presupuestos_base" : "presupuestos_finales"
      const { error } = await supabase
        .from(tabla)
        .update({ 
          aprobado: false,
          rechazado: true,
          observaciones: observacion || undefined,
          updated_at: new Date().toISOString()
        })
        .eq("id", presupuesto.id)
      
      if (error) throw error
      
      // Actualizar estado local
      if (presupuesto.tipo === "base") {
        setPresupuestoBaseLocal({
          ...presupuesto,
          aprobado: false,
          rechazado: true,
          observaciones: observacion || undefined,
          updated_at: new Date().toISOString()
        })
      } else {
        setPresupuestoFinalLocal({
          ...presupuesto,
          aprobado: false,
          rechazado: true,
          observaciones: observacion || undefined,
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
  
  // Función para crear presupuesto base rápidamente
  const handleCrearPresupuestoRapido = async () => {
    if (!materiales || !manoObra) {
      toast({
        title: "Información incompleta",
        description: "Por favor ingresa los valores de materiales y mano de obra",
        variant: "destructive",
      })
      return
    }
    
    setIsCreando(true)
    
    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error("No se pudo inicializar el cliente de Supabase")
      }
      
      const materialesNum = parseFloat(materiales)
      const manoObraNum = parseFloat(manoObra)
      const total = materialesNum + manoObraNum
      
      // Generar un código para el presupuesto base
      const prefix = "PB"
      const timestamp = new Date().getTime().toString().slice(-6)
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const code = `${prefix}-${timestamp}-${random}`
      
      // Insertar el presupuesto base
      const presupuestoData = {
        id_tarea: tareaId,
        id_administrador: id_administrador_tarea,
        id_edificio: id_edificio_tarea,
        // tipo: "base", // Eliminado: la tabla presupuestos_base ya implica el tipo
        code: code,
        materiales: materialesNum,
        mano_obra: manoObraNum,

        nota_pb: notaInterna, // nota_pb es válida para presupuestos_base
        id_supervisor: userId,

        aprobado: false
        // rechazado: false // Eliminado: el estado ya no se maneja con id_estado
      }
      
      const { data, error } = await supabase
        .from("presupuestos_base") // <-- CORREGIDO: Usar tabla correcta
        .insert(presupuestoData)
        .select()
      
      if (error) throw error
      
      // Actualizar estado local con el nuevo presupuesto
      if (data && data[0]) {
        const nuevoPresupuesto: PresupuestoType = {
          id: data[0].id as number,
          code: data[0].code as string,
          tipo: "base",
          materiales: data[0].materiales as number,
          mano_obra: data[0].mano_obra as number,
          total: data[0].total as number,
          nota_pb: data[0].nota_pb as string | undefined,
          created_at: data[0].created_at as string,
          aprobado: data[0].aprobado as boolean | undefined,
          rechazado: data[0].rechazado as boolean | undefined
        }
        
        setPresupuestoBaseLocal(nuevoPresupuesto)
        
        // Notificar éxito
        toast({
          title: "Presupuesto base creado",
          description: `Se ha creado el presupuesto base ${code} exitosamente`,
        })
        
        // Cerrar el diálogo
        setShowCrearRapido(false)
        setMateriales("")
        setManoObra("")
        setNotaInterna("")
        
        // Notificar al componente padre si es necesario
        if (onPresupuestoChange) onPresupuestoChange()
      }
      
    } catch (err) {
      console.error("Error al crear presupuesto base:", err)
      toast({
        title: "Error",
        description: `No se pudo crear el presupuesto base. ${err instanceof Error ? err.message : ""}`,
        variant: "destructive",
      })
    } finally {
      setIsCreando(false)
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
          <Card className={`${colorClase} border`}>
            <CardHeader className="py-4">
              <CardTitle className="text-base">{titulo}</CardTitle>
            </CardHeader>
            <CardContent className="py-3 flex justify-center">
              <Button size="sm" onClick={() => setShowCrearRapido(true)}>
                <Calculator className="mr-2 h-4 w-4" />
                Crear presupuesto base
              </Button>
            </CardContent>
          </Card>
        )
      }
      
      // Mostrar opción para crear presupuesto final si hay presupuesto base, no hay presupuesto final, y el usuario es admin o supervisor
      if (tipo === "final" && presupuestoBaseLocal && !presupuestoFinalLocal && (userRol === "admin" || userRol === "supervisor")) {
        return (
          <Card className={`${colorClase} border`}>
            <CardHeader className="py-4">
              <CardTitle className="text-base">{titulo}</CardTitle>
            </CardHeader>
            <CardContent className="py-3 flex justify-center">
              <Button asChild size="sm">
                {/* URL corregida y parámetros según especificación */}
                <Link href={`/dashboard/presupuestos/nuevo?tipo=final&id_padre=${presupuestoBaseLocal.id}&id_tarea=${tareaId}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Crear Presupuesto Final
                </Link>
              </Button>
            </CardContent>
          </Card>
        )
      }
      
      return null
    }
    
    // Si hay presupuesto, mostrar sus detalles
    return (
      <Card className={`${colorClase} border`}>
        <CardHeader className="py-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {titulo}
              {renderEstadoBadge(estadoPresupuesto)}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {presupuesto.code} • {formatFecha(presupuesto.created_at)}
            </p>
          </div>
          <div className="text-right">
            {presupuesto.materiales !== undefined && (
              <div className="text-sm">
                <span className="font-medium">Materiales:</span>{" "}
                <span>{formatCurrency(presupuesto.materiales)}</span>
              </div>
            )}
            {presupuesto.mano_obra !== undefined && (
              <div className="text-sm">
                <span className="font-medium">Mano de obra:</span>{" "}
                <span>{formatCurrency(presupuesto.mano_obra)}</span>
              </div>
            )}
            {presupuesto.total && (
              <div className="mt-1">
                <span className="text-sm font-medium">Total:</span>
                <p className="text-base font-semibold">
                  {formatCurrency(presupuesto.total)}
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-3 space-y-3">
          {/* Observaciones o notas si existen */}
          {(presupuesto.observaciones || presupuesto.nota_pb) && (
            <div className="text-sm bg-amber-50 px-3 py-2 rounded-md border border-amber-100 mb-3">
              <p className="font-medium text-amber-800 mb-1">Notas:</p>
              <p className="text-amber-700">
                {presupuesto.observaciones || presupuesto.nota_pb}
              </p>
            </div>
          )}
          
          {/* Acciones */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Ver presupuesto */}
            <Button asChild variant="outline" size="sm">
              <Link href={tipo === "base" ? `/dashboard/presupuestos-base/${presupuesto.id}` : `/dashboard/presupuestos-finales/${presupuesto.id}`}>
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                Ver {tipo === "base" ? "presupuesto base" : "presupuesto final"}
              </Link>
            </Button>
            
            {/* Acciones solo para admin */}
            {tipo === 'final' && userRol === "admin" && estadoPresupuesto === "pendiente" && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                  onClick={() => handleAprobarPresupuesto(presupuesto)}
                  disabled={isAprobando || isRechazando}
                >
                  {isAprobando ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                  Aprobar
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                  onClick={() => {
                    setPresupuestoARechazar(presupuesto);
                    setObservacionRechazo("");
                    setShowRechazarDialog(true);
                  }}
                  disabled={isAprobando || isRechazando}
                >
                  {isRechazando ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Ban className="mr-1 h-3.5 w-3.5" />}
                  Rechazar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
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
      
      {/* Modal para creación rápida de presupuesto base */}
      <Dialog open={showCrearRapido} onOpenChange={setShowCrearRapido}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear presupuesto base</DialogTitle>
            <DialogDescription>
              Complete la información para crear un presupuesto base rápidamente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="materiales">Costo de materiales</Label>
              <div className="flex items-center">
                <span className="mr-2">$</span>
                <Input
                  id="materiales"
                  type="number"
                  placeholder="0.00"
                  value={materiales}
                  onChange={(e) => setMateriales(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="manoObra">Costo de mano de obra</Label>
              <div className="flex items-center">
                <span className="mr-2">$</span>
                <Input
                  id="manoObra"
                  type="number"
                  placeholder="0.00"
                  value={manoObra}
                  onChange={(e) => setManoObra(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            
            {materiales && manoObra && (
              <div className="flex justify-end items-center p-2 bg-blue-50 border border-blue-100 rounded">
                <span className="mr-2 text-blue-700">Total:</span>
                <span className="font-semibold text-blue-800">
                  {formatCurrency(parseFloat(materiales || '0') + parseFloat(manoObra || '0'))}
                </span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="notas">Notas internas</Label>
              <Textarea
                id="notas"
                placeholder="Notas adicionales (opcional)"
                value={notaInterna}
                onChange={(e) => setNotaInterna(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCrearRapido(false)
                setMateriales("")
                setManoObra("")
                setNotaInterna("")
              }}
              disabled={isCreando}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCrearPresupuestoRapido}
              disabled={!materiales || !manoObra || isCreando}
            >
              {isCreando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Crear presupuesto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <h3 className="text-lg font-semibold">Presupuestos</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Presupuesto Base - visible para admins y supervisores */}
        {renderPresupuestoCard(presupuestoBaseLocal, "base")}
        
        {/* Presupuesto Final - solo visible para admins */}
        {userRol === "admin" && renderPresupuestoCard(presupuestoFinalLocal, "final")}
      </div>
    </div>
  )
}
