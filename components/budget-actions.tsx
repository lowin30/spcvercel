"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CheckCircle, FileText, Loader2, PenSquare } from "lucide-react"
import Link from "next/link"

interface Budget {
  id: number
  code: string
  tipo: string
  id_tarea: number
  aprobado: boolean
  materiales: number
  mano_obra: number
}

interface BudgetActionsProps {
  budget: Budget
  userRole: string
  hasInvoice: boolean
}

export function BudgetActions({ budget, userRole, hasInvoice }: BudgetActionsProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  const handleApprove = async () => {
    setIsApproving(true)

    try {
      const { error } = await supabase.from("presupuestos").update({ aprobado: true }).eq("id", budget.id)

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: "Presupuesto aprobado",
        description: "El presupuesto ha sido aprobado correctamente",
      })

      router.refresh()
    } catch (error) {
      console.error("Error al aprobar presupuesto:", error)
      toast({
        title: "Error",
        description: "No se pudo aprobar el presupuesto",
        variant: "destructive",
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleCreateInvoice = async () => {
    setIsCreatingInvoice(true)

    try {
      // Calcular el total
      const total = budget.materiales + budget.mano_obra

      // Crear factura
      const { data: factura, error } = await supabase
        .from("facturas")
        .insert({
          id_presupuesto: budget.id,
          total,
          estado: "pendiente",
        })
        .select("id")
        .single()

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: "Factura creada",
        description: "La factura ha sido creada correctamente",
      })

      // Redirigir a la factura
      router.push(`/dashboard/facturas/${factura.id}`)
    } catch (error) {
      console.error("Error al crear factura:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la factura",
        variant: "destructive",
      })
    } finally {
      setIsCreatingInvoice(false)
    }
  }

  // Determinar qué acciones mostrar según el rol y estado
  const canApprove =
    !budget.aprobado &&
    ((userRole === "supervisor" && budget.tipo === "base") || (userRole === "admin" && budget.tipo === "final"))

  const canCreateFinalBudget = budget.aprobado && budget.tipo === "base" && userRole === "admin"

  const canCreateInvoice = budget.aprobado && budget.tipo === "final" && userRole === "admin" && !hasInvoice

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones</CardTitle>
        <CardDescription>Opciones disponibles para este presupuesto</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canApprove && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full" disabled={isApproving}>
                {isApproving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Aprobar Presupuesto
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmar aprobación?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. El presupuesto quedará aprobado y no podrá modificarse.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleApprove}>Aprobar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {canCreateFinalBudget && (
          <Button asChild className="w-full">
            <Link href={`/dashboard/presupuestos-finales/nuevo?tipo=final&id_padre=${budget.id}&id_tarea=${budget.id_tarea}`}>
              <PenSquare className="mr-2 h-4 w-4" />
              Crear Presupuesto Final
            </Link>
          </Button>
        )}

        {canCreateInvoice && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full" disabled={isCreatingInvoice}>
                {isCreatingInvoice ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Generar Factura
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Generar factura?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se creará una factura basada en este presupuesto por un total de $
                  {(budget.materiales + budget.mano_obra).toLocaleString()}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleCreateInvoice}>Generar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" asChild className="w-full">
          <Link href={`/dashboard/presupuestos-finales/editar/${budget.id}`}>Editar ítems</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
