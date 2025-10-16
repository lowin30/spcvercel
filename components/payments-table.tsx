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
import { Eye, Trash2, Calendar, User, CreditCard, Search, Filter, ArrowUpDown } from "lucide-react";
import { useTransition } from 'react';
import { deletePayment } from '@/app/dashboard/pagos/borrar-pago';
import type { EnrichedPayment } from "@/app/dashboard/pagos/page";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  
  // 🔍 Estados de filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [modalidadFilter, setModalidadFilter] = useState<string>("all");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [ordenarPor, setOrdenarPor] = useState<"fecha" | "monto">("fecha");
  const [ordenDireccion, setOrdenDireccion] = useState<"asc" | "desc">("desc");
  
  // Evitar hidratación incorrecta
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // 🔍 FILTRAR Y ORDENAR PAGOS
  const filteredPayments = payments
    .filter((payment) => {
      // Búsqueda por texto
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matches = 
          payment.factura_code?.toLowerCase().includes(searchLower) ||
          payment.tarea_titulo?.toLowerCase().includes(searchLower) ||
          payment.created_by_email?.toLowerCase().includes(searchLower) ||
          payment.modalidad_pago?.toLowerCase().includes(searchLower) ||
          payment.monto_pagado.toString().includes(searchLower);
        if (!matches) return false;
      }
      
      // Filtro por modalidad
      if (modalidadFilter !== "all" && payment.modalidad_pago !== modalidadFilter) {
        return false;
      }
      
      // Filtro por rango de fechas
      if (fechaDesde && new Date(payment.fecha_pago) < new Date(fechaDesde)) {
        return false;
      }
      if (fechaHasta && new Date(payment.fecha_pago) > new Date(fechaHasta)) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      const multiplicador = ordenDireccion === "asc" ? 1 : -1;
      
      if (ordenarPor === "fecha") {
        return (new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime()) * multiplicador;
      } else {
        return (a.monto_pagado - b.monto_pagado) * multiplicador;
      }
    });
  
  // Estadísticas
  const totalPagos = filteredPayments.length;
  const montoTotal = filteredPayments.reduce((sum, p) => sum + p.monto_pagado, 0);
  const modalidades = Array.from(new Set(payments.map(p => p.modalidad_pago).filter(Boolean)));

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
    <>
      {/* 📊 ESTADÍSTICAS */}
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPagos}</div>
            <p className="text-xs text-muted-foreground">
              de {payments.length} totales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(montoTotal)}</div>
            <p className="text-xs text-muted-foreground">
              Suma de pagos filtrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Modalidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{modalidades.length}</div>
            <p className="text-xs text-muted-foreground">
              {modalidades.join(", ") || "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 🔍 FILTROS */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-4 w-4 mr-2" /> Filtros
          </CardTitle>
          <CardDescription>Filtra y ordena los pagos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Búsqueda */}
            <div>
              <label className="text-sm font-medium mb-1 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Factura, tarea, monto..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  title="Busca en: código de factura, tarea, usuario, modalidad, monto"
                />
              </div>
            </div>

            {/* Modalidad */}
            <div>
              <label className="text-sm font-medium mb-1 block">Modalidad</label>
              <Select value={modalidadFilter} onValueChange={setModalidadFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las modalidades</SelectItem>
                  {modalidades.map((modalidad) => (
                    <SelectItem key={modalidad} value={modalidad}>
                      {modalidad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha Desde */}
            <div>
              <label className="text-sm font-medium mb-1 block">Desde</label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            {/* Fecha Hasta */}
            <div>
              <label className="text-sm font-medium mb-1 block">Hasta</label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>

          {/* Ordenamiento */}
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Ordenar por</label>
              <Select value={ordenarPor} onValueChange={(v) => setOrdenarPor(v as "fecha" | "monto")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fecha">Fecha de pago</SelectItem>
                  <SelectItem value="monto">Monto pagado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Dirección</label>
              <Select value={ordenDireccion} onValueChange={(v) => setOrdenDireccion(v as "asc" | "desc")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Más reciente primero</SelectItem>
                  <SelectItem value="asc">Más antiguo primero</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botón limpiar filtros */}
          {(searchQuery || modalidadFilter !== "all" || fechaDesde || fechaHasta) && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setModalidadFilter("all");
                  setFechaDesde("");
                  setFechaHasta("");
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TABLA/CARDS DE PAGOS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Pagos Registrados</CardTitle>
          <CardDescription>
            Mostrando {totalPagos} de {payments.length} pagos
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
                {filteredPayments && filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
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
            {filteredPayments && filteredPayments.length > 0 ? (
              <div className="space-y-3">
                {filteredPayments.map((payment) => (
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
    </>
  );
}
