"use server"

import { createSsrServerClient } from "@/lib/ssr-server"
import { revalidatePath } from "next/cache"

/**
 * Marca un presupuesto final como enviado o facturado
 * Lógica:
 * - Si el presupuesto ya tiene factura vinculada → Estado "facturado" (id: 5)
 * - Si NO tiene factura vinculada → Estado "enviado" (id: 4)
 * 
 * @param presupuestoId - ID del presupuesto final a actualizar
 * @returns Objeto con success, message y el estado asignado
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

    // Verificar si existe una factura vinculada a este presupuesto final
    // IMPORTANTE: La tabla facturas usa 'id_presupuesto_final'
    console.log(`[DEBUG] Buscando facturas para presupuesto ID: ${presupuestoId}`)

    const { data: facturas, error: facturasError } = await supabase
      .from("facturas")
      .select("id, code, id_presupuesto_final, id_presupuesto")
      .eq("id_presupuesto_final", presupuestoId)

    console.log(`[DEBUG] Facturas encontradas:`, facturas)
    console.log(`[DEBUG] Error (si hay):`, facturasError)

    if (facturasError) {
      console.error("❌ Error al verificar facturas:", facturasError)
      // Continuar de todos modos
    }

    // Determinar el estado correcto por código (sin IDs mágicos):
    // - Si ya existe factura → Estado "facturado"
    // - Si NO existe factura → Estado "enviado"
    const tieneFactura = !!(facturas && facturas.length > 0)

    // Obtener IDs desde estados_presupuestos por codigo
    const { data: estadoFacturado } = await supabase
      .from('estados_presupuestos')
      .select('id')
      .eq('codigo', 'facturado')
      .maybeSingle()

    const { data: estadoEnviado } = await supabase
      .from('estados_presupuestos')
      .select('id')
      .eq('codigo', 'enviado')
      .maybeSingle()

    const nuevoEstadoId = tieneFactura ? estadoFacturado?.id : estadoEnviado?.id
    const nombreEstado = tieneFactura ? 'facturado' : 'enviado'

    console.log(`[DEBUG] ¿Tiene factura?: ${tieneFactura}`)
    console.log(`[DEBUG] Nuevo estado ID: ${nuevoEstadoId} (${nombreEstado})`)

    // Actualizar el presupuesto al estado correspondiente
    const { data, error } = await supabase
      .from("presupuestos_finales")
      .update({
        id_estado: nuevoEstadoId,
        updated_at: new Date().toISOString()
      })
      .eq("id", presupuestoId)
      .select()

    if (error) {
      console.error("❌ Error al marcar presupuesto como enviado:", error)
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

    console.log(`✅ Presupuesto actualizado exitosamente:`, data)
    console.log(`[DEBUG] Estado asignado: ${nuevoEstadoId} (${nombreEstado})`)

    // Verificar el estado final después de triggers
    const { data: presupuestoFinal } = await supabase
      .from("presupuestos_finales")
      .select("id, code, id_estado")
      .eq("id", presupuestoId)
      .single()

    console.log(`[DEBUG] Estado FINAL del presupuesto después de triggers:`, presupuestoFinal)

    // Sincronizar estado de la tarea (Requerimiento Usuario: Pasar a "Enviado")
    if (nombreEstado === 'enviado') {
      await actualizarEstadoTarea(supabase, presupuestoId)
    }

    // Revalidar las páginas relevantes
    revalidatePath("/dashboard/presupuestos")
    revalidatePath(`/dashboard/presupuestos/${presupuestoId}`)

    return {
      success: true,
      message: tieneFactura
        ? "Presupuesto marcado como facturado (tiene factura vinculada)"
        : "Presupuesto marcado como enviado exitosamente"
    }
  } catch (error: any) {
    console.error("Error inesperado:", error)
    return {
      success: false,
      message: `Error inesperado: ${error.message}`
    }
  }
}

async function actualizarEstadoTarea(supabase: any, presupuestoId: number) {
  try {
    // 1. Obtener el id_tarea del presupuesto final
    const { data: pf, error: pfError } = await supabase
      .from('presupuestos_finales')
      .select('id_tarea')
      .eq('id', presupuestoId)
      .single()

    if (pfError || !pf?.id_tarea) {
      console.log(`[DEBUG] No se encontró tarea asociada al presupuesto ${presupuestoId}`)
      return
    }

    const idTarea = pf.id_tarea

    // 2. Obtener el ID del estado "Enviado" para TAREAS (puede ser distinto al de presupuestos)
    // Buscamos por código 'enviado' o usamos el ID 4 por defecto si falla la busqueda
    // Nota: Según board-container.tsx, el ID 4 es "Enviado"
    let idEstadoEnviado = 4

    // Intentamos buscarlo dinámicamente para mayor seguridad
    const { data: estadoTarea } = await supabase
      .from('estados_tareas') // Asumiendo que esta es la tabla, si no existe fallará silenciosamente en el catch
      .select('id')
      .eq('codigo', 'enviado')
      .maybeSingle()

    if (estadoTarea?.id) {
      idEstadoEnviado = estadoTarea.id
    }

    // 3. Actualizar el estado de la tarea
    const { error: updateError } = await supabase
      .from('tareas')
      .update({
        id_estado_nuevo: idEstadoEnviado,
        updated_at: new Date().toISOString()
      })
      .eq('id', idTarea)

    if (updateError) {
      console.error(`❌ Error al actualizar tarea ${idTarea}:`, updateError)
    } else {
      console.log(`✅ Tarea ${idTarea} actualizada al estado ${idEstadoEnviado} (Enviado)`)
      // Revalidar tablero de tareas
      revalidatePath('/dashboard/tareas')
    }

  } catch (error) {
    console.error("Error auxiliar actualizando tarea:", error)
  }
}
