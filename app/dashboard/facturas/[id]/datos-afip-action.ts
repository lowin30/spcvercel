"use server"

import { createSsrServerClient } from '@/lib/ssr-server'
import { revalidatePath } from "next/cache"

export async function actualizarDatosAFIP(facturaId: string, nuevosDatos: string) {
  const supabase = await createSsrServerClient()
  
  try {
    // Convertir facturaId a número porque la columna 'id' en la tabla es integer
    const idNumerico = parseInt(facturaId, 10)
    
    console.log('[actualizarDatosAFIP] Iniciando actualización:', {
      facturaId,
      idNumerico,
      nuevosDatos,
      tipoFacturaId: typeof facturaId,
      tipoIdNumerico: typeof idNumerico
    })
    
    if (isNaN(idNumerico)) {
      throw new Error(`ID de factura inválido: ${facturaId}`)
    }
    
    const { data, error } = await supabase
      .from("facturas")
      .update({ datos_afip: nuevosDatos })
      .eq("id", idNumerico)
      .select()
    
    console.log('[actualizarDatosAFIP] Resultado de la actualización:', {
      data,
      error,
      rowsAffected: data?.length || 0
    })
    
    if (error) throw error
    
    if (!data || data.length === 0) {
      console.warn('[actualizarDatosAFIP] Advertencia: No se encontró factura con id:', idNumerico)
      return { success: false, message: "No se encontró la factura para actualizar" }
    }
    
    // Revalidar la página para que se muestren los datos actualizados
    revalidatePath(`/dashboard/facturas/${facturaId}`)
    
    console.log('[actualizarDatosAFIP] Actualización exitosa')
    return { success: true, message: "Datos AFIP actualizados correctamente" }
  } catch (error: any) {
    console.error("[actualizarDatosAFIP] Error al actualizar datos AFIP:", error)
    return { success: false, message: `Error: ${error.message || "Ocurrió un error al actualizar los datos"}` }
  }
}
