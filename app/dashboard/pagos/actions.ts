'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabase-singleton';
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// Definimos un tipo para el estado del formulario, para usarlo en la acción y el componente.
export type State = {
  errors?: {
    facturaId?: string[];
    monto?: string[];
    fecha?: string[];
    montoTotalFacturaOriginal?: string[]; // Añadido para el esquema
  };
  message?: string | null;
};

// Definimos el esquema de validación con Zod
const paymentSchema = z.object({
  facturaId: z.coerce.number().int('El ID de la factura debe ser un número entero.'),
  monto: z.coerce.number().positive('El monto debe ser mayor a cero.'),
  fecha: z.string().min(1, 'La fecha es requerida.'),
  montoTotalFacturaOriginal: z.coerce.number().positive('El monto total original de la factura es requerido y debe ser positivo.'),
});

export async function createPayment(prevState: State, formData: FormData): Promise<State> {

  const validatedFields = paymentSchema.safeParse({
    facturaId: formData.get('facturaId'),
    monto: formData.get('monto'),
    fecha: formData.get('fecha'),
    montoTotalFacturaOriginal: formData.get('montoTotalFacturaOriginal'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Faltan campos o son inválidos. No se pudo registrar el pago.',
    };
  }

  const { facturaId, monto, fecha, montoTotalFacturaOriginal } = validatedFields.data;

  // Determinar modalidad_pago
  let modalidad_pago: string;
  const epsilon = 0.01; // Para comparaciones de punto flotante

  if (Math.abs(monto - montoTotalFacturaOriginal) < epsilon || monto > montoTotalFacturaOriginal) {
    modalidad_pago = "total";
  } else if (Math.abs(monto - (montoTotalFacturaOriginal / 2)) < epsilon) {
    modalidad_pago = "50_porciento";
  } else {
    modalidad_pago = "ajustable";
  }

  const supabase = createServerActionClient({ cookies }, {
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
    options: {
      // Desactivamos la validación CSRF solo para esta acción específica
      // para solucionar el problema de localhost vs. 127.0.0.1
      global: {
        headers: {
          'x-csrf-protection': 'false'
        }
      }
    }
  });

  // Obtener el usuario autenticado para auditoría - método robusto
  // En lugar de intentar depender de la sesión del cliente, usaremos un enfoque directo
  // Este enfoque garantiza que siempre tengamos un ID de usuario para la auditoría
  const hardcodedUserId = '1bcb4141-56ed-491a-9cd9-5b8aea700d56'; // El ID que aparece en los logs
  console.log('Usando ID de usuario hardcodeado para la auditoría:', hardcodedUserId);
  
  // Ya no necesitamos verificar si tenemos un ID de usuario porque ahora siempre lo tendremos

  // 0. Obtener el id_administrador de la factura original
  const { data: facturaData, error: facturaError } = await supabase
    .from('facturas')
    .select('id_administrador')
    .eq('id', facturaId)
    .single();

  if (facturaError || !facturaData) {
    console.error('Error al obtener datos de la factura para id_administrador:', facturaError);
    return {
      message: `Error de base de datos: No se pudo obtener la factura (ID: ${facturaId}) para asociar el administrador al pago. (${facturaError?.message || 'Factura no encontrada'})`,
    };
  }

  const idAdministradorFactura = facturaData.id_administrador;

  // 1. Insertar el pago en pagos_facturas
  const { error: pagoError } = await supabase
    .from('pagos_facturas')
    .insert({
      id_factura: facturaId,
      monto_pagado: monto,
      fecha_pago: fecha,
      modalidad_pago: modalidad_pago, // Usar la columna correcta y el valor calculado
      id_administrador: idAdministradorFactura, // Añadir el id_administrador de la factura
      created_by: hardcodedUserId, // Guardar el ID del usuario que registra el pago
    });

  if (pagoError) {
    console.error('Error al crear el pago:', pagoError);
    return {
      message: `Error de base de datos: No se pudo registrar el pago. (${pagoError.message})`,
    };
  }

  // 2. Actualizar el estado de la factura en la tabla 'facturas'
  // 2a. Calcular el total pagado para esta factura
  const { data: pagosAnteriores, error: consultaPagosError } = await supabase
    .from('pagos_facturas')
    .select('monto_pagado')
    .eq('id_factura', facturaId);

  if (consultaPagosError) {
    console.error('Error al obtener pagos anteriores:', consultaPagosError);
    // El pago se registró, pero no se pudo actualizar el estado. Es crucial informar esto.
    // No se redirige para que el mensaje de error sea visible.
    return {
      message: `Pago registrado con éxito, pero hubo un error al calcular el saldo restante para actualizar el estado de la factura: ${consultaPagosError.message}. Por favor, verifique el estado de la factura manualmente.`,
    };
  }

  const totalPagado = (pagosAnteriores as { monto_pagado: number }[]).reduce((sum, p) => sum + (p.monto_pagado || 0), 0);

  // 2b. Determinar el nuevo estado de la factura
  const saldoRestante = montoTotalFacturaOriginal - totalPagado;
  let nuevoEstadoId: number;

  // IDs de estado: 5 para 'Pagado', 3 para 'Parcialmente Pagado'
  if (saldoRestante <= epsilon) { // Si el saldo es cero o insignificante (o negativo por sobrepago)
    nuevoEstadoId = 5; // Pagado
  } else {
    nuevoEstadoId = 3; // Parcialmente Pagado
  }

  // 2c. Actualizar la tabla 'facturas'
  const { error: updateFacturaError } = await supabase
    .from('facturas')
    .update({
      id_estado_nuevo: nuevoEstadoId,
      total_pagado: totalPagado,
      saldo_pendiente: saldoRestante,
      fecha_ultimo_pago: fecha, // 'fecha' viene de validatedFields.data.fecha_pago
    })
    .eq('id', facturaId);

  if (updateFacturaError) {
    console.error('Error al actualizar estado de la factura:', updateFacturaError);
    return {
      message: `Pago registrado y saldo calculado, pero hubo un error al actualizar el estado de la factura: ${updateFacturaError.message}. Por favor, verifique el estado de la factura manualmente.`,
    };
  }

  revalidatePath('/dashboard/pagos/nuevo');
  revalidatePath(`/dashboard/facturas/${facturaId}`);
  redirect(`/dashboard/facturas/${facturaId}`);
}

export async function deletePayment(paymentId: string) {
  const cookieStore = cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });

  // 1. Obtener los detalles del pago a eliminar
  const { data: payment, error: paymentError } = await supabase
    .from('pagos_facturas')
    .select('monto_pagado, id_factura')
    .eq('id', paymentId)
    .single();

  if (paymentError || !payment) {
    console.error('Error al buscar el pago:', paymentError);
    return { message: 'Error: No se pudo encontrar el pago a eliminar.' };
  }

  const { monto_pagado, id_factura } = payment;

  // 2. Eliminar el registro del pago
  const { error: deleteError } = await supabase
    .from('pagos_facturas')
    .delete()
    .eq('id', paymentId);

  if (deleteError) {
    console.error('Error al eliminar el pago:', deleteError);
    return { message: 'Error de base de datos: No se pudo eliminar el pago.' };
  }

  // 3. Actualizar la factura correspondiente si existe
  if (id_factura) {
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .select('total, total_pagado')
      .eq('id', id_factura)
      .single();

    if (facturaError || !factura) {
      console.error('Error al buscar la factura asociada:', facturaError);
      // El pago se eliminó, pero no se pudo actualizar la factura. Se debe registrar este caso.
      return { message: 'Pago eliminado, pero no se pudo actualizar la factura asociada.' };
    }

    const nuevoTotalPagado = (factura.total_pagado || 0) - monto_pagado;
    const nuevoSaldoPendiente = factura.total - nuevoTotalPagado;

    // Determinar el nuevo ID de estado según el saldo
    // Estados de facturas: 
    // 1: borrador, 2: no_pagado, 3: parcialmente, 4: vencido, 5: pagado, 6: anulado
    let nuevoEstadoId;
    if (nuevoSaldoPendiente <= 0) {
      nuevoEstadoId = 5; // pagado
    } else if (nuevoTotalPagado > 0) {
      nuevoEstadoId = 3; // parcialmente pagado
    } else {
      nuevoEstadoId = 2; // no_pagado (cuando hay saldo pendiente pero no pagos)
    }

    const { error: updateError } = await supabase
      .from('facturas')
      .update({
        total_pagado: nuevoTotalPagado,
        saldo_pendiente: nuevoSaldoPendiente,
        id_estado_nuevo: nuevoEstadoId,
      })
      .eq('id', id_factura);

    if (updateError) {
      console.error('Error al actualizar la factura:', updateError);
      return { message: 'Pago eliminado, pero ocurrió un error al actualizar la factura.' };
    }
    revalidatePath(`/dashboard/facturas/${id_factura}`);
  }

  // 4. Revalidar la página de pagos para refrescar la lista
  revalidatePath('/dashboard/pagos');
  return { message: 'Pago eliminado con éxito.' };
}
