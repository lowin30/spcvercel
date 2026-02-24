"use server"

import { validateSessionAndGetUser } from "@/lib/auth-bridge"
// eliminamos la importacion externa que estaba fallando
// import { createServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { sanitizeText } from '@/lib/utils'
import { createClient } from '@supabase/supabase-js'
import { convertirPresupuestoADosFacturas } from '../presupuestos-finales/actions-factura'

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
    await (await createServerClient()).from('trabajadores_tareas').delete().eq('id_tarea', taskId)
    await (await createServerClient()).from('supervisores_tareas').delete().eq('id_tarea', taskId)
    await (await createServerClient()).from('departamentos_tareas').delete().eq('id_tarea', taskId)

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

        await (await createServerClient()).from('departamentos_tareas').insert(departamentosInserts)
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
      await (await createServerClient()).from('supervisores_tareas').delete().eq('id_tarea', taskId)
      if (data.id_supervisor) {
        await (await createServerClient()).from('supervisores_tareas').insert({
          id_tarea: taskId,
          id_supervisor: data.id_supervisor
        })
      }
    }

    if (data.id_asignado !== undefined) {
      await (await createServerClient()).from('trabajadores_tareas').delete().eq('id_tarea', taskId)
      if (data.id_asignado) {
        await (await createServerClient()).from('trabajadores_tareas').insert({
          id_tarea: taskId,
          id_trabajador: data.id_asignado
        })
      }
    }

    if (data.departamentos_ids !== undefined) {
      await (await createServerClient()).from('departamentos_tareas').delete().eq('id_tarea', taskId)
      if (data.departamentos_ids.length > 0) {
        const depts = data.departamentos_ids.map((d: any) => ({
          id_tarea: taskId,
          id_departamento: d
        }))
        await (await createServerClient()).from('departamentos_tareas').insert(depts)
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
    const { data: result, error } = await (await createServerClient()).rpc('crear_tarea_con_asignaciones', rpcParams)

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
      (await createServerClient()).from('supervisores_tareas').select('id_supervisor').eq('id_tarea', taskId).maybeSingle(),
      (await createServerClient()).from('trabajadores_tareas').select('id_trabajador').eq('id_tarea', taskId).maybeSingle(),
      (await createServerClient()).from('departamentos_tareas').select('id_departamento').eq('id_tarea', taskId)
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
      await (await createServerClient()).from("supervisores_tareas").insert({
        id_tarea: nuevaTarea.id,
        id_supervisor: parentSupervisorId
      })
    }

    if (parentTrabajadorId) {
      await (await createServerClient()).from("trabajadores_tareas").insert({
        id_tarea: nuevaTarea.id,
        id_trabajador: parentTrabajadorId
      })
    }

    if (deptosIds.length > 0) {
      const deptoRelations = deptosIds.map((idDep: number) => ({
        id_tarea: nuevaTarea.id,
        id_departamento: idDep
      }))
      await (await createServerClient()).from("departamentos_tareas").insert(deptoRelations)
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

    // Sanitización agresiva (El Escudo)
    if (!deptData || !deptData.codigo || !deptData.edificio_id) {
      throw new Error("datos del departamento incompletos")
    }

    const cleanCodigo = deptData.codigo.trim().replace(/\s+/g, ' ').toUpperCase();

    // 1. Obtener nombre del edificio para slugs de contactos
    const { data: edData } = await supabaseAdmin
      .from("edificios")
      .select("nombre")
      .eq("id", deptData.edificio_id)
      .single()

    const edName = edData?.nombre || "Edificio"

    // 2. Insertar Departamento
    const { data: newDept, error: deptError } = await supabaseAdmin
      .from("departamentos")
      .insert({
        edificio_id: deptData.edificio_id,
        codigo: cleanCodigo,
        propietario: deptData.propietario ? sanitizeText(deptData.propietario) : null,
        notas: deptData.notas ? sanitizeText(deptData.notas) : null
      })
      .select()
      .single()

    if (deptError) {
      if (deptError.code === '23505') throw new Error(`Ya existe un departamento con el código "${cleanCodigo}"`)
      throw new Error(deptError.message)
    }

    // 3. Insertar Contactos (si hay)
    if (contactosData && contactosData.length > 0) {
      const normalizeForSlug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ñ/g, 'n').replace(/\s+/g, '-')

      const contactosPayload = await Promise.all(contactosData.map(async (c: any, index: number) => {
        const nombreSanitized = sanitizeText(c.nombre)
        const relacionSanitized = sanitizeText(c.relacion) || "Otro"

        // Generación de Slug (Backend side)
        const slugBase = `${normalizeForSlug(edName)}-${normalizeForSlug(newDept.codigo)}-${normalizeForSlug(nombreSanitized)}`

        // Verificar duplicado de slug de forma básica (pueden haber colisiones en lote si son nombres idénticos)
        let finalSlug = slugBase
        if (index > 0) {
          finalSlug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`
        }

        return {
          nombre: finalSlug,
          nombreReal: nombreSanitized,
          telefono: c.sin_telefono ? null : (c.numero || '').replace(/\D/g, ''),
          id_padre: deptData.edificio_id,
          tipo_padre: 'edificio',
          departamento: newDept.codigo,
          departamento_id: newDept.id,
          relacion: relacionSanitized,
          es_principal: index === 0,
          updated_at: new Date().toISOString()
        }
      }))

      const { error: contactsError } = await (await createServerClient()).from("contactos").insert(contactosPayload)
      if (contactsError) console.error("Error inserting contacts in server action:", contactsError)
    }

    revalidatePath('/dashboard/tareas')
    return { success: true, data: newDept, error: null }

  } catch (error: any) {
    console.error("create dept action error:", error)
    return { success: false, data: null, error: { message: error.message } }
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

    await (await createServerClient()).from("comentarios").insert({
      contenido: `${huboTrabajo ? "tarea finalizada" : "tarea cerrada sin trabajo"}\n\nresumen: ${resumen.trim()}`,
      id_tarea: taskId,
      id_usuario: userId,
    })

    if (notasDepartamentos && Object.keys(notasDepartamentos).length > 0) {
      await Promise.all(Object.entries(notasDepartamentos as Record<string, string>).map(async ([depId, nota]) => {
        if (!nota || !nota.trim()) return
        const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const nuevaNota = `[${fecha}] ${nota.trim()}`
        const { data: current } = await (await createServerClient()).from("departamentos").select("notas").eq("id", depId).single()
        const notasActualizadas = current?.notas ? `${current.notas}\n\n${nuevaNota}` : nuevaNota
        await (await createServerClient()).from("departamentos").update({ notas: notasActualizadas }).eq("id", depId)
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
    const { error } = await (await createServerClient()).from("comentarios").insert({
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
    const { data: rpcResult, error: rpcError } = await (await createServerClient()).rpc('actualizar_fecha_tarea', {
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
    await (await createServerClient()).from('edificios').update({ notas: notes }).eq('id', buildingId);
    revalidatePath('/dashboard/tareas');
    return { success: true };
  } catch (e: any) { return { success: false, message: e.message } }
}
export async function updateSupervisorAction(taskId: number, supervisorEmail: string | null) {
  try {
    await validateSessionAndGetUser();
    await (await createServerClient()).from('supervisores_tareas').delete().eq('id_tarea', taskId);
    if (supervisorEmail) {
      const { data: user } = await (await createServerClient()).from('usuarios').select('id').eq('email', supervisorEmail).single();
      if (user) await (await createServerClient()).from('supervisores_tareas').insert({ id_tarea: taskId, id_supervisor: user.id });
    }
    revalidatePath(`/dashboard/tareas/${taskId}`);
    return { success: true };
  } catch (e: any) { return { success: false, message: e.message } }
}
export async function assignWorkerAction(taskId: number, workerId: string) {
  try {
    await validateSessionAndGetUser();
    await (await createServerClient()).from("trabajadores_tareas").insert({ id_tarea: taskId, id_trabajador: workerId });
    revalidatePath(`/dashboard/tareas/${taskId}`);
    return { success: true };
  } catch (e: any) { return { success: false, message: e.message } }
}
export async function removeWorkerAction(taskId: number, workerId: string) {
  try {
    await validateSessionAndGetUser();
    await (await createServerClient()).from("trabajadores_tareas").delete().eq("id_tarea", taskId).eq("id_trabajador", workerId);
    revalidatePath(`/dashboard/tareas/${taskId}`);
    return { success: true };
  } catch (e: any) { return { success: false, message: e.message } }
}
export async function getDepartamentosAction(edificioId?: number) {
  try {
    await validateSessionAndGetUser();
    let q = (await createServerClient()).from('departamentos').select('id, codigo, edificio_id, propietario');
    if (edificioId) q = q.eq('edificio_id', edificioId);
    const { data, error } = await q.order('codigo');
    if (error) throw error;
    return { success: true, data };
  } catch (e: any) { return { success: false, message: e.message, data: [] } }
}
export async function getEdificiosAction(adminId?: number) {
  try {
    await validateSessionAndGetUser();
    let q = (await createServerClient()).from('edificios').select('id, nombre, direccion');
    if (adminId) q = q.eq('id_administrador', adminId);
    const { data, error } = await q.order('nombre');
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
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from(tabla)
      .update({
        aprobado: true,
        rechazado: false,
        fecha_aprobacion: now,
        updated_at: now
      })
      .eq('id', id)

    if (error) throw error

    // logica para generar facturas si es presupuesto final
    if (tipo === 'final') {
      console.log(`[APPROVE] PF ${id} aprobado. Iniciando conversión a facturas...`)
      const { convertirPresupuestoADosFacturas } = await import("@/app/dashboard/presupuestos-finales/actions-factura")

      try {
        const result = await convertirPresupuestoADosFacturas(id)
        console.log(`[APPROVE] Resultado conversión PF ${id}:`, result)

        if (!result || result.success === false) {
          const errMsg = result?.message || "Error desconocido en conversión"
          console.error(`[APPROVE] Conversión fallida para PF ${id}: ${errMsg}. Realizando ROLLBACK...`)

          // ROLLBACK approval if invoice creation fails to maintain consistency
          await supabaseAdmin
            .from(tabla)
            .update({ aprobado: false })
            .eq('id', id)

          return { success: false, message: `Facturación fallida: ${errMsg}` }
        }

        console.log(`[APPROVE] PF ${id} facturado exitosamente.`)
      } catch (convError: any) {
        console.error(`[APPROVE] Excepción crítica durante conversión de PF ${id}:`, convError)
        // Rollback safety
        await (await createServerClient()).from(tabla).update({ aprobado: false }).eq('id', id)
        throw convError // Rethrow to main catch
      }
    }

    revalidatePath(`/dashboard/tareas/${taskId}`)
    return { success: true }
  } catch (error: any) {
    console.error("aprobar presupuesto action error fatal:", error)
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

// =================================================================================
// BRIDGE PROTOCOL: PRESUPUESTOS FINALES (SOLO ADMIN)
// =================================================================================

/**
 * Obtener datos de tarea para inicializar Presupuesto Final.
 * SEGURIDAD: Estrictamente solo para ADMIN.
 * Bypassea RLS usando supabaseAdmin para evitar errores 406/401 en el cliente.
 */
export async function getTaskForFinalBudgetAction(taskId: number) {
  try {
    // 1. Validación de Identidad
    const user = await validateSessionAndGetUser()

    // 2. Validación de Rol (Blindaje)
    if (user.rol !== 'admin') {
      return { success: false, message: 'Acceso denegado: Solo administradores pueden gestionar presupuestos finales.' }
    }

    // 3. Consulta Segura (Bridge)
    const { data, error } = await supabaseAdmin
      .from('vista_tareas_completa')
      .select('*')
      .eq('id', taskId)
      .single()

    if (error) throw error

    return { success: true, data }

  } catch (error: any) {
    console.error("Error en Bridge (getTaskForFinalBudgetAction):", error)
    return { success: false, message: "No se pudieron cargar los datos de la tarea." }
  }
}

/**
 * Obtener presupuesto base por ID (Bridge Protocol)
 * SEGURIDAD: EXCLUSIVO ADMIN / SUPERVISOR asignado.
 */
export async function getPresupuestoBaseByIdAction(id: number) {
  try {
    const user = await validateSessionAndGetUser()

    // Consulta con Supabase Admin (Bypass RLS)
    const { data: presupuesto, error } = await supabaseAdmin
      .from("vista_presupuestos_base_completa")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error

    // Validación de Rol/Autorización
    if (user.rol === 'admin') {
      return { success: true, data: presupuesto }
    }

    if (user.rol === 'supervisor' && presupuesto.id_supervisor === user.id) {
      return { success: true, data: presupuesto }
    }

    return { success: false, message: 'Acceso denegado.' }

  } catch (error: any) {
    console.error("Error en Bridge (getPresupuestoBaseByIdAction):", error)
    return { success: false, message: "No se pudo cargar el presupuesto base." }
  }
}

/**
 * Obtener lista de tareas filtradas para presupuestos (Bridge Protocol)
 * SEGURIDAD: Admin ve todas, Supervisor solo sus asignadas.
 */
export async function getTasksForBudgetAction(idTareaLabel?: string) {
  try {
    const user = await validateSessionAndGetUser()

    let query = supabaseAdmin
      .from("vista_tareas_completa")
      .select("id, code, titulo, id_edificio, id_administrador, edificios(id, nombre, id_administrador)")
      .in("estado", ["pendiente", "asignada"])
      .order("created_at", { ascending: false })

    if (idTareaLabel) {
      query = supabaseAdmin
        .from("vista_tareas_completa")
        .select("id, code, titulo, id_edificio, id_administrador, edificios(id, nombre, id_administrador)")
        .eq("id", idTareaLabel)
    }

    // Filtrado por Rol
    if (user.rol === 'supervisor') {
      // Nota: Si la vista no tiene id_supervisor directo, necesitamos filtrar vía inner join o similar.
      // vista_tareas_completa según definición previa tiene supervisores_emails, pero no id_supervisor.
      // Vamos a filtrar sobre la tabla 'tareas' con join si es necesario, 
      // pero por ahora usemos la columna id_supervisor si existe en la vista.
      // Re-revisando definición de vista_tareas_completa en logs previos... NO tiene id_supervisor.
      // Pero 'tareas' sí.
      query = supabaseAdmin
        .from("tareas")
        .select("id, code, titulo, id_edificio, id_administrador, edificios(id, nombre, id_administrador)")
        .eq("id_supervisor", user.id) // Asumiendo que la tabla tareas tiene id_supervisor
        .in("id_estado_nuevo", [1, 2]) // Pendiente/Preguntar (Ajustar segun sea necesario)
    } else if (user.rol !== 'admin') {
      return { success: false, message: 'No autorizado.' }
    }

    const { data: tareas, error } = await query

    if (error) throw error

    return { success: true, data: tareas }

  } catch (error: any) {
    console.error("Error en Bridge (getTasksForBudgetAction):", error)
    return { success: false, message: "No se pudieron cargar las tareas." }
  }
}

/**
 * Guardar Presupuesto (Bridge Protocol)
 * Maneja creación y actualización de presupuestos base y finales.
 */
export async function saveBudgetAction(params: {
  tipo: "base" | "final";
  budgetData: any;
  items: any[];
  isEditing: boolean;
  budgetId?: number;
}) {
  try {
    const user = await validateSessionAndGetUser();
    const { tipo, budgetData, items, isEditing, budgetId } = params;

    // 1. Validación de Seguridad
    if (user.rol !== 'admin' && user.rol !== 'supervisor') {
      return { success: false, message: 'No tienes permisos para realizar esta acción.' };
    }

    if (tipo === 'final' && user.rol !== 'admin') {
      return { success: false, message: 'Solo los administradores pueden gestionar presupuestos finales.' };
    }

    // Asegurar campos obligatorios (Constraint Audit v93.3.4)
    if (tipo === 'final') {
      budgetData.ajuste_admin = budgetData.ajuste_admin ?? 0;
      budgetData.total_base = budgetData.total_base ?? 0;
      budgetData.materiales = budgetData.materiales ?? 0;
      budgetData.mano_obra = budgetData.mano_obra ?? 0;
      budgetData.total = budgetData.total ?? 0;
    } else if (tipo === 'base') {
      // Remover total ya que es una columna GENERATED ALWAYS en presupuestos_base
      delete budgetData.total;
    }

    // Set approval date if marked as approved
    if (budgetData.aprobado) {
      budgetData.fecha_aprobacion = new Date().toISOString();
    } else {
      budgetData.fecha_aprobacion = null;
    }

    let savedBudget: any;

    if (isEditing && budgetId) {
      // --- Lógica de Edición ---
      const table = tipo === "base" ? "presupuestos_base" : "presupuestos_finales";

      const { data, error } = await supabaseAdmin
        .from(table)
        .update(budgetData)
        .eq("id", budgetId)
        .select()
        .single();

      if (error) throw error;
      savedBudget = data;

      // Sincronización de ítems
      const { data: existingItems } = await supabaseAdmin
        .from("items")
        .select("id")
        .eq("id_presupuesto", budgetId);

      const existingIds = existingItems?.map(i => i.id) || [];
      const incomingIds = items.filter(i => i.id).map(i => i.id);

      const toDelete = existingIds.filter(id => !incomingIds.includes(id));
      if (toDelete.length > 0) {
        await (await createServerClient()).from("items").delete().in("id", toDelete);
      }

      for (const item of items) {
        // Sanitizar: solo columnas válidas de la tabla 'items'
        const itemPayload: any = {
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio: typeof item.precio === 'string' ? parseFloat(item.precio) : item.precio,
          id_presupuesto: budgetId,
          producto_id: item.producto_id || null,
          es_material: item.es_material ?? (item.es_producto ? false : false),
        };
        if (item.code) itemPayload.code = item.code;

        if (item.id) {
          await (await createServerClient()).from("items").update(itemPayload).eq("id", item.id);
        } else {
          await (await createServerClient()).from("items").insert(itemPayload);
        }
      }

    } else {
      // --- Lógica de Creación ---
      const table = tipo === "base" ? "presupuestos_base" : "presupuestos_finales";

      const { data, error } = await supabaseAdmin
        .from(table)
        .insert(budgetData)
        .select()
        .single();

      if (error) throw error;
      savedBudget = data;

      // Sanitizar: solo columnas válidas de la tabla 'items'
      const itemsPayload = items.map(item => ({
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio: typeof item.precio === 'string' ? parseFloat(item.precio) : item.precio,
        id_presupuesto: savedBudget.id,
        producto_id: item.producto_id || null,
        es_material: item.es_material ?? (item.es_producto ? false : false),
        ...(item.code ? { code: item.code } : {}),
      }));

      const { error: itemsError } = await (await createServerClient()).from("items").insert(itemsPayload);
      if (itemsError) throw itemsError;
    }


    // 3. Post-Procesamiento: Auto-Aprobación de PB (Regla de Negocio v116)
    if (tipo === "final" && savedBudget.id_presupuesto_base) {
      try {
        const { error: pbError } = await supabaseAdmin
          .from("presupuestos_base")
          .update({
            aprobado: true,
            fecha_aprobacion: new Date().toISOString()
          })
          .eq("id", savedBudget.id_presupuesto_base);

        if (pbError) console.error("Error auto-aprobando presupuesto base padre:", pbError);
      } catch (e) {
        console.error("Excepción al auto-aprobar PB:", e);
      }
    }
    // 4. Post-Procesamiento: Aprobación -> Facturas
    if (tipo === "final" && savedBudget.aprobado) {
      try {
        await convertirPresupuestoADosFacturas(savedBudget.id);
      } catch (e) {
        console.error("Error al disparar creación de facturas post-save:", e);
      }
    }

    revalidatePath(`/dashboard/presupuestos`);
    revalidatePath(`/dashboard/presupuestos-finales`);
    if (savedBudget.id_tarea) {
      revalidatePath(`/dashboard/tareas/${savedBudget.id_tarea}`);
    }

    return { success: true, data: savedBudget };

  } catch (error: any) {
    console.error("Error en Bridge (saveBudgetAction):", error);
    return { success: false, message: error.message || "Error al procesar el presupuesto." };
  }
}

// =================================================================================
// BRIDGE PROTOCOL: DATOS ESTÁTICOS Y CLONADO (MOBILE OPTIMIZED)
// =================================================================================

/**
 * Obtiene listas desplegables (Admins, Edificios) sin bloqueo RLS.
 * Inyecta datos limpios al formulario.
 */
export async function getBudgetStaticDataAction() {
  try {
    const user = await validateSessionAndGetUser()
    // Permitimos acceso a admin y supervisor
    if (!['admin', 'supervisor'].includes(user.rol)) return { success: false, data: null }

    // Consultas en paralelo para máxima velocidad
    const [admins, edificios, productosRes] = await Promise.all([
      (await createServerClient()).from('administradores').select('id, nombre').order('nombre'),
      (await createServerClient()).from('edificios').select('id, nombre, direccion').order('nombre'),
      (await createServerClient()).from('productos').select('*, categorias_productos(id, nombre)').order('nombre')
    ])

    return {
      success: true,
      data: {
        administradores: admins.data || [],
        edificios: edificios.data || [],
        productos: productosRes.data || []
      }
    }
  } catch (error: any) {
    console.error("Error fetching static data:", error)
    return { success: false, data: null }
  }
}

/**
 * Obtiene un Presupuesto Base COMPLETO (con items) para clonar.
 * Clave para que la lista de items no llegue vacía.
 */
export async function getPresupuestoBaseForCloneAction(id: number) {
  try {
    await validateSessionAndGetUser()

    // Traemos el presupuesto primero
    const { data: baseData, error: baseError } = await supabaseAdmin
      .from('presupuestos_base')
      .select('*')
      .eq('id', id)
      .single()

    if (baseError) throw baseError

    // Traemos los items manualmente ya que no hay FK directa en la DB para queries anidadas
    const { data: itemsData, error: itemsError } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('id_presupuesto', id)

    if (itemsError) throw itemsError

    // Unimos los datos
    const data = {
      ...baseData,
      items: itemsData || []
    }

    // Mapeo consistente de items_presupuesto a items si es necesario
    const formattedData = {
      ...data,
      items: data.items || []
    }

    return { success: true, data: formattedData }
  } catch (error: any) {
    console.error("Error en getPresupuestoBaseForCloneAction:", error)
    return { success: false, message: error.message }
  }
}
