"use server"

import { supabaseAdmin } from '@/lib/supabase-admin'
import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { revalidatePath } from "next/cache"

export async function actualizarDatosAFIP(facturaId: string, nuevosDatos: string) {
  // SECURITY SHIELD v2.0
  const user = await validateSessionAndGetUser();
  if (user.rol !== 'admin') {
    throw new Error('No autorizado: Operación permitida solo para administradores');
  }

  try {
    const idNumerico = parseInt(facturaId, 10)

    if (isNaN(idNumerico)) {
      throw new Error(`ID de factura inválido: ${facturaId}`)
    }

    // Usamos supabaseAdmin para bypass RLS
    const { data, error } = await supabaseAdmin
      .from("facturas")
      .update({ datos_afip: nuevosDatos })
      .eq("id", idNumerico)
      .select()

    if (error) throw error

    if (!data || data.length === 0) {
      console.warn('[actualizarDatosAFIP] Advertencia: No se encontró factura con id:', idNumerico)
      return { success: false, message: "No se encontró la factura para actualizar" }
    }

    revalidatePath(`/dashboard/facturas/${facturaId}`)
    return { success: true, message: "Datos AFIP actualizados correctamente" }
  } catch (error: any) {
    console.error("[actualizarDatosAFIP] Error al actualizar datos AFIP:", error)
    return { success: false, message: `Error: ${error.message || "Ocurrió un error al actualizar los datos"}` }
  }
}
