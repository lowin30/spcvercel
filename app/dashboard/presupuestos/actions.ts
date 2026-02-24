"use server"

import { createServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function deleteBudget(budgetId: number) {
  if (!budgetId) {
    return { success: false, message: 'ID de presupuesto no proporcionado.' }
  }

  const supabase = await createServerClient()

  try {
    // 1. Verificar si el presupuesto está asociado a una factura
    const { data: facturas, error: facturasError } = await supabase
      .from('facturas')
      .select('id')
      .eq('id_presupuesto_final', budgetId)
      .limit(1)

    if (facturasError) {
      console.error('Error al verificar facturas asociadas:', facturasError)
      return { success: false, message: 'Error al verificar las facturas asociadas.' }
    }

    if (facturas && facturas.length > 0) {
      return { success: false, message: 'No se puede eliminar el presupuesto porque ya ha sido facturado.' }
    }

    // Obtener datos del presupuesto (tarea y liquidación supervisor)
    const { data: presupuestoData, error: presupuestoError } = await supabase
      .from('presupuestos_finales')
      .select('id_tarea, id_liquidacion_supervisor')
      .eq('id', budgetId)
      .single()

    if (presupuestoError) {
      console.error('Error al obtener datos del presupuesto:', presupuestoError)
      return { success: false, message: 'Error al obtener datos del presupuesto.' }
    }

    const idTarea = presupuestoData?.id_tarea
    const idLiquidacionSupervisor = presupuestoData?.id_liquidacion_supervisor

    // 2. Romper referencia circular con liquidación (si existe)
    if (idLiquidacionSupervisor) {
      const { error: updateError } = await supabase
        .from('presupuestos_finales')
        .update({ id_liquidacion_supervisor: null })
        .eq('id', budgetId)

      if (updateError) {
        console.error('Error al romper referencia con liquidación:', updateError)
        // Continuamos de todos modos
      }
    }

    // 3. Eliminar liquidaciones asociadas (tabla liquidaciones_nuevas)
    if (idLiquidacionSupervisor) {
      const { error: liquidacionError } = await supabase
        .from('liquidaciones_nuevas')
        .delete()
        .eq('id', idLiquidacionSupervisor)

      if (liquidacionError) {
        console.error('Error al eliminar liquidación:', liquidacionError)
        // Continuamos de todos modos
      }
    }

    // También eliminar liquidaciones que referencian directamente al presupuesto
    const { error: liquidacionesError } = await supabase
      .from('liquidaciones_nuevas')
      .delete()
      .eq('id_presupuesto_final', budgetId)

    if (liquidacionesError) {
      console.error('Error al eliminar liquidaciones por presupuesto:', liquidacionesError)
      // Continuamos de todos modos
    }

    // 4. Eliminar los items del presupuesto
    const { error: itemsError } = await supabase
      .from('items')
      .delete()
      .eq('id_presupuesto', budgetId)

    if (itemsError) {
      console.error('Error al eliminar items del presupuesto:', itemsError)
      return { success: false, message: 'Error al eliminar los ítems del presupuesto.' }
    }

    // 5. Eliminar el presupuesto
    const { error: budgetError } = await supabase
      .from('presupuestos_finales')
      .delete()
      .eq('id', budgetId)

    if (budgetError) {
      console.error('Error al eliminar el presupuesto:', budgetError)
      return { success: false, message: 'Error al eliminar el presupuesto.' }
    }

    // 4. Actualizar el estado de la tarea asociada a "presupuestado" (id_estado_nuevo: 3)
    if (idTarea) {
      const { error: tareaError } = await supabase
        .from('tareas')
        .update({ id_estado_nuevo: 2 }) // Estado "preguntar"
        .eq('id', idTarea)

      if (tareaError) {
        console.error('Error al actualizar estado de la tarea:', tareaError)
        // No retornamos error ya que el presupuesto se eliminó correctamente
      } else {
        // Revalidar también la ruta de tareas
        revalidatePath('/dashboard/tareas')
      }
    }

    revalidatePath('/dashboard/presupuestos')

    return { success: true, message: 'Presupuesto eliminado correctamente.' }

  } catch (error: any) {
    console.error('Error inesperado al eliminar el presupuesto:', error)
    return { success: false, message: `Error inesperado: ${error.message}` }
  }
}
