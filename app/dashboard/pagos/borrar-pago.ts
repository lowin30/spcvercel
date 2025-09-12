'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deletePayment(paymentId: string): Promise<{ message: string; error?: boolean }> {
  const supabase = await createSupabaseServerClient();

  try {
    // 1. Obtener los detalles del pago a eliminar para saber qué factura actualizar
    const { data: payment, error: paymentError } = await supabase
      .from('pagos_facturas')
      .select('id, id_factura, monto_pagado')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('Error al buscar el pago a eliminar:', paymentError);
      return { message: 'Error: No se pudo encontrar el pago.', error: true };
    }

    const { id_factura, monto_pagado } = payment;

    // 2. Eliminar el pago
    const { error: deleteError } = await supabase
      .from('pagos_facturas')
      .delete()
      .eq('id', paymentId);

    if (deleteError) {
      console.error('Error al eliminar el pago:', deleteError);
      return { message: `Error de base de datos: ${deleteError.message}`, error: true };
    }

    // 3. Si el pago estaba asociado a una factura, actualizarla
    if (id_factura) {
      // Obtener todos los pagos restantes para esa factura
      const { data: remainingPayments, error: remainingError } = await supabase
        .from('pagos_facturas')
        .select('monto_pagado')
        .eq('id_factura', id_factura);

      if (remainingError) {
        // El pago se eliminó, pero no pudimos recalcular. Aún así es un éxito parcial.
        console.error('Error al obtener pagos restantes:', remainingError);
        revalidatePath(`/dashboard/facturas/${id_factura}`);
        revalidatePath('/dashboard/pagos');
        return { message: 'Pago eliminado, pero no se pudo recalcular el saldo de la factura.' };
      }

      const nuevoTotalPagado = remainingPayments.reduce((acc, p) => acc + (p.monto_pagado || 0), 0);

      // Obtener el monto total original de la factura
      const { data: facturaData, error: facturaError } = await supabase
        .from('facturas')
        .select('total')
        .eq('id', id_factura)
        .single();

      if (facturaError || !facturaData) {
        console.error('Error al obtener el total de la factura:', facturaError);
        return { message: 'Pago eliminado, pero no se pudo encontrar la factura para actualizar el saldo.' };
      }

      const nuevoSaldoPendiente = facturaData.total - nuevoTotalPagado;
      
      // Determinar el nuevo estado de la factura
      let nuevoEstadoId;
      if (nuevoSaldoPendiente <= 0) {
        nuevoEstadoId = 5; // Pagado
      } else if (nuevoTotalPagado > 0) {
        nuevoEstadoId = 3; // Parcialmente Pagado
      } else {
        nuevoEstadoId = 2; // No Pagado
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
        return { message: `Pago eliminado, pero error al actualizar la factura: ${updateError.message}`, error: true };
      }
    }

    // 4. Revalidar rutas para actualizar la UI
    revalidatePath(`/dashboard/facturas/${id_factura}`);
    revalidatePath('/dashboard/pagos');

    return { message: 'Pago eliminado con éxito.' };

  } catch (error: any) {
    console.error('Error inesperado al eliminar el pago:', error);
    return { message: `Error inesperado: ${error.message}`, error: true };
  }
}
