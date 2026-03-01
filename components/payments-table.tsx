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
// Definición del tipo para los datos enriquecidos de los pagos (v90.5)
export type EnrichedPayment = {
  id: string;
  monto_pagado: number;
  fecha_pago: string;
  modalidad_pago: string;
  factura_code: string | null;
  factura_id: string | null;
  factura_numero_afip: string | null; // OFICIAL AFIP
  edificio_cuit: string | null; // CUIT REAL
  tarea_titulo: string | null;
  edificio_id: number | null;
  edificio_nombre: string | null;
  administrador_id: number | null;
  administrador_nombre: string | null;
  created_by_email: string | null;
  tarea_codigo: string | null;
  presupuesto_total: number | null;
};

import { Eye, Trash2, Calendar, User, CreditCard, CircleDollarSign, Hash } from "lucide-react";
import { useTransition, useEffect, useState } from "react";
import { deletePayment } from '@/app/dashboard/pagos/borrar-pago';
import { useMediaQuery } from "@/hooks/use-media-query";

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

// Función para normalizar texto: quita acentos y convierte a minúsculas
const normalizarTexto = (texto: string | number | null | undefined): string => {
  if (!texto && texto !== 0) return '';

  return String(texto)
    .toLowerCase()
    // Normalizar acentos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

// Función para verificar si un texto coincide con la búsqueda (súper amigable)
const coincideBusqueda = (texto: string | number | null | undefined, busqueda: string): boolean => {
  if ((!texto && texto !== 0) || !busqueda) return false;

  const textoNormalizado = normalizarTexto(texto);
  const busquedaNormalizada = normalizarTexto(busqueda);

  // Búsqueda simple por substring (encuentra "mitre" en "Edificio Mitre 123")
  if (textoNormalizado.includes(busquedaNormalizada)) {
    return true;
  }

  // Búsqueda tolerante a errores comunes de tipeo
  const busquedaToleranteStr = busquedaNormalizada
    .replace(/[zs]/g, '[zs]')  // z y s son intercambiables
    .replace(/[mn]/g, '[mn]')  // m y n son intercambiables
    .replace(/[bp]/g, '[bp]')  // b y p son intercambiables
    .replace(/[cq]/g, '[cq]')  // c y q son intercambiables
    .replace(/ll/g, '[lly]')   // ll y y son intercambiables
    .replace(/v/g, '[vb]');    // v y b son intercambiables

  try {
    const patron = new RegExp(busquedaToleranteStr, 'i');
    return patron.test(textoNormalizado);
  } catch (e) {
    // Si falla el regex, usar includes simple
    return false;
  }
};

export default function PaymentsTable({ payments }: PaymentsTableProps) {
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

  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Renderizado simple
  return (
    <Card>
      <CardHeader className="pb-3 px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="uppercase tracking-tight text-lg sm:text-xl">pagos registrados</CardTitle>
            <CardDescription className="lowercase italic text-xs sm:text-sm">
              listado consolidado de transacciones financieras.
            </CardDescription>
          </div>

          {/* Resumen Contable Reactivo (Contabilidad Visual) */}
          <div className="flex items-center gap-3 sm:gap-6 bg-primary/5 p-2 px-3 rounded-lg border border-primary/10 self-start md:self-center">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Hash className="h-3 w-3" /> cantidad
              </span>
              <span className="text-sm sm:text-lg font-mono font-bold text-primary">
                {payments.length}
              </span>
            </div>
            
            <div className="h-8 w-[1px] bg-primary/20" />

            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <CircleDollarSign className="h-3 w-3" /> total pagado
              </span>
              <span className="text-sm sm:text-lg font-mono font-bold text-green-600">
                {formatCurrency(payments.reduce((acc, p) => acc + p.monto_pagado, 0))}
              </span>
            </div>
          </div>
        </div>
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
                  <TableHead>Edificio</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Tarea</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden lg:table-cell">Registrado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments && payments.length > 0 ? (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          {payment.factura_id ? (
                            <Link href={`/dashboard/facturas/${payment.factura_id}`} className="font-medium text-primary hover:underline">
                              {payment.factura_code}
                            </Link>
                          ) : (
                            <span className="font-medium">{payment.factura_code}</span>
                          )}
                          {payment.factura_numero_afip && (
                            <span className="text-xs text-muted-foreground">
                              afip: {payment.factura_numero_afip}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-black font-semibold text-xs md:text-sm">{payment.edificio_nombre}</span>
                          {payment.edificio_cuit && (
                            <span className="text-[10px] text-muted-foreground">cuit: {payment.edificio_cuit}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{payment.administrador_nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{payment.tarea_titulo}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(payment.monto_pagado)}</TableCell>
                      <TableCell>{formatDate(payment.fecha_pago)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{payment.created_by_email}</TableCell>
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
                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground italic">
                      no se encontraron pagos.
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
                          <CardDescription className="mt-1 space-y-0.5">
                            {payment.factura_id ? (
                              <Link href={`/dashboard/facturas/${payment.factura_id}`} className="font-medium text-primary hover:underline text-sm block">
                                Factura: {payment.factura_code}
                              </Link>
                            ) : (
                              <span className="text-sm block">Factura: {payment.factura_code}</span>
                            )}
                            {payment.factura_numero_afip && (
                              <span className="text-xs block text-muted-foreground">
                                afip: {payment.factura_numero_afip}
                              </span>
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
                          <span className="h-4 w-4 text-center text-gray-400">🏢</span>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs">{payment.edificio_nombre}</span>
                            {payment.edificio_cuit && (
                              <span className="text-[10px] text-muted-foreground/70">cuit: {payment.edificio_cuit}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-muted-foreground text-xs">{payment.administrador_nombre}</span>
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
