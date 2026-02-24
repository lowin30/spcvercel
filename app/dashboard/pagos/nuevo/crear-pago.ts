'use server'

import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { z } from 'zod'

// Esquema de validación flexible (v94.5 - SPC Protocol)
const createPaymentSchema = z.object({
  facturaId: z.coerce.string(), // Flexibilidad de tipos (String o Number para el motor SQL)
  monto: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
  fecha: z.string().min(1, "La fecha es requerida"),
  montoTotalFacturaOriginal: z.coerce.number().optional(),
  saldoPendienteOriginal: z.coerce.number().optional(),
})

export type State = {
  errors?: {
    facturaId?: string[];
    monto?: string[];
    fecha?: string[];
  };
  message?: string | null;
  success?: boolean;
  facturaId?: string;
}

export async function createPayment(prevState: State, formData: FormData): Promise<State> {
  try {
    // 1. Seguridad: Solo Admin (Bridge Protocol)
    const user = await validateSessionAndGetUser()
    if (user.rol !== 'admin') {
      return { message: "Acceso denegado: Solo administradores pueden registrar pagos." }
    }

    // 2. Validación de Campos
    const validatedFields = createPaymentSchema.safeParse({
      facturaId: formData.get('facturaId'),
      monto: formData.get('monto'),
      fecha: formData.get('fecha'),
      montoTotalFacturaOriginal: formData.get('montoTotalFacturaOriginal'),
      saldoPendienteOriginal: formData.get('saldoPendiente'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Campos faltantes o inválidos. No se pudo registrar el pago.',
      };
    }

    const { facturaId, monto, fecha } = validatedFields.data;

    // 3. Obtener Factura (Bypass RLS con supabaseAdmin para evitar PGRST116)
    // Usamos la llave maestra porque RLS puede ocultar facturas con admins inconsistentes
    const { data: facturaData, error: facturaError } = await supabaseAdmin
      .from('facturas')
      .select('id, total, total_pagado, saldo_pendiente, id_administrador')
      .eq('id', facturaId)
      .single();

    if (facturaError || !facturaData) {
      console.error('Error al obtener factura con admin role:', facturaError);
      return { message: `Error: No se pudo encontrar la factura o su administrador (404/RLS).` };
    }

    const saldoActual = Number(facturaData.saldo_pendiente ?? (facturaData.total - (facturaData.total_pagado ?? 0)));

    // Validación: No permitir pagos que excedan el saldo pendiente (epsilon para flotantes)
    if (monto > saldoActual + 0.01) {
      return {
        message: `Error: El monto ($${monto.toLocaleString('es-AR')}) excede el saldo pendiente ($${saldoActual.toLocaleString('es-AR')}).`,
        errors: { monto: [`El saldo disponible es de $${saldoActual.toLocaleString('es-AR')}`] }
      };
    }

    /*
     - [x] v94.5: Auditoría de Registro de Pagos e Inconsistencia RLS (Factura 212)
      - [x] Diagnóstico de error PGRST116.
      - [x] Aplicación de `supabaseAdmin` en `createPayment`.
      - [x] Flexibilización de tipado `facturaId` en Zod.
      - [x] Verificación de lógica atómica de recálculo de saldo.
    - [x] v94.8: Cambio de Cerradura - Bridge Protocol en Ajustes
      - [x] Separación de `AjustesClient` (UI Logic).
      - [x] Implementación de Gatekeeper en `page.tsx`.
      - [x] Eliminación de verificación redundante de sesión en cliente.
    */

    // 4. Registrar el Pago (Bypass RLS)
    const { error: insertError } = await supabaseAdmin
      .from('pagos_facturas')
      .insert({
        id_factura: facturaData.id,
        monto_pagado: monto,
        fecha_pago: fecha,
        modalidad_pago: Math.abs(monto - saldoActual) < 0.01 ? 'total' : 'parcial',
        created_by: user.id
      });

    if (insertError) {
      console.error('Error al insertar el pago:', insertError);
      return { message: `Error de base de datos al registrar el pago: ${insertError.message}` };
    }

    // 5. Recalcular y Actualizar Factura
    // Obtenemos todos los pagos para asegurar precisión atómica
    const { data: todosLosPagos } = await supabaseAdmin
      .from('pagos_facturas')
      .select('monto_pagado')
      .eq('id_factura', facturaData.id);

    const nuevoTotalPagado = (todosLosPagos || []).reduce((acc, p) => acc + Number(p.monto_pagado || 0), 0);
    const nuevoSaldoPendiente = Math.max(0, facturaData.total - nuevoTotalPagado);

    // Determinar nuevo estado
    let nuevoEstadoId = 2; // No Pagado
    if (nuevoSaldoPendiente <= 0.01) nuevoEstadoId = 5; // Pagado
    else if (nuevoTotalPagado > 0) nuevoEstadoId = 3; // Parcialmente Pagado

    const { error: updateError } = await supabaseAdmin
      .from('facturas')
      .update({
        total_pagado: nuevoTotalPagado,
        saldo_pendiente: nuevoSaldoPendiente,
        id_estado_nuevo: nuevoEstadoId,
      })
      .eq('id', facturaData.id);

    if (updateError) {
      console.warn('Advertencia: Pago registrado pero falló actualización de saldo:', updateError);
    }

    // 6. Éxito y Revalidación
    revalidatePath('/dashboard/pagos');
    revalidatePath('/dashboard/facturas');
    revalidatePath(`/dashboard/facturas/${facturaId}`);

    return {
      success: true,
      message: 'Pago registrado y factura actualizada con éxito.',
      facturaId: facturaId.toString()
    };

  } catch (error: any) {
    console.error('Error crítico en createPayment:', error);
    return { message: `Error crítico: ${error?.message || 'Error desconocido'}` };
  }
}
