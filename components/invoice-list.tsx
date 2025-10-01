"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateTime } from "@/lib/utils"
import Link from "next/link"
import { Download, Pencil, Trash2, CreditCard, Loader2, Send } from "lucide-react"
import { EstadoBadge } from "@/components/estado-badge"
import { Button } from "@/components/ui/button"
import { deleteInvoice } from "@/app/dashboard/facturas/actions"
import { marcarFacturaComoEnviada } from "@/app/dashboard/facturas/actions-envio"
import { toast } from "sonner"

interface Invoice {
  id: number;
  code: string;
  nombre?: string; // Nombre de la factura
  total: number; // Monto total de la factura
  monto_total: number; // Para asegurar que el dato original esté si es necesario
  estado: string; // Usado como fallback en el badge
  id_estado_nuevo: number | null;
  created_at: string;
  pdf_url: string | null;
  pagada: boolean;
  enviada?: boolean;
  fecha_envio?: string | null;
  datos_afip?: string | null;
  id_presupuesto_final?: number | null;

  // Nuevos campos de la vista actualizada
  saldo_pendiente?: number | string; // Saldo pendiente de pago
  total_pagado?: number | string; // Total pagado hasta el momento
  
  // Datos del edificio/cliente
  nombre_edificio?: string | null;
  direccion_edificio?: string | null;
  cuit_edificio?: string | null;

  // Estructura anidada esperada cuando la carga de datos esté completa
  presupuestos_finales?: {
    id_tarea?: number | null;
    tareas?: {
      titulo?: string | null;
      edificios?: {
        nombre?: string | null;
      } | null;
    } | null;
  } | null;

  // Para el enlace "Generar Liquidación"
  id_presupuesto_base_calculado?: number; 
}

interface InvoiceListProps {
  invoices: Invoice[]
  estados?: Estado[] // Estados opcionales desde la página
}

// Definición del tipo Estado para usar en el componente
interface Estado {
  id: number;
  nombre: string;
  color: string;
}

export function InvoiceList({ invoices: initialInvoices, estados: estadosProp }: InvoiceListProps) {
  // Usar estados de props si están disponibles, sino usar hardcodeados
  // NOTA: Los estados de FACTURAS son diferentes a los de PRESUPUESTOS
  const estadosFactura = estadosProp && estadosProp.length > 0 ? estadosProp : [
    { id: 1, nombre: "Borrador", color: "gray" },
    { id: 2, nombre: "No pagado", color: "yellow" },
    { id: 3, nombre: "Parcialmente pagado", color: "blue" },
    { id: 4, nombre: "Vencido", color: "red" },
    { id: 5, nombre: "Pagado", color: "green" },
    { id: 6, nombre: "Anulado", color: "gray" },
    { id: 7, nombre: "Enviado", color: "#6366f1" }, // Indigo - ID puede variar
  ];
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [enviandoId, setEnviandoId] = useState<number | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)

  // Actualizar las facturas cuando cambien las props
  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  const handleDelete = async (invoiceId: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta factura? Esta acción no se puede deshacer.")) {
      return
    }

    setDeletingId(invoiceId)
    try {
      const result = await deleteInvoice(invoiceId)
      if (result.success) {
        toast.success(result.message || "Factura eliminada con éxito.")
        // Actualizar el estado local para reflejar la eliminación
        setInvoices(invoices.filter(invoice => invoice.id !== invoiceId))
        // Forzar una actualización de la ruta actual
        router.refresh()
      } else {
        toast.error(result.message || "No se pudo eliminar la factura.")
      }
    } catch (error) {
      toast.error("Ocurrió un error inesperado.")
    } finally {
      setDeletingId(null)
    }
  }

  const handleMarcarComoEnviada = async (invoiceId: number) => {
    if (!confirm("¿Marcar esta factura como enviada?")) {
      return
    }

    setEnviandoId(invoiceId)
    try {
      const result = await marcarFacturaComoEnviada(invoiceId)
      if (result.success) {
        toast.success(result.message || "Factura marcada como enviada")
        // Actualizar la lista de facturas localmente
        setInvoices(prevInvoices => 
          prevInvoices.map(inv => 
            inv.id === invoiceId 
              ? { ...inv, enviada: true, fecha_envio: new Date().toISOString() }
              : inv
          )
        )
      } else {
        toast.error(result.message || "No se pudo marcar como enviada")
      }
    } catch (error) {
      toast.error("Ocurrió un error inesperado")
    } finally {
      setEnviandoId(null)
    }
  }

  // Las facturas ya vienen filtradas desde la página principal
  const filteredInvoices = invoices;

  // Función auxiliar para formatear moneda
  const formatCurrency = (amount: number | string | null) => {
    if (!amount) return '$0'
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return `$${numAmount.toLocaleString('es-AR')}`
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Facturas</CardTitle>
          <CardDescription>Gestiona las facturas del sistema</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {/* Tabla para Desktop */}
        <div className="hidden lg:block rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Factura</TableHead>
                <TableHead className="w-[100px]">AFIP</TableHead>
                <TableHead className="w-[150px]">Estado</TableHead>
                <TableHead className="w-[120px] text-right">Total</TableHead>
                <TableHead className="w-[120px] text-right">Saldo</TableHead>
                <TableHead className="w-[200px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No se encontraron facturas
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice: any) => {
                  // Calcular el saldo pendiente
                  const saldoPendiente = typeof invoice.saldo_pendiente === 'string' 
                    ? parseFloat(invoice.saldo_pendiente) 
                    : (invoice.saldo_pendiente || 0);
                  
                  return (
                  <TableRow 
                    key={invoice.id}
                    onClick={() => router.push(`/dashboard/facturas/${invoice.id}`)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    {/* 1. NOMBRE DE FACTURA */}
                    <TableCell>
                      <div>
                        <div className="font-semibold">
                          {invoice.nombre || invoice.code || `Factura #${invoice.id}`}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground mt-1">
                          {invoice.code}
                        </div>
                      </div>
                    </TableCell>

                    {/* 2. AFIP */}
                    <TableCell>
                      <span className="font-mono text-sm">
                        {invoice.datos_afip || 'N/A'}
                      </span>
                    </TableCell>

                    {/* 3. ESTADO */}
                    <TableCell>
                      {(() => {
                        const estadoActual = estadosFactura.find(e => e.id === invoice.id_estado_nuevo);
                        return estadoActual ? (
                          <EstadoBadge estado={estadoActual} />
                        ) : (
                          <span className="text-muted-foreground">Sin estado</span>
                        );
                      })()}
                    </TableCell>

                    {/* 4. TOTAL */}
                    <TableCell className="text-right">
                      <div className="font-semibold tabular-nums">
                        {formatCurrency(invoice.total)}
                      </div>
                    </TableCell>

                    {/* 5. SALDO PENDIENTE */}
                    <TableCell className="text-right">
                      <div className={`font-semibold tabular-nums ${
                        saldoPendiente === 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {formatCurrency(saldoPendiente)}
                        {saldoPendiente === 0 && <span className="ml-1">✓</span>}
                        {saldoPendiente > 0 && <span className="ml-1">⚠️</span>}
                      </div>
                    </TableCell>

                    {/* 6. ACCIONES */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* PDF */}
                        {invoice.pdf_url && (
                          <Button asChild variant="outline" size="icon" className="h-8 w-8" title="Descargar PDF">
                            <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        
                        {/* Pago (solo si no está pagada) */}
                        {!invoice.pagada && (
                          <Button asChild variant="outline" size="icon" className="h-8 w-8" title="Generar Pago">
                            <Link href={`/dashboard/pagos/nuevo?factura_id=${invoice.id}`}>
                              <CreditCard className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        
                        {/* Enviar (solo si no enviada) */}
                        {!invoice.enviada && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleMarcarComoEnviada(invoice.id)}
                            title="Marcar como Enviada"
                            disabled={enviandoId === invoice.id}
                          >
                            {enviandoId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        
                        {/* Editar */}
                        <Button asChild variant="outline" size="icon" className="h-8 w-8" title="Editar">
                          <Link href={`/dashboard/facturas/editar/${invoice.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        
                        {/* Eliminar */}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDelete(invoice.id)}
                          title="Eliminar"
                          disabled={deletingId === invoice.id}
                        >
                          {deletingId === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
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

        {/* Cards para Móvil */}
        <div className="lg:hidden space-y-4">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron facturas
            </div>
          ) : (
            filteredInvoices.map((invoice: any) => {
              const saldoPendiente = typeof invoice.saldo_pendiente === 'string' 
                ? parseFloat(invoice.saldo_pendiente) 
                : (invoice.saldo_pendiente || 0);
              const estadoActual = estadosFactura.find(e => e.id === invoice.id_estado_nuevo);

              return (
                <Card 
                  key={invoice.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/dashboard/facturas/${invoice.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {invoice.nombre || invoice.code || `Factura #${invoice.id}`}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1 font-mono">
                          {invoice.code}
                        </CardDescription>
                      </div>
                      {estadoActual && (
                        <EstadoBadge estado={estadoActual} />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Datos principales */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs">AFIP</div>
                        <div className="font-mono font-medium">{invoice.datos_afip || 'N/A'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground text-xs">Total</div>
                        <div className="font-semibold">{formatCurrency(invoice.total)}</div>
                      </div>
                    </div>

                    {/* Saldo */}
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
                      <span className="text-sm font-medium">Saldo Pendiente</span>
                      <span className={`font-bold text-base ${
                        saldoPendiente === 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(saldoPendiente)}
                        {saldoPendiente === 0 ? ' ✓' : ' ⚠️'}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                      {invoice.pdf_url && (
                        <Button asChild variant="outline" size="sm" className="flex-1">
                          <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </a>
                        </Button>
                      )}
                      {!invoice.pagada && (
                        <Button asChild variant="outline" size="sm" className="flex-1">
                          <Link href={`/dashboard/pagos/nuevo?factura_id=${invoice.id}`}>
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pago
                          </Link>
                        </Button>
                      )}
                      <Button asChild variant="outline" size="icon" className="h-9 w-9">
                        <Link href={`/dashboard/facturas/editar/${invoice.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      {!invoice.enviada && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => handleMarcarComoEnviada(invoice.id)}
                          disabled={enviandoId === invoice.id}
                        >
                          {enviandoId === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handleDelete(invoice.id)}
                        disabled={deletingId === invoice.id}
                      >
                        {deletingId === invoice.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
