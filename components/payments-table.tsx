"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye, Trash2, Calendar, User, CreditCard } from "lucide-react";
import { useTransition } from 'react';
import { deletePayment } from '@/app/dashboard/pagos/actions';
import type { EnrichedPayment } from "@/app/dashboard/pagos/page";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useEffect, useState } from "react";

interface PaymentsTableProps {
  payments: EnrichedPayment[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function PaymentsTable({ payments }: PaymentsTableProps) {
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // Evitar hidratación incorrecta
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDelete = async (paymentId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este pago? Esta acción no se puede deshacer.')) {
      startTransition(async () => {
        const result = await deletePayment(paymentId);
        if (result?.message) {
          alert(result.message);
        }
      });
    }
  };

  // Usar Vista Desktop (tabla) o Mobile (tarjetas) según el breakpoint
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Pagos Registrados</CardTitle>
        <CardDescription>
          Se encontraron {payments.length} pagos.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 pt-0">
        {!isMounted || !isMobile ? (
          // Vista Desktop - Tabla
          <div className="hidden sm:block overflow-auto">
            <style jsx global>{`
              /* Ajustes para tablets (tamaños intermedios) */
              @media (min-width: 641px) and (max-width: 1023px) {
                table.payments-table {
                  width: 100%;
                  table-layout: fixed;
                }
                
                /* Ocultar columna menos importante */
                table.payments-table th:nth-child(5),
                table.payments-table td:nth-child(5) {
                  display: none;
                }
                
                /* Ajustar anchos de columnas */
                table.payments-table th:nth-child(1),
                table.payments-table td:nth-child(1) {
                  width: 20%;
                }
                
                table.payments-table th:nth-child(2),
                table.payments-table td:nth-child(2) {
                  width: 30%;
                  white-space: normal;
                }
                
                table.payments-table th:nth-child(3),
                table.payments-table td:nth-child(3) {
                  width: 15%;
                }
                
                table.payments-table th:nth-child(4),
                table.payments-table td:nth-child(4) {
                  width: 20%;
                }
                
                table.payments-table th:nth-child(6),
                table.payments-table td:nth-child(6) {
                  width: 15%;
                }
              }
            `}</style>
            <Table className="payments-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Factura</TableHead>
                  <TableHead>Tarea</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Registrado por</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments && payments.length > 0 ? (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {payment.factura_id ? (
                          <Link href={`/dashboard/facturas/${payment.factura_id}`} className="font-medium text-primary hover:underline">
                            {payment.factura_code}
                          </Link>
                        ) : (
                          <span>{payment.factura_code}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{payment.tarea_titulo}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(payment.monto_pagado)}</TableCell>
                      <TableCell>{formatDate(payment.fecha_pago)}</TableCell>
                      <TableCell className="text-muted-foreground">{payment.created_by_email}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {payment.factura_id && (
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/dashboard/facturas/${payment.factura_id}`}>
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Ver Factura</span>
                              </Link>
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(payment.id)} disabled={isPending}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                            <span className="sr-only">Eliminar Pago</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      No se encontraron pagos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          // Vista Mobile - Cards
          <div className="block sm:hidden p-3">
            {payments && payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <Card key={payment.id} className="overflow-hidden bg-muted/10 border shadow-sm">
                    <CardHeader className="p-4 pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-1">
                            <span className="font-mono">{formatCurrency(payment.monto_pagado)}</span>
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {payment.factura_id ? (
                              <Link href={`/dashboard/facturas/${payment.factura_id}`} className="font-medium text-primary hover:underline text-sm">
                                Factura: {payment.factura_code}
                              </Link>
                            ) : (
                              <span className="text-sm">Factura: {payment.factura_code}</span>
                            )}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {payment.modalidad_pago}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(payment.fecha_pago)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gray-400" />
                          <span>{payment.tarea_titulo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-muted-foreground text-xs">{payment.created_by_email}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t p-2 flex justify-end gap-2 bg-muted/20">
                      {payment.factura_id && (
                        <Button variant="outline" size="sm" asChild className="h-8 px-2">
                          <Link href={`/dashboard/facturas/${payment.factura_id}`}>
                            <Eye className="h-3 w-3 mr-1" />
                            <span className="text-xs">Ver factura</span>
                          </Link>
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(payment.id)} 
                        disabled={isPending} 
                        className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        <span className="text-xs">Eliminar</span>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No se encontraron pagos.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
