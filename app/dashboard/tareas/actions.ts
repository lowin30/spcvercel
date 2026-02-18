"use server"

import { validateSessionAndGetUser } from "@/lib/auth-bridge"
// eliminamos la importacion externa que estaba fallando
// import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from 'next/cache'
import { sanitizeText } from '@/lib/utils'
import { createClient } from '@supabase/supabase-js'

// --- bridge protocol: inicializacion segura ---
// instanciamos el cliente aqui mismo para garantizar el acceso a la service_role_key.
// esto asegura que las acciones tengan permiso de escritura total sobre la db blindada.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * eliminar una tarea por su id
 * seguridad: solo admins
 */
export async function deleteTask(taskId: number) {
  if (!taskId) {
    return { success: false, message: 'id de tarea no proporcionado.' }
  }

  try {
    const { rol } = await validateSessionAndGetUser()

    if (rol !== 'admin') {
      return { success: false, message: 'no autorizado. solo administradores pueden eliminar tareas.' }
    }

    // 1. verificar si la tarea tiene presupuestos finales asociados
    const { data: presupuestosData, error: presupuestosError } = await supabaseAdmin
      .from('presupuestos_finales')
      .select('id')
      .eq('id_tarea', taskId)
      .limit(1)

    if (presupuestosError) {
      console.error('error al verificar presupuestos asociados:', presupuestosError)
      return { success: false, message: 'error al verificar los presupuestos asociados.' }
    }

    if (presupuestosData && presupuestosData.length > 0) {
      return {
        success: false,
        message: 'no se puede eliminar la tarea porque tiene presupuestos finales asociados.'
      }
    }

    // 2. eliminar presupuestos base asociados a la tarea
    const { error: presupuestosBaseError } = await supabaseAdmin
      .from('presupuestos_base')
      .delete()
      .eq('id_tarea', taskId)

    if (presupuestosBaseError) {
      console.error('error al eliminar presupuestos base:', presupuestosBaseError)
      return { success: false, message: 'error al eliminar los presupuestos base asociados.' }
    }

    // 3. eliminar asignaciones
    await supabaseAdmin.from('trabajadores_tareas').delete().eq('id_tarea', taskId)
    await supabaseAdmin.from('supervisores_tareas').delete().eq('id_tarea', taskId)
    await supabaseAdmin.from('departamentos_tareas').delete().eq('id_tarea', taskId)

    // 4. eliminar la tarea
    const { error: taskError } = await supabaseAdmin
      .from('tareas')
      .delete()
      .eq('id', taskId)

    if (taskError) {
      console.error('error al eliminar la tarea:', taskError)
      return { success: false, message: 'error al eliminar la tarea.' }
    }

    revalidatePath('/dashboard/tareas', 'page')
    return { success: true, message: 'tarea eliminada correctamente.' }

  } catch (error: any) {
    console.error('error inesperado al eliminar la tarea:', error)
    return { success: false, message: `error inesperado: ${error.message}` }
  }
}

/**
 * clonar una tarea existente
 * seguridad: admin o supervisor
 */
export async function cloneTask(taskId: number) {
  if (!taskId) {
    return { success: false, message: 'id de tarea no proporcionado.' }
  }

  try {
    const { rol } = await validateSessionAndGetUser()
    if (!['admin', 'supervisor'].includes(rol)) {
      return { success: false, message: 'no autorizado.' }
    }

    // 1. obtener datos originales
    const { data: originalTask, error: taskError } = await supabaseAdmin
      .from('tareas')
      .select('id, titulo, descripcion, prioridad, id_edificio, id_administrador')
      .eq('id', taskId)
      .single()

    if (taskError || !originalTask) {
      console.error('error al obtener la tarea original:', taskError)
      return { success: false, message: 'error al obtener los datos de la tarea original.' }
    }

    const newTaskData = {
      titulo: `copia de: ${sanitizeText(originalTask.titulo)}`,
      descripcion: '',
      id_estado_nuevo: 10,
      prioridad: originalTask.prioridad,
      id_edificio: originalTask.id_edificio,
      id_administrador: originalTask.id_administrador,
    }

    const { data: newTask, error: insertError } = await supabaseAdmin
      .from('tareas')
      .insert([newTaskData])
      .select()

    if (insertError) {
      console.error('error al clonar la tarea:', insertError)
      return { success: false, message: 'error al crear la tarea clonada.' }
    }

    // 5. copiar departamentos
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
      message: 'tarea clonada correctamente.',
      data: newTask?.[0]
    }

  } catch (error: any) {
    console.error('error inesperado al clonar la tarea:', error)
    return { success: false, message: `error inesperado: ${error.message}` }
  }
}

/**
 * actualizar una tarea existente
 */
export async function updateTask(taskId: number, data: any) {
  if (!taskId) return { success: false, message: 'id requerido' }

  try {
    const { rol } = await validateSessionAndGetUser()
    if (!['admin', 'supervisor'].includes(rol)) {
      return { success: false, message: 'no autorizado.' }
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

    // updates de relaciones
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
    return { success: true, message: 'tarea actualizada' }
  } catch (error: any) {
    console.error('update task error:', error)
    return { success: false, message: error.message }
  }
}

/**
 * actualizar solo el estado de una tarea
 */
export async function updateTaskStatusAction(taskId: number, estadoId: number, finalizada: boolean = false) {
  if (!taskId || !estadoId) return { success: false, message: 'datos incompletos' }

  try {
    const { rol } = await validateSessionAndGetUser()

    if (!['admin', 'supervisor'].includes(rol)) {
      return { success: false, message: 'acceso denegado' }
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
    console.error('update status error:', error)
    return { success: false, message: error.message || 'error al actualizar estado' }
  }
}

/**
 * crear una nueva tarea
 */
export async function createTask(data: any) {
  try {
    const { rol } = await validateSessionAndGetUser()
    if (!['admin', 'supervisor'].includes(rol)) {
      return { success: false, error: 'no autorizado.' }
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

    // usamos supabaseadmin para ejecutar el rpc con privilegios
    const { data: result, error } = await supabaseAdmin.rpc('crear_tarea_con_asignaciones', rpcParams)

    if (error) throw error

    const created = result as { id: number, code: string }

    revalidatePath('/dashboard/tareas')
    return { success: true, task: created }

  } catch (e: any) {
    console.error("error creating task:", e)
    return { success: false, error: e.message }
  }
}

/**
 * clonado rapido (quick clone)
 */
export async function quickCloneTask(taskId: number, rubros: string[]) {
  try {
    const { rol } = await validateSessionAndGetUser()
    if (!['admin', 'supervisor'].includes(rol)) {
      return { success: false, message: "no autorizado" }
    }

    const { data: tareaPadre, error: fetchError } = await supabaseAdmin
      .from("tareas")
      .select("*")
      .eq("id", taskId)
      .single()

    if (fetchError || !tareaPadre) {
      throw new Error("no se pudo obtener la tarea original")
    }

    const [superRel, workRel, deptRel] = await Promise.all([
      supabaseAdmin.from('supervisores_tareas').select('id_supervisor').eq('id_tarea', taskId).maybeSingle(),
      supabaseAdmin.from('trabajadores_tareas').select('id_trabajador').eq('id_tarea', taskId).maybeSingle(),
      supabaseAdmin.from('departamentos_tareas').select('id_departamento').eq('id_tarea', taskId)
    ])

    const parentSupervisorId = superRel.data?.id_supervisor
    const parentTrabajadorId = workRel.data?.id_trabajador
    const deptosIds = (deptRel.data || []).map((d: any) => Number(d.id_departamento)).filter(id => !isNaN(id))

    // title logic
    const oficiosParaRemover = [
      "pintura", "albañilería", "plomería", "electricidad", "gas",
      "herrería", "herreria", "aire acondicionado", "carpintería", "carpinteria", "varios",
      "impermeabilización", "impermeabilizacion", "destapación", "destapacion"
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
        descripcion: `continuación de la tarea #${tareaPadre.id} (${tareaPadre.code || ''}): ${tareaPadre.titulo}\n\n${tareaPadre.descripcion || ''}`,
        id_estado_nuevo: 1,
        prioridad: tareaPadre.prioridad || 'media',
        finalizada: false
      })
      .select()
      .single()

    if (createError || !nuevaTarea) {
      throw new Error(createError?.message || "error al crear la tarea clonada")
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
    console.error("quick clone error:", error)
    return { success: false, message: error.message }
  }
}

export async function createDepartamentoAction(payload: any) {
  try {
    const { rol } = await validateSessionAndGetUser()
    if (!['admin', 'supervisor'].includes(rol)) throw new Error('no autorizado')

    const { deptData, contactosData } = payload

    if (!deptData || !deptData.nombre || !deptData.id_edificio) {
      throw new Error("datos del departamento incompletos")
    }

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

    if (deptError) throw new Error(deptError.message)

    if (contactosData && contactosData.length > 0) {
      const contactosPayload = contactosData.map((c: any) => ({
        nombre: sanitizeText(c.nombre),
        nombreReal: sanitizeText(c.nombreReal),
        email: c.email ? sanitizeText(c.email) : null,
        telefono: c.telefono ? sanitizeText(c.telefono) : null,
        id_tipo_contacto: c.id_tipo_contacto || 1,
        id_edificio: deptData.id_edificio,
        id_departamento: newDept.id,
        relacion: c.relacion ? sanitizeText(c.relacion) : null,
        es_principal: !!c.es_principal,
        tipo_padre: 'edificio',
        id_padre: deptData.id_edificio,
        departamento: newDept.codigo,
        updated_at: new Date().toISOString()
      }))

      await supabaseAdmin.from("contactos").insert(contactosPayload)
    }

    revalidatePath('/dashboard/tareas')
    return { data: newDept, error: null }

  } catch (error: any) {
    console.error("create dept action error:", error)
    return { data: null, error: { message: error.message } }
  }
}

export async function finalizarTareaAction(payload: any) {
  try {
    const { rol, id: userId } = await validateSessionAndGetUser()
    if (!payload.taskId) throw new Error("id de tarea requerido")

    const { taskId, huboTrabajo, resumen, notasDepartamentos } = payload

    if (huboTrabajo) {
      const { data: pb } = await supabaseAdmin
        .from("presupuestos_base")
        .select("id")
        .eq("id_tarea", taskId)
        .maybeSingle()

      if (!pb) {
        return { success: false, message: "debes crear un presupuesto base antes de finalizar esta tarea." }
      }
    }

    const nuevoEstado = huboTrabajo ? 7 : 11

    const { error: taskError } = await supabaseAdmin
      .from("tareas")
      .update({
        finalizada: true,
        id_estado_nuevo: nuevoEstado
      })
      .eq("id", taskId)

    if (taskError) throw taskError

    if (huboTrabajo) {
      const { data: pf } = await supabaseAdmin
        .from("presupuestos_finales")
        .select("id, id_estado")
        .eq("id_tarea", taskId)
        .maybeSingle()

      if (pf) {
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

    await supabaseAdmin.from("comentarios").insert({
      contenido: `${huboTrabajo ? "tarea finalizada" : "tarea cerrada sin trabajo"}\n\nresumen: ${resumen.trim()}`,
      id_tarea: taskId,
      id_usuario: userId,
    })

    if (notasDepartamentos && Object.keys(notasDepartamentos).length > 0) {
      await Promise.all(Object.entries(notasDepartamentos).map(async ([depId, nota]) => {
        if (!nota || !nota.trim()) return
        const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const nuevaNota = `[${fecha}] ${nota.trim()}`
        const { data: current } = await supabaseAdmin.from("departamentos").select("notas").eq("id", depId).single()
        const notasActualizadas = current?.notas ? `${current.notas}\n\n${nuevaNota}` : nuevaNota
        await supabaseAdmin.from("departamentos").update({ notas: notasActualizadas }).eq("id", depId)
      }))
    }

    revalidatePath(`/dashboard/tareas/${taskId}`)
    revalidatePath('/dashboard/tareas')
    return { success: true, message: "tarea finalizada con éxito" }

  } catch (error: any) {
    console.error("finalizar tarea action error:", error)
    return { success: false, message: error.message }
  }
}

export async function postCommentAction(payload: any) {
  try {
    const { id: userId } = await validateSessionAndGetUser()
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
    console.error("post comment error:", error)
    return { success: false, message: error.message }
  }
}

export async function updateTaskDateAction(taskId: number, dateString: string | null) {
  try {
    await validateSessionAndGetUser()
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('actualizar_fecha_tarea', {
      tarea_id: taskId,
      nueva_fecha: dateString
    });

    if (rpcError) {
      const { error: updateError } = await supabaseAdmin
        .from("tareas")
        .update({ fecha_visita: dateString })
        .eq("id", taskId)
      if (updateError) throw updateError
    }

    revalidatePath(`/dashboard/tareas/${taskId}`)
    revalidatePath('/dashboard/tareas')
    return { success: true, message: "fecha actualizada" }
  } catch (error: any) {
    console.error("update date error:", error)
    return { success: false, message: error.message }
  }
}

export async function updateBuildingNotesAction(buildingId: number, notes: string | null) {
  try {
    await validateSessionAndGetUser();
    await supabaseAdmin.from('edificios').update({ notas: notes }).eq('id', buildingId);
    revalidatePath('/dashboard/tareas');
    return { success: true };
  } catch (e: any) { return { success: false, message: e.message } }
}
export async function updateSupervisorAction(taskId: number, supervisorEmail: string | null) {
  try {
    await validateSessionAndGetUser();
    await supabaseAdmin.from('supervisores_tareas').delete().eq('id_tarea', taskId);
    if (supervisorEmail) {
      const { data: user } = await supabaseAdmin.from('usuarios').select('id').eq('email', supervisorEmail).single();
      if (user) await supabaseAdmin.from('supervisores_tareas').insert({ id_tarea: taskId, id_supervisor: user.id });
    }
    revalidatePath(`/dashboard/tareas/${taskId}`);
    return { success: true };
  } catch (e: any) { return { success: false, message: e.message } }
}
export async function assignWorkerAction(taskId: number, workerId: string) {
  try {
    await validateSessionAndGetUser();
    await supabaseAdmin.from("trabajadores_tareas").insert({ id_tarea: taskId, id_trabajador: workerId });
    revalidatePath(`/dashboard/tareas/${taskId}`);
    return { success: true };
  } catch (e: any) { return { success: false, message: e.message } }
}
export async function removeWorkerAction(taskId: number, workerId: string) {
  try {
    await validateSessionAndGetUser();
    await supabaseAdmin.from("trabajadores_tareas").delete().eq("id_tarea", taskId).eq("id_trabajador", workerId);
    revalidatePath(`/dashboard/tareas/${taskId}`);
    return { success: true };
  } catch (e: any) { return { success: false, message: e.message } }
}
export async function getDepartamentosAction(edificioId?: number) {
  try {
    await validateSessionAndGetUser();
    let q = supabaseAdmin.from('departamentos').select('id, codigo, edificio_id, propietario');
    if (edificioId) q = q.eq('edificio_id', edificioId);
    const { data, error } = await q.order('codigo');
    if (error) throw error;
    return { success: true, data };
  } catch (e: any) { return { success: false, message: e.message, data: [] } }
}
export async function getEdificiosAction() {
  try {
    await validateSessionAndGetUser();
    const { data, error } = await supabaseAdmin.from('edificios').select('id, nombre, direccion').order('nombre');
    if (error) throw error;
    return { success: true, data };
  } catch (e: any) { return { success: false, message: e.message, data: [] } }
}

// =================================================================================
// bridge protocol: nuevas acciones para presupuestos (bypass rls real)
// =================================================================================

/**
 * crear presupuesto base de manera segura (server action)
 */
export async function createPresupuestoBaseAction(data: any) {
  console.log("server action: createpresupuestobaseaction called", {
    id_tarea: data.id_tarea,
    code: data.code,
    hasAdmin: !!supabaseAdmin
  })

  try {
    const user = await validateSessionAndGetUser()
    console.log("server action: user validated", { email: user.email, rol: user.rol })

    // calculo de seguridad para 'total' si no viene (materiales + mano_obra)
    const materiales = Number(data.materiales || 0)
    const manoObra = Number(data.mano_obra || 0)
    const insertData = {
      ...data,
      materiales,
      mano_obra: manoObra,
      // la columna 'total' es GENERATED ALWAYS, Postgres la calcula sola.
      id_supervisor: data.id_supervisor || user.id,
      aprobado: false
    }

    const { error, data: insertedData } = await supabaseAdmin
      .from('presupuestos_base')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error("server action error (db):", error)
      throw error
    }

    console.log("server action: success", insertedData.id)

    revalidatePath(`/dashboard/tareas/${data.id_tarea}`)
    return { success: true, data: insertedData }
  } catch (error: any) {
    console.error("create pb action error:", error)
    return { success: false, message: error.message }
  }
}

/**
 * aprobar presupuesto
 */
export async function aprobarPresupuestoAction(id: number, tipo: 'base' | 'final', taskId: number) {
  try {
    const { rol } = await validateSessionAndGetUser()
    if (rol !== 'admin') {
      return { success: false, message: "solo administradores pueden aprobar presupuestos" }
    }

    const tabla = tipo === 'base' ? 'presupuestos_base' : 'presupuestos_finales'
    const { error } = await supabaseAdmin
      .from(tabla)
      .update({
        aprobado: true,
        rechazado: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    // logica para generar facturas si es presupuesto final
    if (tipo === 'final') {
      console.log("server action: generando facturas para pf", id)
      const { convertirPresupuestoADosFacturas } = await import("@/app/dashboard/presupuestos-finales/actions-factura")
      await convertirPresupuestoADosFacturas(id)
    }

    revalidatePath(`/dashboard/tareas/${taskId}`)
    return { success: true }
  } catch (error: any) {
    console.error("aprobar presupuesto action error:", error)
    return { success: false, message: error.message }
  }
}

/**
 * rechazar presupuesto
 */
export async function rechazarPresupuestoAction(id: number, tipo: 'base' | 'final', taskId: number, observacion: string) {
  try {
    const { rol } = await validateSessionAndGetUser()
    if (rol !== 'admin') {
      return { success: false, message: "solo administradores pueden rechazar presupuestos" }
    }

    // obtener id de estado rechazado
    const { data: estadoData } = await supabaseAdmin
      .from("estados_presupuestos")
      .select("id")
      .ilike("nombre", "%rechazado%")
      .single()

    const tabla = tipo === 'base' ? 'presupuestos_base' : 'presupuestos_finales'
    const updateData: any = {
      aprobado: false,
      rechazado: true,
      observaciones_admin: observacion || null,
      updated_at: new Date().toISOString()
    }

    if (estadoData) {
      updateData.id_estado = estadoData.id
    }

    const { error } = await supabaseAdmin
      .from(tabla)
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    revalidatePath(`/dashboard/tareas/${taskId}`)
    return { success: true }
  } catch (error: any) {
    console.error("rechazar presupuesto action error:", error)
    return { success: false, message: error.message }
  }
}
