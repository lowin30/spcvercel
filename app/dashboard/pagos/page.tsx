import PaymentsTable from '@/components/payments-table';
import { redirect } from 'next/navigation';
import { getPagos } from './loader';
import { validateSessionAndGetUser } from '@/lib/auth-bridge';

export default async function PagosPage({
  searchParams,
}: {
  searchParams: { q?: string; desde?: string; hasta?: string; edificio?: string };
}) {
  // 1. Validacion de sesion y rol via bridge (Estandar SPC)
  const user = await validateSessionAndGetUser();

  if (user.rol !== "admin") {
    return redirect("/dashboard");
  }

  // 2. Carga de datos via Loader (v89.3)
  // Pasamos los searchParams directamente al loader para filtrado de servidor
  const rawPayments = await getPagos({
    q: searchParams.q,
    desde: searchParams.desde,
    hasta: searchParams.hasta,
    edificio: searchParams.edificio,
  });

  // 3. Mapeo para compatibilidad con PaymentsTable legacy (temporal hasta v89.4)
  const payments = rawPayments.map(p => ({
    id: p.id_pago.toString(),
    monto_pagado: p.monto_pago,
    fecha_pago: p.fecha_pago,
    modalidad_pago: p.tipo_pago,
    factura_code: p.nro_factura,
    factura_id: p.id_factura.toString(),
    factura_datos_afip: null, // No expuesto en la nueva vista por ahora
    tarea_titulo: p.tarea_titulo,
    edificio_id: null, // No expuesto directamente
    edificio_nombre: p.edificio_nombre,
    administrador_id: null, // No expuesto directamente
    administrador_nombre: p.administrador_nombre,
    created_by_email: 'Sistema', // Simplificado
    tarea_codigo: p.tarea_codigo,
    presupuesto_total: p.presupuesto_total_aprobado
  }));

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4">
      <div className="flex items-center justify-between">
        <div className="w-full">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">historial de pagos (v89.3)</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1">
            consulta los pagos registrados con trazabilidad total de tareas y presupuestos.
          </p>
        </div>
      </div>
      <PaymentsTable payments={payments as any} />
    </div>
  );
}
