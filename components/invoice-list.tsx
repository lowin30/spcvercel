"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateTime } from "@/lib/utils"
import Link from "next/link"
import { Search, Download, Pencil, Trash2, CreditCard, Loader2 } from "lucide-react"
import { EstadoBadge } from "@/components/estado-badge"
import { Button } from "@/components/ui/button"
import { deleteInvoice } from "@/app/dashboard/facturas/actions"
import { toast } from "sonner"

interface Invoice {
  id: number;
  code: string;
  nombre?: string; // Nombre de la factura
  total: number; // Mapeado desde monto_total en page.tsx
  monto_total: number; // Para asegurar que el dato original esté si es necesario
  estado: string; // Usado como fallback en el badge
  id_estado_nuevo: number | null;
  created_at: string;
  pdf_url: string | null;
  pagada: boolean;
  datos_afip?: string | null;
  id_presupuesto_final?: number | null;

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
}

// Definición del tipo Estado para usar en el componente
interface Estado {
  id: number;
  nombre: string;
  color: string;
}

// Lista de estados posibles para las facturas
const estadosFactura: Estado[] = [
  { id: 1, nombre: "Borrador", color: "gray" },
  { id: 2, nombre: "No pagado", color: "yellow" },
  { id: 3, nombre: "Parcialmente pagado", color: "blue" },
  { id: 4, nombre: "Vencido", color: "red" },
  { id: 5, nombre: "Pagado", color: "green" },
  { id: 6, nombre: "Anulado", color: "gray" },
];

export function InvoiceList({ invoices: initialInvoices }: InvoiceListProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [deletingId, setDeletingId] = useState<number | null>(null)
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

  const filteredInvoices = invoices.filter((invoice) => {
    const term = searchTerm.toLowerCase();
    return (
      invoice.code.toLowerCase().includes(term) ||
      (invoice.datos_afip && invoice.datos_afip.toLowerCase().includes(term)) ||
      (invoice.presupuestos_finales?.tareas?.titulo && 
        invoice.presupuestos_finales.tareas.titulo.toLowerCase().includes(term))
    );
  });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Facturas</CardTitle>
          <CardDescription>Gestiona las facturas del sistema</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar facturas..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="rounded-md border overflow-hidden">
          <style jsx global>{`
            /* Estilos para evitar scroll horizontal en móvil */
            @media (max-width: 640px) {            
              table.invoice-table {
                width: 100%;
                table-layout: fixed;
              }
              
              /* Ocultar columnas menos importantes en móvil */
              table.invoice-table th:nth-child(2),
              table.invoice-table td:nth-child(2),
              table.invoice-table th:nth-child(3),
              table.invoice-table td:nth-child(3),
              table.invoice-table th:nth-child(6),
              table.invoice-table td:nth-child(6) {
                display: none;
              }
              
              /* Ajustar anchos de las columnas visibles */
              table.invoice-table th:nth-child(1),
              table.invoice-table td:nth-child(1) {
                width: 40%;
                white-space: normal;
                padding: 10px 5px;
              }
              
              table.invoice-table th:nth-child(4),
              table.invoice-table td:nth-child(4) {
                width: 25%;
                padding: 10px 3px;
              }
              
              table.invoice-table th:nth-child(5),
              table.invoice-table td:nth-child(5) {
                width: 15%;
                padding: 10px 2px;
                text-align: right;
              }
              
              table.invoice-table th:nth-child(7),
              table.invoice-table td:nth-child(7) {
                width: 20%;
                padding: 8px 2px;
                text-align: center;
              }
              
              /* Centra los botones de acción */
              table.invoice-table td:nth-child(7) > div {
                justify-content: center;
              }
            }
          `}</style>
          <Table className="invoice-table">
            <TableHeader>
              <TableRow>
                <TableHead>Factura</TableHead>
                <TableHead>Datos AFIP</TableHead>
                <TableHead>Presupuesto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>PDF</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No se encontraron facturas
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow 
                    key={invoice.id}
                    onClick={() => router.push(`/dashboard/facturas/${invoice.id}`)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      {/* Información de la factura y tarea asociada */}
                      {(() => {
                        // Acceder directamente al primer elemento si es un array
                        const presupuesto = Array.isArray(invoice.presupuestos_finales) 
                          ? invoice.presupuestos_finales[0] 
                          : invoice.presupuestos_finales;
                        
                        // Mostrar nombre de factura como prioridad
                        return (
                          <div>
                            <div className="font-medium">
                              {invoice.nombre || invoice.code || "Factura #" + invoice.id}
                            </div>
                            
                            {/* Información de la tarea como dato secundario si existe */}
                            {presupuesto?.tareas?.titulo && (
                              <div className="text-xs text-muted-foreground">
                                Tarea: {presupuesto.tareas.titulo}
                                {presupuesto.tareas.edificios?.nombre && (
                                  <span className="ml-1">
                                    - {presupuesto.tareas.edificios.nombre}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{invoice.datos_afip || "N/A"}</TableCell>
                    <TableCell>
                      {invoice.id_presupuesto_final ? (
                        <Link
                          href={`/dashboard/presupuestos-finales/${invoice.id_presupuesto_final}`}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()} // Evita que el clic en el enlace propague a la fila
                        >
                          Ver Presupuesto
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const estadoActual = estadosFactura.find(e => e.id === invoice.id_estado_nuevo);
                        return estadoActual ? (
                          <EstadoBadge estado={estadoActual} />
                        ) : (
                          <span>{invoice.estado || 'Sin estado'}</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">${(invoice.total || 0).toLocaleString()}</div>
                      {invoice.pagada ? (
                        <span className="text-xs text-green-600 font-medium">Pagado</span>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">Pendiente</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {invoice.pdf_url ? (
                        <a
                          href={invoice.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-primary hover:underline"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Descargar
                        </a>
                      ) : (
                        <span className="text-muted-foreground">No disponible</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                        {/* Mostrar botón de pago solo si la factura no está completamente pagada */}
                        {!invoice.pagada && (
                          <Button asChild variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" title="Generar Pago">
                            <Link href={`/dashboard/pagos/nuevo?factura_id=${invoice.id}`}>
                              <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Link>
                          </Button>
                        )}
                        <Button asChild variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" title="Editar">
                          <Link href={`/dashboard/facturas/editar/${invoice.id}`}>
                            <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 sm:h-9 sm:w-9"
                          onClick={() => handleDelete(invoice.id)}
                          title="Eliminar"
                          disabled={deletingId === invoice.id}
                        >
                          {deletingId === invoice.id ? (
                            <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
