"use server"

import { createSsrServerClient } from '@/lib/ssr-server'
import { revalidatePath } from 'next/cache'

export async function deleteBudget(budgetId: number) {
  if (!budgetId) {
    return { success: false, message: 'ID de presupuesto no proporcionado.' }
  }

  const supabase = await createSsrServerClient()

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

    // Obtener la tarea asociada al presupuesto para actualizar su estado después
    const { data: presupuestoData, error: presupuestoError } = await supabase
      .from('presupuestos_finales')
      .select('id_tarea')
      .eq('id', budgetId)
      .single()

    if (presupuestoError) {
      console.error('Error al obtener datos del presupuesto:', presupuestoError)
      return { success: false, message: 'Error al obtener datos del presupuesto.' }
    }

    const idTarea = presupuestoData?.id_tarea
    
    // 2. Eliminar los items del presupuesto (tabla correcta: items con columna id_presupuesto)
    const { error: itemsError } = await supabase
      .from('items')
      .delete()
      .eq('id_presupuesto', budgetId)

    if (itemsError) {
      console.error('Error al eliminar items del presupuesto:', itemsError)
      return { success: false, message: 'Error al eliminar los ítems del presupuesto.' }
    }

    // 3. Eliminar el presupuesto
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
