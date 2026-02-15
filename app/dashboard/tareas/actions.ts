"use server"

import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from 'next/cache'
import { sanitizeText } from '@/lib/utils'

/**
 * Eliminar una tarea por su ID
 * SEGURIDAD: Solo Admins
 */
export async function deleteTask(taskId: number) {
  if (!taskId) {
    return { success: false, message: 'ID de tarea no proporcionado.' }
  }

  try {
    const { rol } = await validateSessionAndGetUser()

    if (rol !== 'admin') {
      return { success: false, message: 'No autorizado. Solo administradores pueden eliminar tareas.' }
    }

    // 1. Verificar si la tarea tiene presupuestos finales asociados
    const { data: presupuestosData, error: presupuestosError } = await supabaseAdmin
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
    const { error: presupuestosBaseError } = await supabaseAdmin
      .from('presupuestos_base')
      .delete()
      .eq('id_tarea', taskId)

    if (presupuestosBaseError) {
      console.error('Error al eliminar presupuestos base:', presupuestosBaseError)
      return { success: false, message: 'Error al eliminar los presupuestos base asociados.' }
    }

    // 3. Eliminar asignaciones (Service Role maneja FKs, pero mejor borrar explicito)
    await supabaseAdmin.from('trabajadores_tareas').delete().eq('id_tarea', taskId)
    await supabaseAdmin.from('supervisores_tareas').delete().eq('id_tarea', taskId)
    await supabaseAdmin.from('departamentos_tareas').delete().eq('id_tarea', taskId)

    // 4. Eliminar la tarea
    const { error: taskError } = await supabaseAdmin
      .from('tareas')
      .delete()
      .eq('id', taskId)

    if (taskError) {
      console.error('Error al eliminar la tarea:', taskError)
      return { success: false, message: 'Error al eliminar la tarea.' }
    }

    revalidatePath('/dashboard/tareas', 'page')
    return { success: true, message: 'Tarea eliminada correctamente.' }

  } catch (error: any) {
    console.error('Error inesperado al eliminar la tarea:', error)
    return { success: false, message: `Error inesperado: ${error.message}` }
  }
}

/**
 * Clonar una tarea existente
 * SEGURIDAD: Admin o Supervisor
 */
export async function cloneTask(taskId: number) {
  if (!taskId) {
    return { success: false, message: 'ID de tarea no proporcionado.' }
  }

  try {
    const { rol } = await validateSessionAndGetUser()
    if (!['admin', 'supervisor'].includes(rol)) {
      return { success: false, message: 'No autorizado.' }
    }

    // 1. Obtener datos originales (Service Role)
    const { data: originalTask, error: taskError } = await supabaseAdmin
      .from('tareas') // Usamos tabla directa, no la vista "completa" que dependia de views opacas
      .select('id, titulo, descripcion, prioridad, id_edificio, id_administrador')
      .eq('id', taskId)
      .single()

    if (taskError || !originalTask) {
      console.error('Error al obtener la tarea original:', taskError)
      return { success: false, message: 'Error al obtener los datos de la tarea original.' }
    }

    const newTaskData = {
      titulo: `Copia de: ${sanitizeText(originalTask.titulo)}`,
      descripcion: '',
      id_estado_nuevo: 10, // Posible
      prioridad: originalTask.prioridad,
      id_edificio: originalTask.id_edificio,
      id_administrador: originalTask.id_administrador,
    }

    const { data: newTask, error: insertError } = await supabaseAdmin
      .from('tareas')
      .insert([newTaskData])
      .select()

    if (insertError) {
      console.error('Error al clonar la tarea:', insertError)
      return { success: false, message: 'Error al crear la tarea clonada.' }
    }

    // 5. Copiar departamentos
    const newTaskId = newTask?.[0]?.id
    if (newTaskId) {
      const { data: departamentosOriginales } = await supabaseAdmin
        .from('departamentos_tareas')
        .select('id_departamento')
        .eq('id_tarea', taskId)

      if (departamentosOriginales && departamentosOriginales.length > 0) {
        const departamentosInserts = departamentosOriginales.map(dept => ({
          id_tarea: newTaskId,
          id_departamento: dept.id_departamento
        }))

        await supabaseAdmin.from('departamentos_tareas').insert(departamentosInserts)
      }
    }

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
 * SEGURIDAD: Admin o Supervisor asignado (simplificado a Supervisor general por ahora para Phase 1)
 */
export async function updateTask(taskId: number, data: any) {
  if (!taskId) return { success: false, message: 'ID requerido' }

  try {
    const { rol } = await validateSessionAndGetUser()
    // TODO: Refinar permiso de supervisor (solo si asignado). 
    // Por ahora, permitimos a cualquier supervisor editar si tiene acceso al dashboard.
    if (!['admin', 'supervisor'].includes(rol)) {
      return { success: false, message: 'No autorizado.' }
    }

    const { error: updateError } = await supabaseAdmin
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

    // Relations updates
    if (data.id_supervisor !== undefined) {
      await supabaseAdmin.from('supervisores_tareas').delete().eq('id_tarea', taskId)
      if (data.id_supervisor) {
        await supabaseAdmin.from('supervisores_tareas').insert({
          id_tarea: taskId,
          id_supervisor: data.id_supervisor
        })
      }
    }

    if (data.id_asignado !== undefined) {
      await supabaseAdmin.from('trabajadores_tareas').delete().eq('id_tarea', taskId)
      if (data.id_asignado) {
        await supabaseAdmin.from('trabajadores_tareas').insert({
          id_tarea: taskId,
          id_trabajador: data.id_asignado
        })
      }
    }

    if (data.departamentos_ids !== undefined) {
      await supabaseAdmin.from('departamentos_tareas').delete().eq('id_tarea', taskId)
      if (data.departamentos_ids.length > 0) {
        const depts = data.departamentos_ids.map((d: any) => ({
          id_tarea: taskId,
          id_departamento: d
        }))
        await supabaseAdmin.from('departamentos_tareas').insert(depts)
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
 * Actualizar solo el estado de una tarea
 * SEGURIDAD: Admin o Supervisor
 */
export async function updateTaskStatusAction(taskId: number, estadoId: number, finalizada: boolean = false) {
  if (!taskId || !estadoId) return { success: false, message: 'datos incompletos' }

  try {
    const { rol } = await validateSessionAndGetUser()

    if (!['admin', 'supervisor'].includes(rol)) {
      return { success: false, message: 'acceso denegado: solo admin y supervisor pueden cambiar el estado' }
    }

    const { error } = await supabaseAdmin
      .from('tareas')
      .update({
        id_estado_nuevo: estadoId,
        finalizada: finalizada
      })
      .eq('id', taskId)

    if (error) throw error

    revalidatePath(`/dashboard/tareas/${taskId}`)
    revalidatePath('/dashboard/tareas')

    return { success: true, message: 'estado actualizado' }
  } catch (error: any) {
    console.error('Update Status Error:', error)
    return { success: false, message: error.message || 'error al actualizar estado' }
  }
}

/**
 * Crear una nueva tarea
 * SEGURIDAD: Admin o Supervisor
 */
export async function createTask(data: any) {
  try {
    const { rol } = await validateSessionAndGetUser()
    if (!['admin', 'supervisor'].includes(rol)) {
      return { success: false, error: 'No autorizado.' }
    }

    const p_titulo = sanitizeText(data.titulo)
    const p_descripcion = sanitizeText(data.descripcion)

    const rpcParams = {
      p_titulo,
      p_descripcion,
      p_id_administrador: Number(data.id_administrador),
      p_id_edificio: Number(data.id_edificio),
      p_prioridad: data.prioridad,
      p_id_estado_nuevo: Number(data.id_estado_nuevo || 1),
      p_fecha_visita: data.fecha_visita || null,
      p_id_supervisor: data.id_supervisor || null,
      p_id_trabajador: data.id_asignado || null,
      p_departamentos_ids: data.departamentos_ids?.map(Number) || []
    }

    // Usamos supabaseAdmin para ejecutar el RPC con privilegios
    const { data: result, error } = await supabaseAdmin.rpc('crear_tarea_con_asignaciones', rpcParams)

    if (error) throw error

    const created = result as { id: number, code: string }

    revalidatePath('/dashboard/tareas')
    return { success: true, task: created }

  } catch (e: any) {
    console.error("Error creating task:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Clonado Rápido (Quick Clone)
 */
export async function quickCloneTask(taskId: number, rubros: string[]) {
  try {
    const { rol } = await validateSessionAndGetUser()
    if (!['admin', 'supervisor'].includes(rol)) {
      return { success: false, message: "No autorizado" }
    }

    const { data: tareaPadre, error: fetchError } = await supabaseAdmin
      .from("tareas")
      .select("*")
      .eq("id", taskId)
      .single()

    if (fetchError || !tareaPadre) {
      throw new Error("No se pudo obtener la tarea original")
    }

    // Explicit relation fetch using Service Role
    const [superRel, workRel, deptRel] = await Promise.all([
      supabaseAdmin.from('supervisores_tareas').select('id_supervisor').eq('id_tarea', taskId).maybeSingle(),
      supabaseAdmin.from('trabajadores_tareas').select('id_trabajador').eq('id_tarea', taskId).maybeSingle(),
      supabaseAdmin.from('departamentos_tareas').select('id_departamento').eq('id_tarea', taskId)
    ])

    const parentSupervisorId = superRel.data?.id_supervisor
    const parentTrabajadorId = workRel.data?.id_trabajador
    const deptosIds = (deptRel.data || []).map((d: any) => Number(d.id_departamento)).filter(id => !isNaN(id))

    // Title Logic
    const oficiosParaRemover = [
      "Pintura", "Albañilería", "Plomería", "Electricidad", "Gas",
      "Herrería", "Herreria", "Aire Acondicionado", "Carpintería", "Carpinteria", "Varios",
      "Impermeabilización", "Impermeabilizacion", "Destapación", "Destapacion"
    ]

    const normalizeForSearch = (str: string) => {
      return str.normalize("NFD")
        .replace(/[\u0300-\u0302\u0304-\u036f]/g, "")
        .normalize("NFC")
        .toLowerCase()
    }

    let nuevoTitulo = tareaPadre.titulo || ""

    oficiosParaRemover.forEach(oficio => {
      const base = normalizeForSearch(oficio)
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

    if (rubros && rubros.length > 0) {
      const nuevosOficios = rubros
        .map(r => {
          const clean = r.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase()
        })
        .join(' ')
      nuevoTitulo = `${nuevoTitulo} ${nuevosOficios}`.trim()
    }

    const { data: nuevaTarea, error: createError } = await supabaseAdmin
      .from("tareas")
      .insert({
        id_edificio: tareaPadre.id_edificio,
        id_administrador: tareaPadre.id_administrador,
        id_departamento: tareaPadre.id_departamento,
        titulo: nuevoTitulo,
        descripcion: `Continuación de la tarea #${tareaPadre.id} (${tareaPadre.code || ''}): ${tareaPadre.titulo}\n\n${tareaPadre.descripcion || ''}`,
        id_estado_nuevo: 1,
        prioridad: tareaPadre.prioridad || 'media',
        finalizada: false
      })
      .select()
      .single()

    if (createError || !nuevaTarea) {
      throw new Error(createError?.message || "Error al crear la tarea clonada")
    }

    if (parentSupervisorId) {
      await supabaseAdmin.from("supervisores_tareas").insert({
        id_tarea: nuevaTarea.id,
        id_supervisor: parentSupervisorId
      })
    }

    if (parentTrabajadorId) {
      await supabaseAdmin.from("trabajadores_tareas").insert({
        id_tarea: nuevaTarea.id,
        id_trabajador: parentTrabajadorId
      })
    }

    if (deptosIds.length > 0) {
      const deptoRelations = deptosIds.map((idDep: number) => ({
        id_tarea: nuevaTarea.id,
        id_departamento: idDep
      }))
      await supabaseAdmin.from("departamentos_tareas").insert(deptoRelations)
    }

    revalidatePath('/dashboard/tareas')
    return { success: true, task: nuevaTarea }

  } catch (error: any) {
    console.error("Quick Clone Error:", error)
    return { success: false, message: error.message }
  }
}

/**
 * Validar y Crear Departamento + Contactos
 * Reemplazo seguro para QuickDeptCreateForm
 * SEGURIDAD: Admin o Supervisor
 */
export async function createDepartamentoAction(payload: any) {
  'use server'
  try {
    const { rol } = await validateSessionAndGetUser()

    // Validar permisos
    if (!['admin', 'supervisor'].includes(rol)) {
      throw new Error('No autorizado. Solo administradores y supervisores pueden crear departamentos.')
    }

    const { deptData, contactosData } = payload

    if (!deptData || !deptData.nombre || !deptData.id_edificio) {
      throw new Error("Datos del departamento incompletos")
    }

    // 1. Insertar Departamento (Service Role)
    const { data: newDept, error: deptError } = await supabaseAdmin
      .from("departamentos")
      .insert({
        nombre: sanitizeText(deptData.nombre),
        id_edificio: deptData.id_edificio,
        code: sanitizeText(deptData.code || ''),
        piso: deptData.piso ? sanitizeText(deptData.piso) : null,
        departamento: deptData.departamento ? sanitizeText(deptData.departamento) : null
      })
      .select()
      .single()

    if (deptError) throw new Error(`Error creando departamento: ${deptError.message}`)
    if (!newDept) throw new Error("No se pudo crear el departamento")

    // 2. Insertar Contactos vinculados
    if (contactosData && contactosData.length > 0) {
      const contactosPayload = contactosData.map((c: any) => ({
        nombre: sanitizeText(c.nombre), // Recibe el slug generado en cliente
        nombreReal: sanitizeText(c.nombreReal), // Recibe el nombre real
        email: c.email ? sanitizeText(c.email) : null,
        telefono: c.telefono ? sanitizeText(c.telefono) : null,
        id_tipo_contacto: c.id_tipo_contacto || 1, // Default safe
        id_edificio: deptData.id_edificio,
        id_departamento: newDept.id,
        relacion: c.relacion ? sanitizeText(c.relacion) : null, // Agregar relacion
        es_principal: !!c.es_principal, // Agregar flag
        tipo_padre: 'edificio', // Legacy compatibility
        id_padre: deptData.id_edificio, // Legacy compatibility
        departamento: newDept.codigo, // Legacy compatibility
        updated_at: new Date().toISOString()
      }))

      const { error: contactsError } = await supabaseAdmin
        .from("contactos")
        .insert(contactosPayload)

      if (contactsError) {
        console.error("Error creating contacts:", contactsError)
        // No fallamos toda la operación, pero avisamos (o retornamos warning)
      }
    }

    revalidatePath('/dashboard/tareas')

    // Retornamos estructura compatible con lo que espera el cliente (data, error null)
    return { data: newDept, error: null }

  } catch (error: any) {
    console.error("Create Dept Action Error:", error)
    return { data: null, error: { message: error.message || "Error desconocido" } }
  }
}

/**
 * Finalizar Tarea (Lógica Compleja de Negocio)
 * SEGURIDAD: Admin o Supervisor (o Trabajador si es asignado? -> Legacy permitía a veces)
 * Replicando lógica de finalizar-tarea-dialog.tsx
 */
export async function finalizarTareaAction(payload: {
  taskId: number,
  huboTrabajo: boolean,
  resumen: string,
  notasDepartamentos?: Record<number, string>
}) {
  try {
    const { rol, id: userId } = await validateSessionAndGetUser()
    // TODO: Refinar permisos. Por ahora Admin/Supervisor + Trabajador Asignado (verificación pendiente)
    // Asumimos que la UI ya filtró el acceso al botón. Validamos sesión básica.

    if (!payload.taskId) throw new Error("ID de tarea requerido")

    const { taskId, huboTrabajo, resumen, notasDepartamentos } = payload

    // 1. Validar Presupuesto Base si hubo trabajo
    if (huboTrabajo) {
      const { data: pb } = await supabaseAdmin
        .from("presupuestos_base")
        .select("id")
        .eq("id_tarea", taskId)
        .maybeSingle()

      if (!pb) {
        return { success: false, message: "Debes crear un Presupuesto Base antes de finalizar esta tarea." }
      }
    }

    // 2. Determinar nuevo estado
    const nuevoEstado = huboTrabajo ? 7 : 11 // 7: terminado, 11: vencido/cancelado

    // 3. Actualizar Tarea
    const { error: taskError } = await supabaseAdmin
      .from("tareas")
      .update({
        finalizada: true,
        id_estado_nuevo: nuevoEstado
      })
      .eq("id", taskId)

    if (taskError) throw taskError

    // 4. Actualizar Estado de Presupuesto Final (Si existe y era Borrador)
    if (huboTrabajo) {
      const { data: pf } = await supabaseAdmin
        .from("presupuestos_finales")
        .select("id, id_estado")
        .eq("id_tarea", taskId)
        .maybeSingle()

      if (pf) {
        // Obtener IDs de estados (Borrador -> Enviado)
        const { data: estados } = await supabaseAdmin
          .from("estados_presupuestos")
          .select("id, codigo")
          .in("codigo", ["borrador", "enviado"])

        const idBorrador = estados?.find(e => e.codigo === "borrador")?.id
        const idEnviado = estados?.find(e => e.codigo === "enviado")?.id

        if (pf.id_estado === idBorrador && idEnviado) {
          await supabaseAdmin
            .from("presupuestos_finales")
            .update({ id_estado: idEnviado })
            .eq("id", pf.id)
        }
      }
    }

    // 5. Crear Comentario de Cierre
    const prefijoComentario = huboTrabajo ? "TAREA FINALIZADA" : "TAREA CERRADA SIN TRABAJO"
    await supabaseAdmin.from("comentarios").insert({
      contenido: `${prefijoComentario}\n\nResumen: ${resumen.trim()}`,
      id_tarea: taskId,
      id_usuario: userId,
    })

    // 6. Actualizar Notas de Departamentos
    if (notasDepartamentos && Object.keys(notasDepartamentos).length > 0) {
      // Ejecutar en paralelo
      await Promise.all(Object.entries(notasDepartamentos).map(async ([depId, nota]) => {
        if (!nota || !nota.trim()) return

        const fecha = new Date().toLocaleDateString('es-AR', {
          day: '2-digit', month: '2-digit', year: 'numeric'
        })
        const nuevaNota = `[${fecha}] ${nota.trim()}`

        // Obtener notas actuales para append
        const { data: current } = await supabaseAdmin
          .from("departamentos")
          .select("notas")
          .eq("id", depId)
          .single()

        const notasActualizadas = current?.notas
          ? `${current.notas}\n\n${nuevaNota}`
          : nuevaNota

        await supabaseAdmin
          .from("departamentos")
          .update({ notas: notasActualizadas })
          .eq("id", depId)
      }))
    }

    revalidatePath(`/dashboard/tareas/${taskId}`)
    revalidatePath('/dashboard/tareas')

    return { success: true, message: "Tarea finalizada con éxito" }

  } catch (error: any) {
    console.error("Finalizar Tarea Action Error:", error)
    return { success: false, message: error.message || "Error al finalizar la tarea" }
  }
}

/**
 * Publicar Comentario
 */
export async function postCommentAction(payload: {
  taskId: number,
  content: string,
  fotoUrls?: string[]
}) {
  try {
    const { id: userId } = await validateSessionAndGetUser()

    if (!payload.taskId) return { success: false, message: "ID de tarea requerido" }
    if (!payload.content && (!payload.fotoUrls || payload.fotoUrls.length === 0)) {
      return { success: false, message: "Contenido requerido" }
    }

    const { error } = await supabaseAdmin.from("comentarios").insert({
      contenido: payload.content,
      id_tarea: payload.taskId,
      id_usuario: userId,
      foto_url: payload.fotoUrls || []
    })

    if (error) throw error

    revalidatePath(`/dashboard/tareas/${payload.taskId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Post Comment Error:", error)
    return { success: false, message: error.message }
  }
}

/**
 * Actualizar Fecha de Visita
 * Reemplaza RPC actualizar_fecha_tarea si es posible, o lo wrappea.
 */
export async function updateTaskDateAction(taskId: number, dateString: string | null) {
  try {
    await validateSessionAndGetUser() // Asegurar auth

    // Intentar usar la RPC existente via Admin para consistencia
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('actualizar_fecha_tarea', {
      tarea_id: taskId,
      nueva_fecha: dateString
    });

    if (rpcError) {
      // Fallback: Update directo
      const { error: updateError } = await supabaseAdmin
        .from("tareas")
        .update({ fecha_visita: dateString })
        .eq("id", taskId)

      if (updateError) throw updateError
    }

    revalidatePath(`/dashboard/tareas/${taskId}`)
    revalidatePath('/dashboard/tareas')

    return { success: true, message: "Fecha actualizada" }

  } catch (error: any) {
    console.error("Update Date Error:", error)
    return { success: false, message: error.message }
  }
}

export async function updateBuildingNotesAction(buildingId: number, notes: string | null) {
  try {
    await validateSessionAndGetUser()
    if (!buildingId) throw new Error("ID de edificio requerido")

    const { error } = await supabaseAdmin
      .from('edificios')
      .update({ notas: notes })
      .eq('id', buildingId)

    if (error) throw error
    revalidatePath('/dashboard/tareas')
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function updateSupervisorAction(taskId: number, supervisorEmail: string | null) {
  try {
    await validateSessionAndGetUser()
    if (!taskId) throw new Error("ID de tarea requerido")

    // 1. Eliminar asignación actual
    await supabaseAdmin
      .from('supervisores_tareas')
      .delete()
      .eq('id_tarea', taskId)

    if (supervisorEmail) {
      // 2. Buscar ID por email
      const { data: user } = await supabaseAdmin
        .from('usuarios')
        .select('id')
        .eq('email', supervisorEmail)
        .single()

      if (!user) throw new Error("Supervisor no encontrado")

      // 3. Insertar nueva asignación
      const { error } = await supabaseAdmin
        .from('supervisores_tareas')
        .insert({
          id_tarea: taskId,
          id_supervisor: user.id
        })
      if (error) throw error
    }

    revalidatePath(`/dashboard/tareas/${taskId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function assignWorkerAction(taskId: number, workerId: string) {
  try {
    await validateSessionAndGetUser()

    const { error } = await supabaseAdmin
      .from("trabajadores_tareas")
      .insert({
        id_tarea: taskId,
        id_trabajador: workerId
      })

    if (error) throw error
    revalidatePath(`/dashboard/tareas/${taskId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function removeWorkerAction(taskId: number, workerId: string) {
  try {
    await validateSessionAndGetUser()

    const { error } = await supabaseAdmin
      .from("trabajadores_tareas")
      .delete()
      .eq("id_tarea", taskId)
      .eq("id_trabajador", workerId)

    if (error) throw error
    revalidatePath(`/dashboard/tareas/${taskId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function getDepartamentosAction(edificioId?: number) {
  try {
    await validateSessionAndGetUser()

    let query = supabaseAdmin.from('departamentos').select('id, codigo, edificio_id, propietario')

    if (edificioId) {
      query = query.eq('edificio_id', edificioId)
    }

    const { data, error } = await query.order('codigo')

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error("Get Departamentos Error:", error)
    return { success: false, message: error.message, data: [] }
  }
}

export async function getEdificiosAction() {
  try {
    await validateSessionAndGetUser()
    const { data, error } = await supabaseAdmin
      .from('edificios')
      .select('id, nombre, direccion')
      .order('nombre')

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error("Get Edificios Error:", error)
    return { success: false, message: error.message, data: [] }
  }
}
