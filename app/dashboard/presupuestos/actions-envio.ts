"use server"

import { createSsrServerClient } from "@/lib/ssr-server"
import { revalidatePath } from "next/cache"

/**
 * Marca un presupuesto final como enviado
 * Actualiza el estado a "enviado" (id_estado: 4)
 */
export async function marcarPresupuestoComoEnviado(presupuestoId: number) {
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
    
    // Actualizar el presupuesto a estado "enviado" (id: 4)
    const { data, error } = await supabase
      .from("presupuestos_finales")
      .update({
        id_estado: 4, // Estado "enviado"
        updated_at: new Date().toISOString()
      })
      .eq("id", presupuestoId)
      .select()
    
    if (error) {
      console.error("Error al marcar presupuesto como enviado:", error)
      return {
        success: false,
        message: `Error: ${error.message}`
      }
    }
    
    if (!data || data.length === 0) {
      return {
        success: false,
        message: "Presupuesto no encontrado"
      }
    }
    
    // Revalidar las páginas relevantes
    revalidatePath("/dashboard/presupuestos")
    revalidatePath(`/dashboard/presupuestos/${presupuestoId}`)
    
    return {
      success: true,
      message: "Presupuesto marcado como enviado exitosamente"
    }
  } catch (error: any) {
    console.error("Error inesperado:", error)
    return {
      success: false,
      message: `Error inesperado: ${error.message}`
    }
  }
}
