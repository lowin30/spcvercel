"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Edit, Loader2, CheckCircle2 } from "lucide-react"
import { formatDate } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { aprobarPresupuestoBase, anularAprobacionPresupuestoBase } from "../actions"
import { createClient } from "@/lib/supabase-client"

interface PresupuestoDetailClientProps {
  presupuesto: any
  userRole: string
}

export function PresupuestoDetailClient({ presupuesto, userRole }: PresupuestoDetailClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [validatedRole, setValidatedRole] = useState<string | null>(null)
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')
  const isAdmin = validatedRole === "admin" // Usamos el rol validado en tiempo real
  
  // Verificar sesión y rol del usuario en tiempo real
  useEffect(() => {
    async function verificarSesion() {
      try {
        // Usar el cliente singleton para consistencia
        const supabase = createClient()
        
        // Verificar sesión activa
        const { data, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !data.session) {
          console.error("Error de sesión o no hay sesión activa:", sessionError)
          setSessionStatus('unauthenticated')
          return
        }
        
        setSessionStatus('authenticated')
        console.log("Sesión activa confirmada", data.session.user.email)
        
        // Obtener y verificar rol del usuario
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("rol")
          .eq("id", data.session.user.id)
          .single()
          
        if (userError || !userData) {
          console.error("Error al obtener datos del usuario:", userError)
          return
        }
        
        // Guardar el rol validado
        setValidatedRole(userData.rol)
        console.log("Rol de usuario verificado:", userData.rol, "- Usuario ID:", data.session.user.id)
        
      } catch (error) {
        console.error("Error al verificar sesión:", error)
        setSessionStatus('unauthenticated')
      }
    }
    
    verificarSesion()
  }, [])
  
  // Función para manejar la aprobación del presupuesto
  const handleAprobar = async () => {
    // Verificar sesión activa y permisos de administrador
    if (sessionStatus !== 'authenticated') {
      toast({
        title: "Permiso denegado",
        description: "Solo los administradores pueden aprobar presupuestos base.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      console.log("Iniciando proceso de aprobación desde el cliente para presupuesto:", presupuesto.id)
      
      // IMPORTANTE: Forzamos un refresh de la sesión antes de continuar
      const { data: refreshData, error: refreshError } = await createClient().auth.refreshSession()
      
      if (refreshError) {
        console.error("Error al refrescar sesión:", refreshError)
        toast({
          title: "Error de sesión",
          description: "No se pudo refrescar tu sesión. Por favor, vuelve a iniciar sesión.",
          variant: "destructive",
        })
        setIsLoading(false)
        router.push("/login")
        return
      }
      
      // Verificamos que tenemos sesión activa después del refresh
      const { data, error } = await createClient().auth.getSession()
      
      if (error) {
        console.error("Error al obtener sesión:", error)
        toast({
          title: "Error de sesión",
          description: "Error al verificar tu sesión. Por favor, vuelve a iniciar sesión.",
          variant: "destructive",
        })
        setIsLoading(false)
        router.push("/login")
        return
      }
      
      if (!data.session) {
        toast({
          title: "Error de sesión",
          description: "No se pudo confirmar tu sesión. Por favor, vuelve a iniciar sesión.",
          variant: "destructive",
        })
        setIsLoading(false)
        router.push("/login")
        return
      }
      
      // Imprimimos información detallada sobre la sesión actual para diagnosticar el problema
      console.log("Intentando aprobar presupuesto id:", presupuesto.id, "con rol validado:", validatedRole)
      console.log("Sesión confirmada para usuario:", data.session.user.email)
      console.log("Token de sesión disponible:", !!data.session.access_token)
      
      // Llamamos a la Server Action con el ID del presupuesto
      const result = await aprobarPresupuestoBase(presupuesto.id)
      
      // Manejo de resultado como objeto con success y message
      if (result && result.success === false) {
        console.error("Error en respuesta del servidor:", result.message)
        
        // Si el error es de sesión, redirigir al login
        if (result.message?.includes("sesión") || result.message?.includes("autenticación")) {
          toast({
            title: "Error de sesión",
            description: "Tu sesión ha caducado. Por favor, vuelve a iniciar sesión.",
            variant: "destructive",
          })
          router.push("/login")
          return
        }
        
        toast({
          title: "Error",
          description: result.message || "Ocurrió un error al aprobar el presupuesto.",
          variant: "destructive",
        })
      } else if (result && result.success === true) {
        console.log("Presupuesto aprobado exitosamente:", result.message)
        toast({
          title: "¡Presupuesto aprobado!",
          description: "El presupuesto base ha sido aprobado correctamente y el estado de la tarea ha sido actualizado.",
        })
        // Refrescamos la página para mostrar los cambios
        router.refresh()
      } else {
        throw new Error("Respuesta inesperada del servidor")
      }
    } catch (error: any) {
      console.error("Error al intentar aprobar presupuesto:", error)
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error inesperado al aprobar el presupuesto.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para anular la aprobación del presupuesto (solo admin)
  const handleAnularAprobacion = async () => {
    // Verificar sesión activa y permisos de administrador
    if (sessionStatus !== 'authenticated') {
      toast({
        title: "Error de sesión",
        description: "Tu sesión ha caducado. Por favor, vuelve a iniciar sesión.",
        variant: "destructive",
      })
      router.push("/login")
      return
    }
    
    // Verificar explícitamente que es usuario con rol admin
    if (!isAdmin) {
      toast({
        title: "Permiso denegado",
        description: "Solo los usuarios con rol admin pueden anular la aprobación de presupuestos base.",
        variant: "destructive",
      })
      return
    }
    
    setIsLoading(true)
    try {
      // Verificamos nuevamente la sesión justo antes de hacer la llamada al servidor
      const supabase = getSupabaseClient()
      const { data } = await supabase.auth.getSession()
      
      if (!data.session) {
        toast({
          title: "Error de sesión",
          description: "No se pudo confirmar tu sesión. Por favor, vuelve a iniciar sesión.",
          variant: "destructive",
        })
        setIsLoading(false)
        router.push("/login")
        return
      }
      
      console.log("Intentando anular aprobación del presupuesto id:", presupuesto.id, "con rol validado:", validatedRole)
      console.log("Sesión confirmada para usuario:", data.session.user.email)
            // Forzamos un refresh de la sesión antes de continuar
      const { error: refreshError } = await createClient().auth.refreshSession()

      if (refreshError) {
        console.error("Error al refrescar sesión:", refreshError)
        toast({
          title: "Error de sesión",
          description: "No se pudo refrescar tu sesión. Por favor, vuelve a iniciar sesión.",
          variant: "destructive",
        })
        setIsLoading(false)
        router.push("/login")
        return
      }

      const result = await anularAprobacionPresupuestoBase(presupuesto.id)
      
      // Manejo de resultado como objeto con success y message
      if (result && result.success === false) {
        console.error("Error en respuesta del servidor:", result.message)
        
        // Si el error es de sesión, redirigir al login
        if (result.message?.includes("sesión") || result.message?.includes("autenticación")) {
          toast({
            title: "Error de sesión",
            description: "Tu sesión ha caducado. Por favor, vuelve a iniciar sesión.",
            variant: "destructive",
          })
          router.push("/login")
          return
        }
        
        toast({
          title: "Error",
          description: result.message || "Ocurrió un error al anular la aprobación.",
          variant: "destructive",
        })
      } else if (result && result.success === true) {
        console.log("Aprobación anulada exitosamente:", result.message)
        toast({
          title: "Aprobación anulada",
          description: "Se ha anulado la aprobación del presupuesto base y el estado de la tarea ha sido actualizado.",
        })
        // Refrescamos la página para mostrar los cambios
        router.refresh()
      } else {
        throw new Error("Respuesta inesperada del servidor")
      }
    } catch (error: any) {
      console.error("Error al intentar anular aprobación:", error)
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error inesperado al anular la aprobación.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header con título y acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" asChild>
            <Link href="/dashboard/presupuestos-base">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Presupuesto Base: {presupuesto.code}
            </h1>
            <div className="flex items-center mt-1">
              <Badge className={presupuesto.aprobado ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                {presupuesto.aprobado ? "Aprobado" : "Pendiente"}
              </Badge>
              {presupuesto.aprobado && (
                <span className="text-xs ml-2 text-muted-foreground">
                  {formatDate(presupuesto.fecha_aprobacion)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Botón de editar (visible si no está aprobado o es admin) */}
          {(!presupuesto.aprobado || isAdmin) && (
            <Button variant="outline" className="flex-1 sm:flex-none" asChild>
              <Link href={`/dashboard/presupuestos-base/${presupuesto.id}/editar`}>
                <Edit className="h-4 w-4 mr-2" /> Editar
              </Link>
            </Button>
          )}
          
          {/* Botón de aprobar (solo admin y si no está aprobado) */}
          {isAdmin && !presupuesto.aprobado && (
            <Button 
              onClick={handleAprobar}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Aprobar
            </Button>
          )}
          
          {/* Botón de anular aprobación (solo admin y si está aprobado) */}
          {isAdmin && presupuesto.aprobado && (
            <Button 
              onClick={handleAnularAprobacion}
              disabled={isLoading}
              variant="outline"
              className="flex-1 sm:flex-none bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Anular aprobación
            </Button>
          )}
        </div>
      </div>

      {/* Información del presupuesto */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Detalles del Presupuesto</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Código</dt>
                <dd className="text-sm font-medium">{presupuesto.code || "Sin código"}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Tarea</dt>
                <dd className="text-sm mt-1">
                  {presupuesto.tareas?.titulo || "Sin tarea"} 
                  {presupuesto.tareas?.code ? `(${presupuesto.tareas.code})` : ""}
                </dd>
              </div>
              
              {presupuesto.tareas?.edificios?.nombre && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Edificio</dt>
                  <dd className="text-sm mt-1">{presupuesto.tareas.edificios.nombre}</dd>
                </div>
              )}
              
              <div className="pt-2 border-t">
                <dt className="text-sm font-medium text-muted-foreground">Fecha de Creación</dt>
                <dd className="text-sm mt-1">{formatDate(presupuesto.created_at)}</dd>
              </div>
              
              {presupuesto.fecha_aprobacion && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Fecha de Aprobación</dt>
                  <dd className="text-sm mt-1">{formatDate(presupuesto.fecha_aprobacion)}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Montos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="grid grid-cols-2">
                <dt className="text-sm font-medium text-muted-foreground">Materiales</dt>
                <dd className="text-sm text-right">{formatCurrency(presupuesto.materiales || 0)}</dd>
              </div>
              
              <div className="grid grid-cols-2">
                <dt className="text-sm font-medium text-muted-foreground">Mano de Obra</dt>
                <dd className="text-sm text-right">{formatCurrency(presupuesto.mano_obra || 0)}</dd>
              </div>
              
              <div className="grid grid-cols-2 border-t pt-2">
                <dt className="text-sm font-medium">Total</dt>
                <dd className="text-right font-bold">{formatCurrency(presupuesto.total || 0)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Notas */}
      {presupuesto.nota_pb && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Notas Internas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{presupuesto.nota_pb}</p>
          </CardContent>
        </Card>
      )}

      {/* Observaciones */}
      {presupuesto.observaciones && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{presupuesto.observaciones}</p>
          </CardContent>
        </Card>
      )}

      {/* Descripción de la tarea */}
      {presupuesto.tareas?.descripcion && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Descripción de la Tarea</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{presupuesto.tareas.descripcion}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
