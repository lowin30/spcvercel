"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Pencil, Loader2, CheckCircle2 } from "lucide-react"
import { formatDate } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { aprobarPresupuestoBase, anularAprobacionPresupuestoBase } from "../actions"
import { createClient } from "@/lib/supabase-client"

interface PresupuestoDetailClientProps {
  presupuesto: any
}

export function PresupuestoDetailClient({ presupuesto }: PresupuestoDetailClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [validatedRole, setValidatedRole] = useState<string | null>(null)
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')
  const isAdmin = validatedRole === "admin"

  useEffect(() => {
    async function verificarSesion() {
      try {
        const supabase = createClient()
        const { data, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !data.session) {
          setSessionStatus('unauthenticated')
          return
        }

        setSessionStatus('authenticated')

        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("rol")
          .eq("id", data.session.user.id)
          .single()

        if (userError || !userData) return
        setValidatedRole(userData.rol)

      } catch (error) {
        console.error("Error al verificar sesión:", error)
        setSessionStatus('unauthenticated')
      }
    }

    verificarSesion()
  }, [])

  const handleAprobar = async () => {
    if (sessionStatus !== 'authenticated') {
      toast({ title: "Error", description: "Inicia sesión.", variant: "destructive" })
      return
    }

    try {
      setIsLoading(true)
      const { error: refreshError } = await createClient().auth.refreshSession()
      if (refreshError) throw refreshError

      const result = await aprobarPresupuestoBase(presupuesto.id)

      if (result && result.success === false) {
        toast({ title: "Error", description: result.message, variant: "destructive" })
      } else {
        toast({ title: "Éxito", description: "Presupuesto enviado." })
        router.refresh()
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnularAprobacion = async () => {
    if (!isAdmin) return

    setIsLoading(true)
    try {
      const { error: refreshError } = await createClient().auth.refreshSession()
      if (refreshError) throw refreshError

      const result = await anularAprobacionPresupuestoBase(presupuesto.id)

      if (result && result.success === false) {
        toast({ title: "Error", description: result.message, variant: "destructive" })
      } else {
        toast({ title: "Éxito", description: "Envío anulado." })
        router.refresh()
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
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
                {presupuesto.aprobado ? "Enviado" : "Pendiente"}
              </Badge>
              {presupuesto.aprobado && (
                <span className="text-xs ml-2 text-muted-foreground">
                  {formatDate(presupuesto.fecha_aprobacion)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {(!presupuesto.aprobado || isAdmin) && (
            <Button variant="outline" className="flex-1 sm:flex-none" asChild>
              <Link href={`/dashboard/presupuestos-base/${presupuesto.id}/editar`}>
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </Link>
            </Button>
          )}

          {isAdmin && !presupuesto.aprobado && (
            <Button onClick={handleAprobar} disabled={isLoading} className="flex-1 sm:flex-none">
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Enviar
            </Button>
          )}

          {isAdmin && presupuesto.aprobado && (
            <Button onClick={handleAnularAprobacion} disabled={isLoading} variant="outline" className="flex-1 sm:flex-none bg-amber-50 border-amber-200 text-amber-800">
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Anular envío
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Detalles del Presupuesto</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Código</dt>
                <dd className="text-sm font-medium">{presupuesto.code}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Tarea</dt>
                <dd className="text-sm mt-1">{presupuesto.titulo_tarea}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Edificio</dt>
                <dd className="text-sm mt-1">{presupuesto.nombre_edificio}</dd>
              </div>
              <div className="pt-2 border-t">
                <dt className="text-sm font-medium text-muted-foreground">Fecha de Creación</dt>
                <dd className="text-sm mt-1">{formatDate(presupuesto.created_at)}</dd>
              </div>
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
    </div>
  )
}
