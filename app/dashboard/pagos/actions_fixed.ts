'use server'

import { createClient } from '@supabase/supabase-js'
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
};

// Definimos el esquema de validación con Zod
const paymentSchema = z.object({
  facturaId: z.coerce.number().int('El ID de la factura debe ser un número entero.'),
  monto: z.coerce.number().positive('El monto debe ser mayor a cero.'),
  fecha: z.string().min(1, 'La fecha es requerida.'),
  montoTotalFacturaOriginal: z.coerce.number().positive('El monto total original de la factura es requerido y debe ser positivo.'),
});

// Función para crear un pago - implementación mínima
export async function createPayment(prevState: State, formData: FormData): Promise<State> {
  // Validar datos del formulario
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
  
  console.log('Procesando pago para factura:', { facturaId, monto, fecha, montoTotal: montoTotalFacturaOriginal });

  // ID de usuario hardcodeado para auditoría
  const hardcodedUserId = '1bcb4141-56ed-491a-9cd9-5b8aea700d56';
  
  // Determinar modalidad_pago
  let modalidad_pago: string;
  const epsilon = 0.01;
  if (Math.abs(monto - montoTotalFacturaOriginal) < epsilon || monto > montoTotalFacturaOriginal) {
    modalidad_pago = 'total';
  } else if (Math.abs(monto - (montoTotalFacturaOriginal / 2)) < epsilon) {
    modalidad_pago = '50_porciento';
  } else {
    modalidad_pago = 'ajustable';
  }

  // Crear cliente Supabase directamente
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
  
  // Mapeo manual de facturas problemáticas a sus administradores
  const adminManual: {[key: string]: number} = {
    '43': 6,  // factura 43 -> admin id 6
    '48': 10, // factura 48 -> admin id 10
    '51': 9   // factura 51 -> admin id 9
  };
  
  // Determinar el ID del administrador
  let idAdministradorFactura = 6; // valor predeterminado
  
  // Verificar si es una factura especial que necesita tratamiento manual
  const facturaIdStr = String(facturaId);
  if (facturaIdStr in adminManual) {
    idAdministradorFactura = adminManual[facturaIdStr];
    console.log(`Usando ID de administrador manual: ${idAdministradorFactura}`);
  }

  try {
    // Insertar el pago en pagos_facturas
    const { error: pagoError } = await supabase
      .from('pagos_facturas')
      .insert({
        id_factura: facturaId,
        monto_pagado: monto,
        fecha_pago: fecha,
        modalidad_pago,
        id_administrador: idAdministradorFactura,
        created_by: hardcodedUserId
      });

    if (pagoError) {
      return { message: `Error: No se pudo registrar el pago. ${pagoError.message}` };
    }
    
    // Redirigir a la página de factura sin actualizar estados
    revalidatePath('/dashboard/pagos/nuevo');
    revalidatePath(`/dashboard/facturas/${facturaId}`);
    redirect(`/dashboard/facturas/${facturaId}`);
    
    // Este return nunca se ejecuta debido al redirect anterior
    return { message: 'Éxito' };
  } catch (error: any) {
    return { message: `Error: ${error?.message || 'Error desconocido'}` };
  }
}

// Función para eliminar un pago - simplificada
export async function deletePayment(paymentId: string) {
  // Crear cliente Supabase directamente
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });
  
  try {
    // Eliminar el pago
    const { error } = await supabase
      .from('pagos_facturas')
      .delete()
      .eq('id', paymentId);

    if (error) {
      return { message: `Error al eliminar el pago: ${error.message}` };
    }
    
    // Éxito
    revalidatePath('/dashboard/pagos');
    return { message: 'Pago eliminado con éxito.' };
  } catch (error: any) {
    return { message: `Error: ${error?.message || 'Error desconocido'}` };
  }
}
