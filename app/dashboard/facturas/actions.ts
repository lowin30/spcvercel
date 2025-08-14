"use server"

import { createSsrServerClient } from '@/lib/ssr-server'
import { revalidatePath } from 'next/cache'

// Función para actualizar el campo es_material de un ítem de factura
export async function updateItemEsMaterial(itemId: number, esMaterial: boolean) {
  if (!itemId) {
    return { success: false, message: 'ID de ítem no proporcionado.' }
  }

  const supabase = await createSsrServerClient()

  try {
    // Actualizar el campo es_material del ítem
    const { error } = await supabase
      .from('items_factura')
      .update({ es_material: esMaterial })
      .eq('id', itemId)

    if (error) {
      console.error('Error al actualizar el ítem:', error)
      return { success: false, message: `Error al actualizar el ítem: ${error.message}` }
    }

    return { success: true, message: `Ítem actualizado correctamente: ${esMaterial ? 'Es material' : 'No es material'}` }
  } catch (error: any) {
    console.error('Error inesperado al actualizar el ítem:', error)
    return { success: false, message: `Error inesperado: ${error.message}` }
  }
}

export async function deleteInvoice(invoiceId: number) {
  if (!invoiceId) {
    return { success: false, message: 'ID de factura no proporcionado.' }
  }

  const supabase = await createSsrServerClient()

  try {
    // 1. Verificar si hay pagos asociados
    const { data: payments, error: paymentsError } = await supabase
      .from('pagos_facturas')
      .select('id')
      .eq('id_factura', invoiceId)
      .limit(1)

    if (paymentsError) {
      console.error('Error al verificar pagos:', paymentsError)
      return { success: false, message: 'Error al verificar los pagos de la factura.' }
    }

    if (payments && payments.length > 0) {
      return { success: false, message: 'No se puede eliminar la factura porque tiene pagos asociados.' }
    }
    
    // Obtener el ID del presupuesto final asociado a esta factura
    const { data: facturaData, error: facturaError } = await supabase
      .from('facturas')
      .select('id_presupuesto_final')
      .eq('id', invoiceId)
      .single()
      
    if (facturaError) {
      console.error('Error al obtener datos de la factura:', facturaError)
      return { success: false, message: 'Error al obtener datos de la factura.' }
    }
    
    const idPresupuestoFinal = facturaData?.id_presupuesto_final

    // 2. Obtener primero los IDs de los ítems de la factura para eliminar sus ajustes
    const { data: itemsData, error: itemsQueryError } = await supabase
      .from('items_factura')
      .select('id')
      .eq('id_factura', invoiceId)

    if (itemsQueryError) {
      console.error('Error al obtener los ítems de la factura:', itemsQueryError)
      return { success: false, message: 'Error al obtener los ítems de la factura.' }
    }

    // 3. Eliminar primero los ajustes asociados a los ítems
    if (itemsData && itemsData.length > 0) {
      const itemIds = itemsData.map(item => item.id)
      
      const { error: ajustesError } = await supabase
        .from('ajustes_facturas')
        .delete()
        .in('id_item', itemIds)

      if (ajustesError) {
        console.error('Error al eliminar los ajustes de los ítems:', ajustesError)
        return { success: false, message: 'Error al eliminar los ajustes de los ítems de la factura.' }
      }
    }

    // 4. Ahora sí eliminar los items de la factura
    const { error: itemsError } = await supabase
      .from('items_factura')
      .delete()
      .eq('id_factura', invoiceId)

    if (itemsError) {
      console.error('Error al eliminar items de la factura:', itemsError)
      return { success: false, message: `Error al eliminar los ítems de la factura. ${itemsError.message || ''}` }
    }

    // 3. Eliminar la factura principal
    const { error: invoiceError } = await supabase
      .from('facturas')
      .delete()
      .eq('id', invoiceId)

    if (invoiceError) {
      console.error('Error al eliminar la factura:', invoiceError)
      return { success: false, message: 'Error al eliminar la factura.' }
    }
    
    // 4. Si hay un presupuesto asociado, actualizar su estado a "enviado" (id_estado: 2)
    if (idPresupuestoFinal) {
      // Obtener la tarea asociada al presupuesto
      const { data: presupuestoData, error: presupuestoError } = await supabase
        .from('presupuestos_finales')
        .select('id_tarea')
        .eq('id', idPresupuestoFinal)
        .single()
      
      if (presupuestoError) {
        console.error('Error al obtener datos del presupuesto:', presupuestoError)
      } else {
        const idTarea = presupuestoData?.id_tarea
        
        // 4.1 Actualizar el estado del presupuesto
        const { error: updateError } = await supabase
          .from('presupuestos_finales')
          .update({ id_estado: 2 }) // Estado "enviado"
          .eq('id', idPresupuestoFinal)
          
        if (updateError) {
          console.error('Error al actualizar estado del presupuesto:', updateError)
        } else {
          console.log(`Presupuesto ${idPresupuestoFinal} actualizado a estado "enviado" (id_estado: 2)`)
          // Revalidar también la ruta de presupuestos para reflejar el cambio de estado
          revalidatePath('/dashboard/presupuestos-finales')
        }
        
        // 4.2 Actualizar el estado de la tarea si existe
        if (idTarea) {
          const { error: tareaError } = await supabase
            .from('tareas')
            .update({ id_estado_nuevo: 4 }) // Estado "enviado" (id: 4)
            .eq('id', idTarea)
            
          if (tareaError) {
            console.error('Error al actualizar estado de la tarea:', tareaError)
          } else {
            console.log(`Tarea ${idTarea} actualizada a estado "enviado" (id_estado_nuevo: 4)`)
            // Revalidar también la ruta de tareas
            revalidatePath('/dashboard/tareas')
          }
        }
      }
    }

    // 5. Revalidar la ruta para actualizar la lista en la UI
    revalidatePath('/dashboard/facturas')

    return { success: true, message: 'Factura eliminada correctamente.' }

  } catch (error: any) {
    console.error('Error inesperado al eliminar la factura:', error)
    return { success: false, message: `Error inesperado: ${error.message}` }
  }
}
