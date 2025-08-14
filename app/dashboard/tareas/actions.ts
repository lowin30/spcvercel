"use server"

import { createSsrServerClient } from '@/lib/ssr-server'
import { revalidatePath } from 'next/cache'

/**
 * Eliminar una tarea por su ID
 */
export async function deleteTask(taskId: number) {
  if (!taskId) {
    return { success: false, message: 'ID de tarea no proporcionado.' }
  }

  const supabase = await createSsrServerClient()

  try {
    // 1. Verificar si la tarea tiene presupuestos finales asociados
    const { data: presupuestosData, error: presupuestosError } = await supabase
      .from('presupuestos_finales')
      .select('id')
      .eq('id_tarea', taskId)
      .limit(1)

    if (presupuestosError) {
      console.error('Error al verificar presupuestos asociados:', presupuestosError)
      return { success: false, message: 'Error al verificar los presupuestos asociados.' }
    }

    if (presupuestosData && presupuestosData.length > 0) {
      return { 
        success: false, 
        message: 'No se puede eliminar la tarea porque tiene presupuestos finales asociados.' 
      }
    }
    
    // 2. Eliminar presupuestos base asociados a la tarea
    const { error: presupuestosBaseError } = await supabase
      .from('presupuestos_base')
      .delete()
      .eq('id_tarea', taskId)
    
    if (presupuestosBaseError) {
      console.error('Error al eliminar presupuestos base:', presupuestosBaseError)
      return { success: false, message: 'Error al eliminar los presupuestos base asociados.' }
    }

    // 3. Eliminar asignaciones a trabajadores
    // Nota: Mantenemos operaciones de escritura en las tablas originales, no en vistas
    const { error: trabajadoresError } = await supabase
      .from('trabajadores_tareas')
      .delete()
      .eq('id_tarea', taskId)

    if (trabajadoresError) {
      console.error('Error al eliminar asignaciones de trabajadores:', trabajadoresError)
      return { success: false, message: 'Error al eliminar las asignaciones de trabajadores.' }
    }

    // 4. Eliminar asignaciones a supervisores
    // Nota: Mantenemos operaciones de escritura en las tablas originales, no en vistas
    const { error: supervisoresError } = await supabase
      .from('supervisores_tareas')
      .delete()
      .eq('id_tarea', taskId)

    if (supervisoresError) {
      console.error('Error al eliminar asignaciones de supervisores:', supervisoresError)
      return { success: false, message: 'Error al eliminar las asignaciones de supervisores.' }
    }

    // 4. Eliminar la tarea
    const { error: taskError } = await supabase
      .from('tareas')
      .delete()
      .eq('id', taskId)

    if (taskError) {
      console.error('Error al eliminar la tarea:', taskError)
      return { success: false, message: 'Error al eliminar la tarea.' }
    }

    // 5. Revalidar la ruta para actualizar la UI
    // Usamos revalidatePath con la opción 'page' para forzar una revalidación completa
    revalidatePath('/dashboard/tareas', 'page')

    return { success: true, message: 'Tarea eliminada correctamente.' }

  } catch (error: any) {
    console.error('Error inesperado al eliminar la tarea:', error)
    return { success: false, message: `Error inesperado: ${error.message}` }
  }
}

/**
 * Clonar una tarea existente
 */
export async function cloneTask(taskId: number) {
  if (!taskId) {
    return { success: false, message: 'ID de tarea no proporcionado.' }
  }

  const supabase = await createSsrServerClient()

  try {
    // 1. Obtener los datos de la tarea original usando la vista optimizada
    // Obtenemos solo los campos necesarios para la clonación
    const { data: originalTask, error: taskError } = await supabase
      .from('vista_tareas_completa')
      .select('id, titulo, descripcion, prioridad, id_edificio, id_administrador')
      .eq('id', taskId)
      .single()

    if (taskError || !originalTask) {
      console.error('Error al obtener la tarea original:', taskError)
      return { success: false, message: 'Error al obtener los datos de la tarea original.' }
    }

    // 3. Preparar los datos de la nueva tarea (clonada)
    const newTaskData = {
      titulo: `Copia de: ${originalTask.titulo}`,
      descripcion: originalTask.descripcion,
      id_estado_nuevo: 1, // Organizar (estado inicial)
      prioridad: originalTask.prioridad,
      id_edificio: originalTask.id_edificio,
      id_administrador: originalTask.id_administrador,
      // No incluimos el campo 'code' porque es una columna generada automáticamente
      // No clonar trabajadores ni supervisores asignados
    }

    // 4. Insertar la nueva tarea
    const { data: newTask, error: insertError } = await supabase
      .from('tareas')
      .insert([newTaskData])
      .select()

    if (insertError) {
      console.error('Error al clonar la tarea:', insertError)
      return { success: false, message: 'Error al crear la tarea clonada.' }
    }

    // 5. Revalidar la ruta para actualizar la UI
    // Usamos revalidatePath con la opción 'page' para forzar una revalidación completa
    revalidatePath('/dashboard/tareas', 'page')

    return { 
      success: true, 
      message: 'Tarea clonada correctamente.', 
      data: newTask?.[0] 
    }

  } catch (error: any) {
    console.error('Error inesperado al clonar la tarea:', error)
    return { success: false, message: `Error inesperado: ${error.message}` }
  }
}
