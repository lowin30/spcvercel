import { Suspense } from 'react';
import PaymentsTable from '@/components/payments-table';
import { redirect } from 'next/navigation';
import { getPagos, getFiltrosMetadata } from './loader';
import { validateSessionAndGetUser } from '@/lib/auth-bridge';
import { PagosFilterBar } from './pagos-filter-bar';
import { ExportPagosButton } from '@/components/export-pagos-button';

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    desde?: string;
    hasta?: string;
    adm?: string;
    edificio?: string;
    mod?: string;
    sort?: string;
  }>;
}) {
  // Await searchParams as required by Next.js 15
  const resolvedParams = await searchParams;

  // 1. Validacion de sesion y rol via bridge (Estandar SPC)
  const user = await validateSessionAndGetUser();

  if (user.rol !== "admin") {
    return redirect("/dashboard");
  }

  // 2. Carga de datos y metadata en paralelo
  const [rawPayments, metadata] = await Promise.all([
    getPagos({
      q: resolvedParams.q,
      desde: resolvedParams.desde,
      hasta: resolvedParams.hasta,
      adm: resolvedParams.adm,
      edificio: resolvedParams.edificio,
      mod: resolvedParams.mod,
      sort: resolvedParams.sort,
    }),
    getFiltrosMetadata()
  ]);

  // Extraer modalidades únicas para el filtro
  const modalidades = Array.from(new Set(rawPayments.map(p => p.modalidad).filter(Boolean)));

  // Obtener el nombre del administrador seleccionado para el reporte
  const selectedAdmin = resolvedParams.adm && resolvedParams.adm !== 'all'
    ? metadata.administradores.find(a => a.id.toString() === resolvedParams.adm)?.nombre
    : undefined;

  // 3. Mapeo para compatibilidad con PaymentsTable legacy
  const payments = rawPayments.map(p => ({
    id: p.id_pago.toString(),
    monto_pagado: p.monto_pago,
    fecha_pago: p.fecha_pago,
    modalidad_pago: p.modalidad,
    factura_code: p.factura_interno,
    factura_id: p.id_factura.toString(),
    factura_numero_afip: p.factura_numero_afip, // OFICIAL AFIP
    edificio_cuit: p.edificio_cuit, // CUIT real del edificio
    tarea_titulo: p.tarea_titulo,
    edificio_id: p.edificio_id,
    edificio_nombre: p.edificio_nombre,
    administrador_id: p.administrador_id,
    administrador_nombre: p.administrador_nombre,
    created_by_email: 'Sistema',
    tarea_codigo: p.tarea_codigo,
    presupuesto_total: p.presupuesto_total_aprobado
  }));

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight uppercase">historial de pagos</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1 lowercase italic">
            trazabilidad total: administradores, edificios, tareas y presupuestos.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <ExportPagosButton
            pagos={rawPayments}
            nombreAdministrador={selectedAdmin}
            rangoFechas={{ desde: resolvedParams.desde, hasta: resolvedParams.hasta }}
          />
        </div>
      </div>

      <Suspense fallback={<div className="h-20 bg-muted/20 animate-pulse rounded-xl" />}>
        <PagosFilterBar
          administradores={metadata.administradores}
          edificios={metadata.edificios}
          modalidades={modalidades}
        />
      </Suspense>

      <PaymentsTable payments={payments as any} />
    </div>
  );
}
