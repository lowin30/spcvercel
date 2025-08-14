"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase-provider"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Calculator, CheckCircle, Loader2 } from "lucide-react"
import Link from "next/link"

interface Invoice {
  id: number
  code: string
  estado: string
  total: number
  presupuestos: {
    id: number
    id_padre: number
  }
}

interface InvoiceActionsProps {
  invoice: Invoice
  hasSettlement: boolean
}

export function InvoiceActions({ invoice, hasSettlement }: InvoiceActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  const handleMarkAsPaid = async () => {
    setIsUpdating(true)

    try {
      const { error } = await supabase.from("facturas").update({ estado: "pagada" }).eq("id", invoice.id)

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: "Factura actualizada",
        description: "La factura ha sido marcada como pagada",
      })

      router.refresh()
    } catch (error) {
      console.error("Error al actualizar factura:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la factura",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const canMarkAsPaid = invoice.estado === "pendiente"
  const canCreateSettlement = invoice.estado === "pagada" && !hasSettlement

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones</CardTitle>
        <CardDescription>Opciones disponibles para esta factura</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canMarkAsPaid && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full" disabled={isUpdating}>
                {isUpdating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Marcar como Pagada
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmar pago?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción marcará la factura como pagada. ¿Desea continuar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleMarkAsPaid}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {canCreateSettlement && (
          <Button asChild className="w-full">
            <Link
              href={`/dashboard/liquidaciones/nueva?id_factura=${invoice.id}&id_presupuesto_final=${invoice.presupuestos.id}&id_presupuesto_base=${invoice.presupuestos.id_padre}`}
            >
              <Calculator className="mr-2 h-4 w-4" />
              Crear Liquidación
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
