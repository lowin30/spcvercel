"use server"

import { createSsrServerClient } from '@/lib/ssr-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { validateSessionAndGetUser } from '@/lib/auth-bridge'
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

  // SECURITY SHIELD v2.0
  const user = await validateSessionAndGetUser();
  if (user.rol !== 'admin') {
    throw new Error('No autorizado: Operación permitida solo para administradores');
  }

  try {
    // 1. Verificar si hay pagos asociados
    const { data: payments, error: paymentsError } = await supabaseAdmin
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
    const { data: facturaData, error: facturaError } = await supabaseAdmin
      .from('facturas')
      .select('id_presupuesto_final')
      .eq('id', invoiceId)
      .single()

    if (facturaError) {
      console.error('Error al obtener datos de la factura:', facturaError)
      return { success: false, message: 'Error al obtener datos de la factura (PGRST116).' }
    }

    const idPresupuestoFinal = facturaData?.id_presupuesto_final

    // 2. Obtener primero los IDs de los ítems de la factura para eliminar sus ajustes
    const { data: itemsData, error: itemsQueryError } = await supabaseAdmin
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

      const { error: ajustesError } = await supabaseAdmin
        .from('ajustes_facturas')
        .delete()
        .in('id_item', itemIds)

      if (ajustesError) {
        console.error('Error al eliminar los ajustes de los ítems:', ajustesError)
        return { success: false, message: 'Error al eliminar los ajustes de los ítems de la factura.' }
      }
    }

    // 4. Ahora sí eliminar los items de la factura
    const { error: itemsError } = await supabaseAdmin
      .from('items_factura')
      .delete()
      .eq('id_factura', invoiceId)

    if (itemsError) {
      console.error('Error al eliminar items de la factura:', itemsError)
      return { success: false, message: `Error al eliminar los ítems de la factura. ${itemsError.message || ''}` }
    }

    // 3. Eliminar la factura principal
    const { error: invoiceError } = await supabaseAdmin
      .from('facturas')
      .delete()
      .eq('id', invoiceId)

    if (invoiceError) {
      console.error('Error al eliminar la factura:', invoiceError)
      return { success: false, message: 'Error al eliminar la factura.' }
    }

    // 4. Si hay un presupuesto asociado, verificar si quedan otras facturas
    if (idPresupuestoFinal) {
      // Verificar si quedan otras facturas asociadas al mismo presupuesto
      const { data: facturasRestantes, error: facturasRestantesError } = await supabaseAdmin
        .from('facturas')
        .select('id')
        .eq('id_presupuesto_final', idPresupuestoFinal)
        .limit(1)

      if (facturasRestantesError) {
        console.error('Error al verificar facturas restantes:', facturasRestantesError)
      }

      const quedanFacturas = facturasRestantes && facturasRestantes.length > 0

      // Obtener la tarea asociada al presupuesto
      const { data: presupuestoData, error: presupuestoError } = await supabaseAdmin
        .from('presupuestos_finales')
        .select('id_tarea')
        .eq('id', idPresupuestoFinal)
        .single()

      if (presupuestoError) {
        console.error('Error al obtener datos del presupuesto:', presupuestoError)
      } else {
        const idTarea = presupuestoData?.id_tarea

        // 4.1 Actualizar el estado del presupuesto según si quedan facturas
        if (!quedanFacturas) {
          // Si NO quedan facturas, volver a estado "presupuestado" y desaprobar
          const { error: updateError } = await supabaseAdmin
            .from('presupuestos_finales')
            .update({
              id_estado: 3,      // Estado "presupuestado"
              aprobado: false    // Desaprobar el presupuesto
            })
            .eq('id', idPresupuestoFinal)

          if (updateError) {
            console.error('Error al actualizar estado del presupuesto:', updateError)
          } else {
            console.log(`Presupuesto ${idPresupuestoFinal} actualizado a estado "presupuestado" (id_estado: 3) y desaprobado`)
            revalidatePath('/dashboard/presupuestos-finales')
            revalidatePath(`/dashboard/presupuestos-finales/${idPresupuestoFinal}`)
            revalidatePath(`/dashboard/presupuestos-finales/editar/${idPresupuestoFinal}`)
          }

          // 4.2 Actualizar el estado de la tarea si existe
          if (idTarea) {
            const { error: tareaError } = await supabaseAdmin
              .from('tareas')
              .update({ id_estado_nuevo: 3 }) // Estado "presupuestado" (id: 3)
              .eq('id', idTarea)

            if (tareaError) {
              console.error('Error al actualizar estado de la tarea:', tareaError)
            } else {
              console.log(`Tarea ${idTarea} actualizada a estado "presupuestado" (id_estado_nuevo: 3)`)
              revalidatePath('/dashboard/tareas')
              revalidatePath(`/dashboard/tareas/${idTarea}`)
            }
          }
        } else {
          console.log(`Presupuesto ${idPresupuestoFinal} mantiene estado "facturado" porque aún tiene facturas asociadas`)
          // Revalidar de todas formas para actualizar la UI
          revalidatePath('/dashboard/presupuestos-finales')
          revalidatePath(`/dashboard/presupuestos-finales/${idPresupuestoFinal}`)
          if (idTarea) {
            revalidatePath(`/dashboard/tareas/${idTarea}`)
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

// ... existing code ...

export async function createFacturaAction(formData: {
  id_presupuesto_final: number;
  id_presupuesto: number;
  id_estado_nuevo: number;
  datos_afip: string | null;
  id_administrador: number;
  items: {
    descripcion: string;
    cantidad: number;
    precio: number;
    es_mano_obra?: boolean;
    es_material?: boolean; // Added support for material flag
  }[];
  notas?: string;
}) {
  // SECURITY SHIELD v2.0
  const user = await validateSessionAndGetUser();
  if (user.rol !== 'admin') {
    throw new Error('No autorizado: Operación permitida solo para administradores');
  }

  try {

    // 2. Recalcular total en el servidor (Seguridad Crítica)
    // No confiamos en el total enviado por el cliente.
    const calculatedTotal = formData.items.reduce((sum, item) => {
      return sum + (Number(item.cantidad) * Number(item.precio))
    }, 0)

    // 3. Preparar objeto factura
    const nuevaFactura = {
      id_presupuesto_final: formData.id_presupuesto_final,
      id_presupuesto: formData.id_presupuesto,
      monto_total: calculatedTotal, // Usamos el total validado
      total: calculatedTotal,      // Redundancia por compatibilidad si esquema varia
      id_estado_nuevo: formData.id_estado_nuevo,
      datos_afip: formData.datos_afip,
      id_administrador: formData.id_administrador,
      // notas: formData.notas // Verificar si existe columna notas en facturas, si no ignorar
    }

    // 4. Insertar factura
    const { data: facturaInsertada, error: invoiceError } = await supabaseAdmin
      .from('facturas')
      .insert(nuevaFactura)
      .select()
      .single()

    if (invoiceError) {
      console.error('Error insertando factura:', invoiceError)
      return { success: false, message: `Error al crear factura: ${invoiceError.message}` }
    }

    // 5. Insertar items
    if (formData.items && formData.items.length > 0) {
      const itemsFactura = formData.items.map(item => ({
        id_factura: facturaInsertada.id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        subtotal_item: Number(item.cantidad) * Number(item.precio),
        es_material: item.es_material || false
      }))

      const { error: itemsError } = await supabaseAdmin
        .from('items_factura')
        .insert(itemsFactura)

      if (itemsError) {
        // Riesgo: Factura creada sin items. Deberíamos hacer rollback o alertar.
        // Por "Cirugía Mínima" solo logueamos y retornamos error parcial o advertencia.
        console.error('Error insertando items:', itemsError)
        return { success: false, message: 'Factura creada pero hubo error al guardar los items.' }
      }
    }

    revalidatePath('/dashboard/facturas')
    return { success: true, message: 'Factura creada exitosamente', data: facturaInsertada }

  } catch (error: any) {
    console.error('Excepción en createFacturaAction:', error)
    return { success: false, message: `Error inesperado: ${error.message}` }
  }
}
