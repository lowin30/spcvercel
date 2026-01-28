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
      descripcion: '', // Descripción vacía para que el usuario ingrese una nueva
      id_estado_nuevo: 10, // Posible (estado para trabajos futuros/potenciales)
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

    // 5. Copiar departamentos de la tarea original a la nueva tarea
    const newTaskId = newTask?.[0]?.id
    if (newTaskId) {
      // Obtener departamentos de la tarea original
      const { data: departamentosOriginales, error: deptError } = await supabase
        .from('departamentos_tareas')
        .select('id_departamento')
        .eq('id_tarea', taskId)

      if (!deptError && departamentosOriginales && departamentosOriginales.length > 0) {
        // Insertar los mismos departamentos para la nueva tarea
        const departamentosInserts = departamentosOriginales.map(dept => ({
          id_tarea: newTaskId,
          id_departamento: dept.id_departamento
        }))

        const { error: insertDeptError } = await supabase
          .from('departamentos_tareas')
          .insert(departamentosInserts)

        if (insertDeptError) {
          console.error('Error al clonar departamentos:', insertDeptError)
          // No retornamos error, la tarea ya fue creada
        }
      }
    }

    // 6. Revalidar la ruta para actualizar la UI
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

/**
 * Actualizar una tarea existente
 */
export async function updateTask(taskId: number, data: any) {
  if (!taskId) return { success: false, message: 'ID requerido' }

  const supabase = await createSsrServerClient()

  try {
    // 1. Update basic fields
    const { error: updateError } = await supabase
      .from('tareas')
      .update({
        titulo: data.titulo,
        descripcion: data.descripcion,
        prioridad: data.prioridad,
        fecha_visita: data.fecha_visita,
        id_edificio: data.id_edificio,
        id_administrador: data.id_administrador
      })
      .eq('id', taskId)

    if (updateError) throw updateError

    // 2. Update Relationships
    if (data.id_supervisor !== undefined) {
      await supabase.from('supervisores_tareas').delete().eq('id_tarea', taskId)
      if (data.id_supervisor) {
        await supabase.from('supervisores_tareas').insert({
          id_tarea: taskId,
          id_supervisor: data.id_supervisor
        })
      }
    }

    if (data.id_asignado !== undefined) {
      await supabase.from('trabajadores_tareas').delete().eq('id_tarea', taskId)
      if (data.id_asignado) {
        await supabase.from('trabajadores_tareas').insert({
          id_tarea: taskId,
          id_trabajador: data.id_asignado
        })
      }
    }

    if (data.departamentos_ids !== undefined) {
      await supabase.from('departamentos_tareas').delete().eq('id_tarea', taskId)
      if (data.departamentos_ids.length > 0) {
        const depts = data.departamentos_ids.map((d: any) => ({
          id_tarea: taskId,
          id_departamento: d
        }))
        await supabase.from('departamentos_tareas').insert(depts)
      }
    }

    revalidatePath('/dashboard/tareas')
    return { success: true, message: 'Tarea actualizada' }
  } catch (error: any) {
    console.error('Update Task Error:', error)
    return { success: false, message: error.message }
  }
}
