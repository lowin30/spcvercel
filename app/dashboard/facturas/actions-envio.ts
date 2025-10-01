"use server"

import { createSsrServerClient } from "@/lib/ssr-server"
import { revalidatePath } from "next/cache"

/**
 * Marca una factura como enviada
 * Actualiza enviada = true y registra fecha_envio
 */
export async function marcarFacturaComoEnviada(facturaId: number) {
  try {
    const supabase = await createSsrServerClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return {
        success: false,
        message: "No autenticado"
      }
    }
    
    // Verificar que el usuario es admin o supervisor
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", user.id)
      .single()
    
    if (userError || !userData) {
      return {
        success: false,
        message: "Error al verificar permisos"
      }
    }
    
    if (userData.rol !== "admin" && userData.rol !== "supervisor") {
      return {
        success: false,
        message: "No tienes permisos para realizar esta acción"
      }
    }
    
    // Obtener el ID del estado "enviado"
    const { data: estadoEnviado } = await supabase
      .from("estados_facturas")
      .select("id")
      .eq("codigo", "enviado")
      .single()
    
    // Actualizar la factura como enviada y cambiar su estado
    const { data, error } = await supabase
      .from("facturas")
      .update({
        enviada: true,
        fecha_envio: new Date().toISOString(),
        id_estado_nuevo: estadoEnviado?.id || null
      })
      .eq("id", facturaId)
      .select()
    
    if (error) {
      console.error("Error al marcar factura como enviada:", error)
      return {
        success: false,
        message: `Error: ${error.message}`
      }
    }
    
    if (!data || data.length === 0) {
      return {
        success: false,
        message: "Factura no encontrada"
      }
    }
    
    // Revalidar las páginas relevantes
    revalidatePath("/dashboard/facturas")
    revalidatePath(`/dashboard/facturas/${facturaId}`)
    
    return {
      success: true,
      message: "Factura marcada como enviada exitosamente"
    }
  } catch (error: any) {
    console.error("Error inesperado:", error)
    return {
      success: false,
      message: `Error inesperado: ${error.message}`
    }
  }
}
