"use server"

import { createServerClient } from '@/lib/supabase-server'
import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { revalidatePath } from 'next/cache'

/**
 * actualizar el campo es_material de un item
 */
export async function updateItemEsMaterial(itemId: number, esMaterial: boolean, presupuestoId: number) {
  try {
    const supabase = await createServerClient()
    await validateSessionAndGetUser();

    if (!itemId) {
      return { success: false, message: 'id de item no proporcionado.' }
    }

    const { error } = await supabase
      .from('items')
      .update({ es_material: esMaterial })
      .eq('id', itemId)

    if (error) throw error

    revalidatePath(`/dashboard/presupuestos-finales/editar/${presupuestoId}`)
    return { success: true, message: `item actualizado correctamente: ${esMaterial ? 'es material' : 'no es material'}` }
  } catch (error: any) {
    console.error('error al actualizar item:', error)
    return { success: false, message: `error: ${error.message}` }
  }
}

/**
 * eliminar presupuesto final de manera segura
 */
export async function deleteBudget(budgetId: number) {
  if (!budgetId) return { success: false, message: 'id no proporcionado.' }
  const supabase = await createServerClient()

  try {
    await validateSessionAndGetUser()

    // 1. verificar facturas asociadas
    const { data: facturas } = await supabase
      .from('facturas')
      .select('id')
      .eq('id_presupuesto_final', budgetId)
      .limit(1)

    if (facturas && facturas.length > 0) {
      return { success: false, message: 'no se puede eliminar un presupuesto ya facturado.' }
    }

    // 2. obtener datos para limpieza colateral
    const { data: pf } = await supabase
      .from('presupuestos_finales')
      .select('id_tarea, id_liquidacion_supervisor')
      .eq('id', budgetId)
      .single()

    if (pf?.id_liquidacion_supervisor) {
      await supabase.from('liquidaciones_nuevas').delete().eq('id', pf.id_liquidacion_supervisor)
    }

    // 3. eliminar items y presupuesto
    await supabase.from('items').delete().eq('id_presupuesto', budgetId)
    const { error } = await supabase.from('presupuestos_finales').delete().eq('id', budgetId)

    if (error) throw error

    // 4. restaurar estado de tarea si aplica
    if (pf?.id_tarea) {
      await supabase.from('tareas').update({ id_estado_nuevo: 1 }).eq('id', pf.id_tarea)
      revalidatePath('/dashboard/tareas')
    }

    revalidatePath('/dashboard/presupuestos-finales')
    return { success: true, message: 'presupuesto eliminado correctamente.' }

  } catch (error: any) {
    console.error('error deletebudget:', error)
    return { success: false, message: error.message }
  }
}

/**
 * marcar presupuesto como enviado
 */
export async function marcarPresupuestoComoEnviado(presupuestoId: number) {
  try {
    const supabase = await createServerClient()
    const { rol } = await validateSessionAndGetUser()

    if (rol !== 'admin' && rol !== 'supervisor') return { success: false, message: 'sin permisos' }

    // determinar si ya tiene factura para asignar el estado correcto
    const { data: factura } = await supabase.from('facturas').select('id').eq('id_presupuesto_final', presupuestoId).maybeSingle()

    const { data: estados } = await supabase.from('estados_presupuestos').select('id, codigo').in('codigo', ['enviado', 'facturado'])
    const idEnviado = estados?.find(e => e.codigo === 'enviado')?.id
    const idFacturado = estados?.find(e => e.codigo === 'facturado')?.id

    const nuevoEstado = factura ? idFacturado : idEnviado

    const { error } = await supabase
      .from('presupuestos_finales')
      .update({
        id_estado: nuevoEstado,
        // blindaje quirúrgico: si está facturado, debe estar aprobado lógicamente
        aprobado: factura ? true : undefined,
        fecha_aprobacion: factura ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', presupuestoId)

    if (error) throw error

    // 2. propagar estado a la tarea asociada (spc protocol v85.1)
    const { data: pf } = await supabase.from('presupuestos_finales').select('id_tarea, id_presupuesto_base').eq('id', presupuestoId).single()
    if (pf?.id_tarea) {
      await supabase.from('tareas').update({ id_estado_nuevo: 4 }).eq('id', pf.id_tarea) // estado 4 = enviado
      
      // herencia quirúrgica: si facturamos, aprobamos el base para habilitar liquidación
      if (factura && pf.id_presupuesto_base) {
        await supabase.from('presupuestos_base').update({ 
          aprobado: true,
          fecha_aprobacion: new Date().toISOString()
        }).eq('id', pf.id_presupuesto_base)
        console.log(`[SYNC-QUIRURGICO] PB ${pf.id_presupuesto_base} aprobado automáticamente por PF ${presupuestoId} facturado`)
      }

      revalidatePath('/dashboard/tareas')
    }

    revalidatePath('/dashboard/presupuestos-finales')
    revalidatePath(`/dashboard/presupuestos-finales/${presupuestoId}`)
    return { success: true, message: factura ? 'marcado como facturado' : 'marcado como enviado' }
  } catch (error: any) {
    console.error('error marcarcomoenviado:', error)
    return { success: false, message: error.message }
  }
}

/**
 * convertir presupuesto en factura (bridge)
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
 * obtener edificios filtrados opcionalmente por administrador (server action)
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
