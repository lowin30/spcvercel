"use server"

import { createSsrServerClient } from '@/lib/ssr-server'
import { revalidatePath } from 'next/cache'
import { sanitizeText } from '@/lib/utils'

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
      titulo: `Copia de: ${sanitizeText(originalTask.titulo)}`,
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
        titulo: sanitizeText(data.titulo),
        descripcion: sanitizeText(data.descripcion),
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

/**
 * Crear una nueva tarea (invocando RPC o lógica directa)
 */
export async function createTask(data: any) {
  const supabase = await createSsrServerClient()

  try {
    // 1. Sanitizar inputs
    const p_titulo = sanitizeText(data.titulo)
    const p_descripcion = sanitizeText(data.descripcion)

    // 2. Preparar payload para RPC
    // Mapeamos los campos del wizard/form a los parámetros del RPC
    const rpcParams = {
      p_titulo,
      p_descripcion,
      p_id_administrador: Number(data.id_administrador),
      p_id_edificio: Number(data.id_edificio),
      p_prioridad: data.prioridad,
      p_id_estado_nuevo: Number(data.id_estado_nuevo || 1),
      p_fecha_visita: data.fecha_visita || null,
      p_id_supervisor: data.id_supervisor || null,
      p_id_trabajador: data.id_asignado || null, // UI usa 'id_asignado' -> RPC usa 'id_trabajador'
      p_departamentos_ids: data.departamentos_ids?.map(Number) || []
    }

    const { data: result, error } = await supabase.rpc('crear_tarea_con_asignaciones', rpcParams)

    if (error) throw error

    // Result es { id: ..., code: ... }
    const created = result as { id: number, code: string }

    revalidatePath('/dashboard/tareas')
    return { success: true, task: created }

  } catch (e: any) {
    console.error("Error creating task:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Clonado Rápido Automático (Server Action)
 * Maneja la lógica de negocio completa: Fetches, Title Mutation, Inserts & Relations
 * 
 * SEGURIDAD:
 * Utiliza la sesión del usuario (createSsrServerClient) respetando todas las políticas RLS existentes.
 * No se usa Service Role Key para bypasear permisos.
 */
export async function quickCloneTask(taskId: number, rubros: string[]) {
  // 1. Cliente Standard para Auth (contexto usuario)
  const supabase = await createSsrServerClient()

  try {
    // 1.1 Verificar Usuario y Rol
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error("No autenticado")

    // Optional: Verificar Rol si es crítico (aunque estar en dashboard ya implica cierto acceso)
    // const { data: profile } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
    // if (!['admin', 'supervisor', 'trabajador'].includes(profile?.rol)) throw new Error("No autorizado")

    // 2. Fetch Parent Task
    const { data: tareaPadre, error: fetchError } = await supabase
      .from("tareas")
      .select("*")
      .eq("id", taskId)
      .single()

    if (fetchError || !tareaPadre) {
      throw new Error("No se pudo obtener la tarea original")
    }

    // 2.1 Fetch Relations Explicitly (Much more robust than joins)
    const [superRel, workRel, deptRel] = await Promise.all([
      supabase.from('supervisores_tareas').select('id_supervisor').eq('id_tarea', taskId).maybeSingle(),
      supabase.from('trabajadores_tareas').select('id_trabajador').eq('id_tarea', taskId).maybeSingle(),
      supabase.from('departamentos_tareas').select('id_departamento').eq('id_tarea', taskId)
    ])

    // 3. Prepare Data
    const parentSupervisorId = superRel.data?.id_supervisor
    const parentTrabajadorId = workRel.data?.id_trabajador
    const deptosIds = (deptRel.data || []).map((d: any) => Number(d.id_departamento)).filter(id => !isNaN(id))

    // 4. Robust Title Mutation Logic
    const oficiosParaRemover = [
      "Pintura", "Albañilería", "Plomería", "Electricidad", "Gas",
      "Herrería", "Herreria", "Aire Acondicionado", "Carpintería", "Carpinteria", "Varios",
      "Impermeabilización", "Impermeabilizacion", "Destapación", "Destapacion"
    ]

    // Helper: Normalizar para búsqueda (mantiene ñ, quita acentos)
    const normalizeForSearch = (str: string) => {
      return str.normalize("NFD")
        .replace(/[\u0300-\u0302\u0304-\u036f]/g, "") // Quitar acentos pero dejar tilde de la ñ
        .normalize("NFC")
        .toLowerCase()
    }

    let nuevoTitulo = tareaPadre.titulo || ""

    // Limpieza de oficios existentes
    oficiosParaRemover.forEach(oficio => {
      const base = normalizeForSearch(oficio)

      // Creamos un patrón que acepte vocales con y sin acento
      const pattern = base
        .replace(/a/g, '[aá]')
        .replace(/e/g, '[eé]')
        .replace(/i/g, '[ií]')
        .replace(/o/g, '[oó]')
        .replace(/u/g, '[uú]')

      const regex = new RegExp(`\\b${pattern}\\b`, 'gi')
      nuevoTitulo = nuevoTitulo.replace(regex, '')
    })
    nuevoTitulo = nuevoTitulo.replace(/\s+/g, ' ').trim()
    // Agregar nuevos rubros (Capitalizados y Sin Acentos)
    if (rubros && rubros.length > 0) {
      const nuevosOficios = rubros
        .map(r => {
          const clean = r.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase()
        })
        .join(' ')

      nuevoTitulo = `${nuevoTitulo} ${nuevosOficios}`.trim()
    }

    // 5. Insert New Task (Usando Cliente Standard - Respetando RLS)
    // Incluimos id_departamento para compatibilidad con el sistema anterior
    const { data: nuevaTarea, error: createError } = await supabase
      .from("tareas")
      .insert({
        id_edificio: tareaPadre.id_edificio,
        id_administrador: tareaPadre.id_administrador,
        id_departamento: tareaPadre.id_departamento, // Clonamos el dpto principal
        titulo: nuevoTitulo,
        descripcion: `Continuación de la tarea #${tareaPadre.id} (${tareaPadre.code || ''}): ${tareaPadre.titulo}\n\n${tareaPadre.descripcion || ''}`,
        id_estado_nuevo: 1, // Pendiente
        prioridad: tareaPadre.prioridad || 'media',
        finalizada: false
      })
      .select()
      .single()

    if (createError || !nuevaTarea) {
      throw new Error(createError?.message || "Error al crear la tarea clonada")
    }

    // 6. Insert Relations (Standard Client)

    // Supervisor
    if (parentSupervisorId) {
      const { error: supError } = await supabase.from("supervisores_tareas").insert({
        id_tarea: nuevaTarea.id,
        id_supervisor: parentSupervisorId
      })
      if (supError) console.error("Error linking supervisor:", supError)
    }

    // Trabajador (Asignado)
    if (parentTrabajadorId) {
      const { error: workError } = await supabase.from("trabajadores_tareas").insert({
        id_tarea: nuevaTarea.id,
        id_trabajador: parentTrabajadorId
      })
      if (workError) console.error("Error linking worker:", workError)
    }

    // Departamentos
    if (deptosIds.length > 0) {
      const deptoRelations = deptosIds.map((idDep: number) => ({
        id_tarea: nuevaTarea.id,
        id_departamento: idDep
      }))
      const { error: deptError } = await supabase.from("departamentos_tareas").insert(deptoRelations)
      if (deptError) {
        console.error("Error linking departments:", deptError)
      }
    }

    revalidatePath('/dashboard/tareas')
    return { success: true, task: nuevaTarea }

  } catch (error: any) {
    console.error("Quick Clone Error:", error)
    return { success: false, message: error.message }
  }
}
