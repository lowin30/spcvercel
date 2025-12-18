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
    
    let tareaIdFromPf: number | null = null
    
    // Intentar actualizar el Presupuesto Final relacionado a estado 'facturado'
    try {
      const pfIdDirect = (data?.[0] as any)?.id_presupuesto_final
      let pfId = pfIdDirect
      if (!pfId) {
        const { data: row } = await supabase
          .from('facturas')
          .select('id_presupuesto_final')
          .eq('id', facturaId)
          .single()
        pfId = (row as any)?.id_presupuesto_final
      }
      if (pfId) {
        const { data: pfRow } = await supabase
          .from('presupuestos_finales')
          .select('id_tarea')
          .eq('id', pfId)
          .maybeSingle()
        tareaIdFromPf = (pfRow as any)?.id_tarea ?? null
        const { data: estadoFacturado } = await supabase
          .from('estados_presupuestos')
          .select('id')
          .eq('codigo', 'facturado')
          .maybeSingle()
        if (estadoFacturado?.id) {
          const { error: updPfErr } = await supabase
            .from('presupuestos_finales')
            .update({ id_estado: estadoFacturado.id, updated_at: new Date().toISOString() })
            .eq('id', pfId)
          if (updPfErr) {
            console.error('Error al actualizar presupuesto_final a facturado:', updPfErr)
          }
          if (tareaIdFromPf) {
            const { data: estadoTareaFacturado } = await supabase
              .from('estados_tareas')
              .select('id')
              .eq('codigo', 'facturado')
              .maybeSingle()
            if (estadoTareaFacturado?.id) {
              const { error: updTareaErr } = await supabase
                .from('tareas')
                .update({ id_estado_nuevo: estadoTareaFacturado.id, updated_at: new Date().toISOString() })
                .eq('id', tareaIdFromPf)
              if (updTareaErr) {
                console.error('Error al actualizar tarea a facturado:', updTareaErr)
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Error al sincronizar estado de presupuesto/tarea tras enviar factura:', e)
    }
    
    // Revalidar las páginas relevantes
    revalidatePath("/dashboard/facturas")
    revalidatePath(`/dashboard/facturas/${facturaId}`)
    revalidatePath("/dashboard/presupuestos")
    revalidatePath("/dashboard/tareas")
    if (tareaIdFromPf) {
      revalidatePath(`/dashboard/tareas/${tareaIdFromPf}`)
    }
    
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
