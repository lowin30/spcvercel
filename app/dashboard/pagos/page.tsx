import PaymentsTable from '@/components/payments-table'; // Mantener si se va a reintroducir
import { createSsrServerClient } from '@/lib/ssr-server';
import { redirect } from 'next/navigation';

// Definición del tipo para los datos enriquecidos de los pagos
export type EnrichedPayment = {
  id: string;
  monto_pagado: number;
  fecha_pago: string;
  modalidad_pago: string;
  factura_code: string | null;
  factura_id: string | null;
  tarea_titulo: string | null;
  created_by_email: string | null;
};

async function getPayments(supabase: any): Promise<EnrichedPayment[]> {
  const { data: payments, error } = await supabase
    .from('pagos_facturas')
    .select(`
      id,
      monto_pagado,
      fecha_pago,
      modalidad_pago,
      facturas (
        id,
        code,
        presupuestos_finales (
          tareas (
            titulo
          )
        )
      ),
      usuarios (
        email
      )
    `)
    .order('fecha_pago', { ascending: false });

  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }

  // Aplanar los datos para que sean más fáciles de usar en el componente de la tabla
  return payments.map((p: any) => ({
    id: p.id,
    monto_pagado: p.monto_pagado,
    fecha_pago: p.fecha_pago,
    modalidad_pago: p.modalidad_pago,
    factura_id: p.facturas?.id ?? null,
    factura_code: p.facturas?.code ?? 'N/A',
    tarea_titulo: p.facturas?.presupuestos_finales?.tareas?.titulo ?? 'N/A',
    created_by_email: p.usuarios?.email ?? 'Sistema',
  }));
}

export default async function PagosPage() {
  const supabase = await createSsrServerClient();
  
  // Verificar el rol del usuario
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return redirect("/login");
  }
  
  // Obtener detalles del usuario y verificar su rol
  const { data: userDetails } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();
  
  // Verificar si el usuario tiene rol admin, sino redirigir
  if (!userDetails || userDetails.rol !== "admin") {
    return redirect("/dashboard");
  }
  
  const payments = await getPayments(supabase);

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4">
      <div className="flex items-center justify-between">
        <div className="w-full">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Historial de Pagos</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1">
            Consulta los pagos registrados en el sistema.
          </p>
        </div>
      </div>
      <PaymentsTable payments={payments} />
    </div>
  );
}
