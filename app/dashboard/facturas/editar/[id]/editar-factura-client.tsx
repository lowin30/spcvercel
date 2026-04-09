"use client"

import { useRouter } from 'next/navigation'
import { InvoiceForm } from '@/components/invoice-form'
import { FileText, ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface EditarFacturaClientProps {
  data: any;
  saveInvoiceAction: (
    data: any,
    items: any[],
    facturaIdToEdit?: number
  ) => Promise<{ success: boolean; message: string }>;
}

export function EditarFacturaClient({ data, saveInvoiceAction }: EditarFacturaClientProps) {
  const router = useRouter()

  return (
    <>
      {/* Header Platinum 💎 */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 dark:bg-white dark:text-zinc-950 text-white shadow-lg">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/facturas')} className="sm:hidden h-8 w-8 -ml-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-black tracking-tighter">Editar Factura</h1>
                <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                  Admin Mode
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                <span className="opacity-50">Gestionando:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {data.factura.code || `FA-${String(data.factura.id).padStart(6, '0')}`}
                </span>
                {data.factura.id_presupuesto_final && (
                  <>
                    <span className="mx-1 opacity-30">/</span>
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">VINCULADA</span>
                  </>
                )}
              </p>
            </div>
          </div>
          
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/facturas')} className="hidden sm:flex h-9 rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Listado
          </Button>
        </div>
      </div>

      <InvoiceForm
        presupuestos={data.presupuestos}
        factura={data.factura}
        items={data.items}
        onSave={saveInvoiceAction}
      />
    </>
  )
}
