"use server"

import { createServerClient } from '@/lib/supabase-server'
import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { revalidatePath } from 'next/cache'

/**
 * Actualizar el campo es_material de un ítem
 */
export async function updateItemEsMaterial(itemId: number, esMaterial: boolean, presupuestoId: number) {
  try {
    const supabase = await createServerClient()
    await validateSessionAndGetUser();

    if (!itemId) {
      return { success: false, message: 'ID de ítem no proporcionado.' }
    }

    const { error } = await supabase
      .from('items')
      .update({ es_material: esMaterial })
      .eq('id', itemId)

    if (error) throw error

    revalidatePath(`/dashboard/presupuestos-finales/editar/${presupuestoId}`)
    return { success: true, message: `Ítem actualizado correctamente: ${esMaterial ? 'Es material' : 'No es material'}` }
  } catch (error: any) {
    console.error('Error al actualizar item:', error)
    return { success: false, message: `Error: ${error.message}` }
  }
}

/**
 * Eliminar presupuesto final de manera segura
 */
export async function deleteBudget(budgetId: number) {
  if (!budgetId) return { success: false, message: 'ID no proporcionado.' }
  const supabase = await createServerClient()

  try {
    await validateSessionAndGetUser()

    // 1. Verificar facturas asociadas
    const { data: facturas } = await supabase
      .from('facturas')
      .select('id')
      .eq('id_presupuesto_final', budgetId)
      .limit(1)

    if (facturas && facturas.length > 0) {
      return { success: false, message: 'No se puede eliminar un presupuesto ya facturado.' }
    }

    // 2. Obtener datos para limpieza colateral
    const { data: pf } = await supabase
      .from('presupuestos_finales')
      .select('id_tarea, id_liquidacion_supervisor')
      .eq('id', budgetId)
      .single()

    if (pf?.id_liquidacion_supervisor) {
      await supabase.from('liquidaciones_nuevas').delete().eq('id', pf.id_liquidacion_supervisor)
    }

    // 3. Eliminar items y presupuesto
    await supabase.from('items').delete().eq('id_presupuesto', budgetId)
    const { error } = await supabase.from('presupuestos_finales').delete().eq('id', budgetId)

    if (error) throw error

    // 4. Restaurar estado de tarea si aplica
    if (pf?.id_tarea) {
      await supabase.from('tareas').update({ id_estado_nuevo: 1 }).eq('id', pf.id_tarea)
      revalidatePath('/dashboard/tareas')
    }

    revalidatePath('/dashboard/presupuestos-finales')
    return { success: true, message: 'Presupuesto eliminado correctamente.' }

  } catch (error: any) {
    console.error('Error deleteBudget:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Marcar presupuesto como enviado
 */
export async function marcarPresupuestoComoEnviado(presupuestoId: number) {
  try {
    const supabase = await createServerClient()
    const { rol } = await validateSessionAndGetUser()

    if (rol !== 'admin' && rol !== 'supervisor') return { success: false, message: 'Sin permisos' }

    // Determinar si ya tiene factura para asignar el estado correcto
    const { data: factura } = await supabase.from('facturas').select('id').eq('id_presupuesto_final', presupuestoId).maybeSingle()

    const { data: estados } = await supabase.from('estados_presupuestos').select('id, codigo').in('codigo', ['enviado', 'facturado'])
    const idEnviado = estados?.find(e => e.codigo === 'enviado')?.id
    const idFacturado = estados?.find(e => e.codigo === 'facturado')?.id

    const nuevoEstado = factura ? idFacturado : idEnviado

    const { error } = await supabase
      .from('presupuestos_finales')
      .update({
        id_estado: nuevoEstado,
        updated_at: new Date().toISOString()
      })
      .eq('id', presupuestoId)

    if (error) throw error

    // 2. Propagar estado a la tarea asociada (SPC Protocol v85.1)
    const { data: pf } = await supabase.from('presupuestos_finales').select('id_tarea').eq('id', presupuestoId).single()
    if (pf?.id_tarea) {
      await supabase.from('tareas').update({ id_estado_nuevo: 4 }).eq('id', pf.id_tarea) // Estado 4 = Enviado
      revalidatePath('/dashboard/tareas')
    }

    revalidatePath('/dashboard/presupuestos-finales')
    revalidatePath(`/dashboard/presupuestos-finales/${presupuestoId}`)
    return { success: true, message: factura ? 'Marcado como facturado' : 'Marcado como enviado' }
  } catch (error: any) {
    console.error('Error marcarComoEnviado:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Convertir presupuesto en factura (Bridge)
 */
export async function convertirPresupuestoAFactura(presupuestoId: number) {
  const { convertirPresupuestoADosFacturas } = await import('./actions-factura')
  const result = await convertirPresupuestoADosFacturas(presupuestoId)

  if (result.success) {
    revalidatePath('/dashboard/presupuestos-finales')
    revalidatePath('/dashboard/facturas')
  }

  return result
}

/**
 * Obtener edificios filtrados opcionalmente por administrador (Server Action)
 */
export async function getEdificios(adminId?: string) {
  const supabase = await createServerClient()
  let query = supabase
    .from("edificios")
    .select("id, nombre, id_administrador")
    .order("nombre")

  if (adminId && adminId !== 'todos') {
    query = query.eq('id_administrador', adminId)
  }

  const { data } = await query
  return data || []
}
