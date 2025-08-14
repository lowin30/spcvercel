"use server"

import { createSsrServerClient } from '@/lib/ssr-server'
import { revalidatePath } from 'next/cache'

// Función para actualizar el campo es_material de un ítem de presupuesto final
export async function updateItemEsMaterial(itemId: number, esMaterial: boolean) {
  if (!itemId) {
    return { success: false, message: 'ID de ítem no proporcionado.' }
  }

  const supabase = await createSsrServerClient()

  try {
    // Actualizar el campo es_material del ítem
    const { error } = await supabase
      .from('items')
      .update({ es_material: esMaterial })
      .eq('id', itemId)

    if (error) {
      console.error('Error al actualizar el ítem:', error)
      return { success: false, message: `Error al actualizar el ítem: ${error.message}` }
    }

    // Revalidar la página para que se actualice la UI
    revalidatePath('/dashboard/presupuestos-finales/editar/[id]')

    return { success: true, message: `Ítem actualizado correctamente: ${esMaterial ? 'Es material' : 'No es material'}` }
  } catch (error: any) {
    console.error('Error inesperado al actualizar el ítem:', error)
    return { success: false, message: `Error inesperado: ${error.message}` }
  }
}
