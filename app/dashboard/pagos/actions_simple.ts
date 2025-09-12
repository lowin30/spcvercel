'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Este archivo es solo un stub para mantener compatibilidad.
// La implementación real está en app/dashboard/pagos/nuevo/crear-pago.ts

// Define el tipo State para mantener compatibilidad
export type State = {
  errors?: {
    facturaId?: string[];
    monto?: string[];
    fecha?: string[];
    montoTotalFacturaOriginal?: string[]; 
  };
  message?: string | null;
};

// Función de creación de pago mínima que redirige al nuevo archivo
export async function createPayment(prevState: State, formData: FormData): Promise<State> {
  console.warn('Esta función está obsoleta. Use la versión en nuevo/crear-pago.ts');
  return { message: 'Esta función está obsoleta. Use la nueva implementación.' };
}

// Función de eliminación de pago mínima
export async function deletePayment(paymentId: string) {
  console.warn('Esta función está obsoleta. Use la versión en nuevo/crear-pago.ts');
  return { message: 'Esta función está obsoleta. Use la nueva implementación.' };
}
