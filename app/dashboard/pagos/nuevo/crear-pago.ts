'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// URL y claves de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gyivcftjrpxfytydkxfd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5aXZjZnRqcnB4Znl0eWRreGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTU4MjIxMDgsImV4cCI6MjAxMTM5ODEwOH0.Iz70rzQUZi89LaCGqSqqcZp0HWApQt4aIpzunKMcuys';

// Definimos un tipo para el estado del formulario
export type State = {
  errors?: {
    facturaId?: string[];
    monto?: string[];
    fecha?: string[];
    montoTotalFacturaOriginal?: string[]; 
  };
  message?: string | null;
  success?: boolean;
  facturaId?: number;
};

// Definimos el esquema de validación con Zod
const paymentSchema = z.object({
  facturaId: z.coerce.number().int('El ID de la factura debe ser un número entero.'),
  monto: z.coerce.number().positive('El monto debe ser mayor a cero.'),
  fecha: z.string().min(1, 'La fecha es requerida.'),
  montoTotalFacturaOriginal: z.coerce.number().positive('El monto total original de la factura es requerido y debe ser positivo.'),
  saldoPendiente: z.coerce.number().nonnegative('El saldo pendiente debe ser un número no negativo.').optional(),
});

// Función para crear un pago - implementación mínima
export async function createPayment(prevState: State, formData: FormData): Promise<State> {
  // Validar datos del formulario
  const validatedFields = paymentSchema.safeParse({
    facturaId: formData.get('facturaId'),
    monto: formData.get('monto'),
    fecha: formData.get('fecha'),
    montoTotalFacturaOriginal: formData.get('montoTotalFacturaOriginal'),
    saldoPendiente: formData.get('saldoPendiente'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Faltan campos o son inválidos. No se pudo registrar el pago.',
    };
  }

  const { facturaId, monto, fecha, montoTotalFacturaOriginal } = validatedFields.data;

  // ID de usuario hardcodeado para auditoría
  const hardcodedUserId = '1bcb4141-56ed-491a-9cd9-5b8aea700d56';

  // Crear un cliente Supabase para Server Actions que hereda la sesión del usuario
  const supabase = await createSupabaseServerClient();
  
  // Ya no necesitamos la lógica manual de administradores. El cliente autenticado
  // nos permitirá obtener el id_administrador directamente de la factura si las RLS son correctas.
  // Obtener el estado actual de la factura para validación
  const { data: facturaData, error: facturaError } = await supabase
    .from('facturas')
    .select('id_administrador, saldo_pendiente')
    .eq('id', facturaId)
    .single();

  if (facturaError || !facturaData) {
    console.error('Error al obtener el administrador de la factura:', facturaError);
    return { message: `Error: No se pudo encontrar la factura o su administrador. ${facturaError?.message || ''}` };
  }

  const idAdministradorFactura = facturaData.id_administrador;
  const saldoPendiente = facturaData.saldo_pendiente;

  // Validación: No permitir pagos si la factura ya está saldada.
  if (saldoPendiente !== null && saldoPendiente <= 0) {
    return { message: 'Error: La factura ya ha sido completamente pagada.', errors: { monto: ['Esta factura ya no acepta más pagos.'] } };
  }

  // Validación: No permitir pagos que excedan el saldo pendiente
  if (saldoPendiente !== null && monto > saldoPendiente) {
    return { 
      message: `Error: El monto ($${monto.toLocaleString('es-AR')}) excede el saldo pendiente ($${saldoPendiente.toLocaleString('es-AR')}).`, 
      errors: { monto: [`El saldo disponible es de $${saldoPendiente.toLocaleString('es-AR')}`] } 
    };
  }

  // Determinar modalidad_pago usando el saldo pendiente real de la BD
  let modalidad_pago: string;
  const epsilon = 0.01;
  const referenciaCalculo = saldoPendiente !== null && saldoPendiente > 0 ? saldoPendiente : montoTotalFacturaOriginal;
  
  if (Math.abs(monto - referenciaCalculo) < epsilon || monto >= referenciaCalculo) {
    modalidad_pago = 'total';
  } else if (Math.abs(monto - (referenciaCalculo / 2)) < epsilon) {
    modalidad_pago = '50_porciento';
  } else {
    modalidad_pago = 'ajustable';
  }

  try {
    // Ahora usamos el cliente de Supabase autenticado para insertar el pago.
    // Si las RLS están bien configuradas, esto debería funcionar.
    const { error: pagoError } = await supabase.from('pagos_facturas').insert({
      id_factura: facturaId,
      monto_pagado: monto,
      fecha_pago: fecha,
      modalidad_pago,
      id_administrador: idAdministradorFactura,
      created_by: hardcodedUserId, // Opcionalmente, podrías obtener el ID del usuario de la sesión
    });

    if (pagoError) {
      return { message: `Error: No se pudo registrar el pago. ${pagoError.message}` };
    }
    
    // Revalidar las rutas relevantes para asegurar que los datos se refresquen en la UI
    revalidatePath('/dashboard/pagos');
    revalidatePath('/dashboard/facturas');
    revalidatePath(`/dashboard/facturas/${facturaId}`);

    // --- Lógica de Actualización de Factura ---

    // 1. Obtener todos los pagos de la factura para recalcular el total pagado
    const { data: todosLosPagos, error: pagosError } = await supabase
      .from('pagos_facturas')
      .select('monto_pagado')
      .eq('id_factura', facturaId);

    if (pagosError) {
      // El pago se registró, pero no pudimos recalcular. Aún es un éxito parcial.
      console.error('Error al obtener pagos para recalcular:', pagosError);
      return { success: true, message: 'Pago registrado, pero no se pudo actualizar el saldo de la factura.' };
    }

    const nuevoTotalPagado = todosLosPagos.reduce((acc, p) => acc + (p.monto_pagado || 0), 0);

    // 2. Obtener el monto total original de la factura para calcular el nuevo saldo
    const { data: facturaOriginal, error: facturaOriginalError } = await supabase
      .from('facturas')
      .select('total')
      .eq('id', facturaId)
      .single();

    if (facturaOriginalError || !facturaOriginal) {
      console.error('Error al obtener el total original de la factura:', facturaOriginalError);
      return { success: true, message: 'Pago registrado, pero no se pudo encontrar la factura para actualizar el saldo.' };
    }

    const nuevoSaldoPendiente = facturaOriginal.total - nuevoTotalPagado;

    // 3. Determinar el nuevo estado de la factura
    let nuevoEstadoId;
    if (nuevoSaldoPendiente <= 0.01) { // Usar un pequeño epsilon para comparaciones de flotantes
      nuevoEstadoId = 5; // Pagado
    } else if (nuevoTotalPagado > 0) {
      nuevoEstadoId = 3; // Parcialmente Pagado
    } else {
      nuevoEstadoId = 2; // No Pagado
    }

    // 4. Actualizar la factura con los nuevos valores
    const { error: updateError } = await supabase
      .from('facturas')
      .update({
        total_pagado: nuevoTotalPagado,
        saldo_pendiente: nuevoSaldoPendiente,
        id_estado_nuevo: nuevoEstadoId,
      })
      .eq('id', facturaId);

    if (updateError) {
      console.error('Error al actualizar la factura:', updateError);
      return { success: true, message: `Pago registrado, pero error al actualizar la factura: ${updateError.message}` };
    }

    // --- Fin de la Lógica de Actualización ---

    // Revalidar las rutas relevantes para asegurar que los datos se refresquen en la UI
    revalidatePath('/dashboard/pagos');
    revalidatePath('/dashboard/facturas');
    revalidatePath(`/dashboard/facturas/${facturaId}`);

    // Devolver un estado de éxito para que el cliente maneje la redirección y muestre el feedback
    return { success: true, message: 'Pago registrado y factura actualizada con éxito.', facturaId: facturaId };
  } catch (error: any) {
    return { message: `Error: ${error?.message || 'Error desconocido'}` };
  }
}
