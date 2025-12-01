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
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // 🔍 Estados de filtros con valores iniciales desde localStorage
  const [searchQuery, setSearchQuery] = useState("");
  const [modalidadFilter, setModalidadFilter] = useState<string>("all");
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [edificioFilter, setEdificioFilter] = useState<string>("all");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [ordenarPor, setOrdenarPor] = useState<"fecha" | "monto" | "edificio">("fecha");
  const [ordenDireccion, setOrdenDireccion] = useState<"asc" | "desc">("desc");
  
  // Cargar filtros guardados desde localStorage al montar
  useEffect(() => {
    setIsMounted(true);
    const savedFilters = localStorage.getItem('spc_filters_pagos');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        setSearchQuery(filters.searchQuery || "");
        setModalidadFilter(filters.modalidadFilter || "all");
        setAdminFilter(filters.adminFilter || "all");
        setEdificioFilter(filters.edificioFilter || "all");
        setFechaDesde(filters.fechaDesde || "");
        setFechaHasta(filters.fechaHasta || "");
        setOrdenarPor(filters.ordenarPor || "fecha");
        setOrdenDireccion(filters.ordenDireccion || "desc");
      } catch (e) {
        // Si hay error al parsear, ignorar
      }
    }
  }, []);
  
  // Guardar filtros en localStorage cuando cambien
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('spc_filters_pagos', JSON.stringify({
        searchQuery,
        modalidadFilter,
        adminFilter,
        edificioFilter,
        fechaDesde,
        fechaHasta,
        ordenarPor,
        ordenDireccion
      }));
    }
  }, [searchQuery, modalidadFilter, adminFilter, edificioFilter, fechaDesde, fechaHasta, ordenarPor, ordenDireccion, isMounted]);
  
  // 🔍 FILTRAR Y ORDENAR PAGOS
  const filteredPayments = payments
    .filter((payment) => {
      // Búsqueda por texto inteligente (tolerante a acentos y errores de tipeo)
      if (searchQuery) {
        const matches = 
          coincideBusqueda(payment.factura_code, searchQuery) ||
          coincideBusqueda(payment.factura_datos_afip, searchQuery) ||
          coincideBusqueda(payment.tarea_titulo, searchQuery) ||
          coincideBusqueda(payment.edificio_nombre, searchQuery) ||
          coincideBusqueda(payment.administrador_nombre, searchQuery) ||
          coincideBusqueda(payment.created_by_email, searchQuery) ||
          coincideBusqueda(payment.modalidad_pago, searchQuery) ||
          coincideBusqueda(payment.monto_pagado, searchQuery);
        if (!matches) return false;
      }
      
      // Filtro por modalidad
      if (modalidadFilter !== "all" && payment.modalidad_pago !== modalidadFilter) {
        return false;
      }
      
      // Filtro por administrador
      if (adminFilter !== "all" && payment.administrador_id?.toString() !== adminFilter) {
        return false;
      }
      
      // Filtro por edificio (cascada: si hay admin seleccionado, solo mostrar edificios de ese admin)
      if (edificioFilter !== "all" && payment.edificio_id?.toString() !== edificioFilter) {
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
      } else if (ordenarPor === "monto") {
        return (a.monto_pagado - b.monto_pagado) * multiplicador;
      } else if (ordenarPor === "edificio") {
        const edificioA = a.edificio_nombre || '';
        const edificioB = b.edificio_nombre || '';
        return edificioA.localeCompare(edificioB, 'es') * multiplicador;
      }
      return 0;
    });
  
  // Estadísticas
  const totalPagos = filteredPayments.length;
  const montoTotal = filteredPayments.reduce((sum, p) => sum + p.monto_pagado, 0);
  const modalidades = Array.from(new Set(payments.map(p => p.modalidad_pago).filter(Boolean)));
  
  // Listas únicas para filtros
  const administradores = Array.from(
    new Map(
      payments
        .filter(p => p.administrador_id && p.administrador_nombre)
        .map(p => [p.administrador_id, { id: p.administrador_id!, nombre: p.administrador_nombre! }])
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));
  
  // Edificios filtrados por administrador si está seleccionado
  const edificiosDisponibles = payments.filter(p => {
    if (adminFilter !== "all") {
      return p.administrador_id?.toString() === adminFilter && p.edificio_id && p.edificio_nombre;
    }
    return p.edificio_id && p.edificio_nombre;
  });
  
  const edificios = Array.from(
    new Map(
      edificiosDisponibles.map(p => [p.edificio_id, { id: p.edificio_id!, nombre: p.edificio_nombre! }])
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));
  
  // Funciones para filtros de fecha rápida
  const setFechaHoy = () => {
    const hoy = new Date().toISOString().split('T')[0];
    setFechaDesde(hoy);
    setFechaHasta(hoy);
  };
  
  const setFechaAyer = () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const ayerStr = ayer.toISOString().split('T')[0];
    setFechaDesde(ayerStr);
    setFechaHasta(ayerStr);
  };
  
  const setFechaSemana = () => {
    const hoy = new Date();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
    setFechaDesde(lunes.toISOString().split('T')[0]);
    setFechaHasta(new Date().toISOString().split('T')[0]);
  };
  
  const setFechaMes = () => {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    setFechaDesde(primerDia.toISOString().split('T')[0]);
    setFechaHasta(hoy.toISOString().split('T')[0]);
  };
  
  const limpiarFechas = () => {
    setFechaDesde("");
    setFechaHasta("");
  };

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

      {/* 📅 FILTROS RÁPIDOS DE FECHA */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filtros rápidos de fecha</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={setFechaHoy}>
              <Calendar className="h-3 w-3 mr-1" />
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={setFechaAyer}>
              Ayer
            </Button>
            <Button variant="outline" size="sm" onClick={setFechaSemana}>
              Esta semana
            </Button>
            <Button variant="outline" size="sm" onClick={setFechaMes}>
              Este mes
            </Button>
            {(fechaDesde || fechaHasta) && (
              <Button variant="ghost" size="sm" onClick={limpiarFechas}>
                Limpiar fechas
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
              <label className="text-sm font-medium mb-1 block">Buscar 🔍✨</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Edificio, AFIP, factura..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  title="Búsqueda inteligente: ignora acentos, mayúsculas y encuentra palabras parciales. Busca en: edificio, AFIP, factura, tarea, administrador, etc."
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
                  <SelectItem value="all">Todas</SelectItem>
                  {modalidades.map((modalidad) => (
                    <SelectItem key={modalidad} value={modalidad}>
                      {modalidad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Administrador */}
            <div>
              <label className="text-sm font-medium mb-1 block">Administrador</label>
              <Select 
                value={adminFilter} 
                onValueChange={(value) => {
                  setAdminFilter(value);
                  // Resetear edificio cuando cambias admin
                  if (value !== adminFilter) {
                    setEdificioFilter("all");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {administradores.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id.toString()}>
                      {admin.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Edificio (cascada) */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Edificio {adminFilter !== "all" && <span className="text-xs text-muted-foreground">(filtrado)</span>}
              </label>
              <Select value={edificioFilter} onValueChange={setEdificioFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {edificios.length > 0 ? (
                    edificios.map((edificio) => (
                      <SelectItem key={edificio.id} value={edificio.id.toString()}>
                        {edificio.nombre}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      {adminFilter !== "all" ? "Sin edificios para este admin" : "No hay edificios"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fila de fechas */}
          <div className="grid gap-4 md:grid-cols-2 mt-4">
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
              <Select value={ordenarPor} onValueChange={(v) => setOrdenarPor(v as "fecha" | "monto" | "edificio")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fecha">Fecha de pago</SelectItem>
                  <SelectItem value="monto">Monto pagado</SelectItem>
                  <SelectItem value="edificio">Edificio</SelectItem>
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
          {(searchQuery || modalidadFilter !== "all" || adminFilter !== "all" || edificioFilter !== "all" || fechaDesde || fechaHasta) && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setModalidadFilter("all");
                  setAdminFilter("all");
                  setEdificioFilter("all");
                  setFechaDesde("");
                  setFechaHasta("");
                }}
              >
                Limpiar todos los filtros
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
                {filteredPayments && filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
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
                          {payment.factura_datos_afip && (
                            <span className="text-xs text-muted-foreground">
                              AFIP: {payment.factura_datos_afip}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{payment.edificio_nombre}</TableCell>
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
                    <TableCell colSpan={8} className="text-center h-24">
                      No se encontraron pagos con los filtros seleccionados.
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
                          <CardDescription className="mt-1 space-y-0.5">
                            {payment.factura_id ? (
                              <Link href={`/dashboard/facturas/${payment.factura_id}`} className="font-medium text-primary hover:underline text-sm block">
                                Factura: {payment.factura_code}
                              </Link>
                            ) : (
                              <span className="text-sm block">Factura: {payment.factura_code}</span>
                            )}
                            {payment.factura_datos_afip && (
                              <span className="text-xs block">
                                AFIP: {payment.factura_datos_afip}
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
                          <span className="text-muted-foreground text-xs">{payment.edificio_nombre}</span>
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
    </>
  );
}
