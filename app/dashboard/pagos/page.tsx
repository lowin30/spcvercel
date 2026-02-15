import PaymentsTable from '@/components/payments-table';
import { redirect } from 'next/navigation';
import { getPagos, getFiltrosMetadata } from './loader';
import { validateSessionAndGetUser } from '@/lib/auth-bridge';
import { PagosFilterBar } from './pagos-filter-bar';

export default async function PagosPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    desde?: string;
    hasta?: string;
    adm?: string;
    edificio?: string;
    mod?: string;
    sort?: string;
  };
}) {
  // 1. Validacion de sesion y rol via bridge (Estandar SPC)
  const user = await validateSessionAndGetUser();

  if (user.rol !== "admin") {
    return redirect("/dashboard");
  }

  // 2. Carga de datos y metadata en paralelo
  const [rawPayments, metadata] = await Promise.all([
    getPagos({
      q: searchParams.q,
      desde: searchParams.desde,
      hasta: searchParams.hasta,
      adm: searchParams.adm,
      edificio: searchParams.edificio,
      mod: searchParams.mod,
      sort: searchParams.sort,
    }),
    getFiltrosMetadata()
  ]);

  // Extraer modalidades únicas para el filtro
  const modalidades = Array.from(new Set(rawPayments.map(p => p.modalidad).filter(Boolean)));

  // 3. Mapeo para compatibilidad con PaymentsTable legacy (temporal hasta v89.4)
  const payments = rawPayments.map(p => ({
    id: p.id_pago.toString(),
    monto_pagado: p.monto_pago,
    fecha_pago: p.fecha_pago,
    modalidad_pago: p.modalidad,
    factura_code: p.nro_factura,
    factura_id: p.id_factura.toString(),
    factura_datos_afip: p.edificio_cuit,
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
      <div className="flex items-center justify-between mb-2">
        <div className="w-full">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight uppercase">historial de pagos</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1 lowercase italic">
            trazabilidad total: administradores, edificios, tareas y presupuestos.
          </p>
        </div>
      </div>

      <PagosFilterBar
        administradores={metadata.administradores}
        edificios={metadata.edificios}
        modalidades={modalidades}
      />

      <PaymentsTable payments={payments as any} />
    </div>
  );
}
