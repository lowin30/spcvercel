"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase-server"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"

export async function aprobarPresupuestoBase(id: number) {
  try {
    const user = await validateSessionAndGetUser()
    const { rol } = user
    const supabase = await createServerClient()

    if (rol !== 'admin' && rol !== 'supervisor') {
      return { success: false, error: "No autorizado" }
    }

    // Si es supervisor, verificar propiedad (doble check de seguridad)
    if (rol === 'supervisor') {
      const { data: pb } = await supabase
        .from('presupuestos_base')
        .select('tareas!inner(id_supervisor)')
        .eq('id', id)
        .single()

      const tareaSupId = (pb as any)?.tareas?.id_supervisor

      if (!pb || tareaSupId !== user.id) {
        return { success: false, error: "No autorizado para aprobar este presupuesto" }
      }
    }

    const { error } = await supabase
      .from('presupuestos_base')
      .update({ aprobado: true, fecha_aprobacion: new Date() })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/presupuestos-base')
    return { success: true }
  } catch (error: any) {
    console.error("Error approving presupuesto base:", error)
    return { success: false, error: error.message || "Error al aprobar presupuesto" }
  }
}

export async function anularAprobacionPresupuestoBase(id: number) {
  try {
    const user = await validateSessionAndGetUser()
    const { rol } = user
    const supabase = await createServerClient()

    if (rol !== 'admin') {
      return { success: false, error: "Solo administradores pueden anular la aprobación" }
    }

    const { error } = await supabase
      .from('presupuestos_base')
      .update({ aprobado: false, fecha_aprobacion: null })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/presupuestos-base')
    return { success: true }
  } catch (error: any) {
    console.error("Error anular approving presupuesto base:", error)
    return { success: false, error: error.message || "Error al anular aprobación" }
  }
}

export async function deletePresupuestoBase(id: number) {
  try {
    const user = await validateSessionAndGetUser()
    const { rol, id: userId } = user
    const supabase = await createServerClient()

    if (rol !== 'admin' && rol !== 'supervisor') {
      return { success: false, error: "No autorizado" }
    }

    // Si es supervisor, solo puede borrar si está en 'pendiente'
    if (rol === 'supervisor') {
      const { data: pb, error: fetchError } = await supabase
        .from('vista_pb_supervisor')
        .select('estado_operativo, id_supervisor')
        .eq('id', id)
        .single()

      if (fetchError || !pb) {
        return { success: false, error: "Presupuesto no encontrado o no autorizado" }
      }

      if (pb.id_supervisor !== userId) {
        return { success: false, error: "No tienes permiso para eliminar este presupuesto" }
      }

      if (pb.estado_operativo !== 'pendiente') {
        return { success: false, error: `No se puede eliminar un presupuesto en estado ${pb.estado_operativo}` }
      }
    }

    const { error } = await supabase
      .from('presupuestos_base')
      .delete()
      .eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/presupuestos-base')
    return { success: true }
  } catch (error: any) {
    console.error("Error deleting presupuesto base:", error)
    return { success: false, error: error.message || "Error al eliminar presupuesto" }
  }
}

export async function createPresupuestoBase(data: any) {
  try {
    const { rol } = await validateSessionAndGetUser()
    const supabase = await createServerClient()

    if (rol !== 'admin' && rol !== 'supervisor') {
      return { success: false, error: "No autorizado" }
    }

    // --- ENRIQUECIMIENTO PLATINUM ---
    // Si no vienen el edificio o el administrador, los heredamos de la tarea
    if (data.id_tarea && (!data.id_edificio || !data.id_administrador)) {
      const { data: taskData } = await supabase
        .from('tareas')
        .select('id_edificio, id_administrador')
        .eq('id', data.id_tarea)
        .single();

      if (taskData) {
        if (!data.id_edificio) data.id_edificio = taskData.id_edificio;
        if (!data.id_administrador) data.id_administrador = taskData.id_administrador;
      }
    }

    // Generar código si no viene
    if (!data.code) {
      const prefix = "PB"
      const timestamp = new Date().getTime().toString().slice(-6)
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      data.code = `${prefix}-${timestamp}-${random}`
    }

    // El total se calcula automáticamente en la base de datos (GENERATED ALWAYS)
    if ('total' in data) {
      delete (data as any).total;
    }

    const { data: insertedData, error } = await supabase
      .from('presupuestos_base')
      .insert(data)
      .select()

    if (error) throw error

    revalidatePath('/dashboard/presupuestos-base')
    revalidatePath(`/dashboard/tareas/${data.id_tarea}`)

    return { success: true, data: insertedData?.[0] }
  } catch (error: any) {
    console.error("Error creating presupuesto base:", error)
    return { success: false, error: error.message || "Error al crear presupuesto" }
  }
}

export async function updatePresupuestoBase(id: number, data: any) {
  try {
    const user = await validateSessionAndGetUser()
    const { rol, id: userId } = user
    const supabase = await createServerClient()

    if (rol !== 'admin' && rol !== 'supervisor') {
      return { success: false, error: "No autorizado" }
    }

    // Si es supervisor, solo puede editar si está en 'pendiente'
    if (rol === 'supervisor') {
      const { data: pb, error: fetchError } = await supabase
        .from('vista_pb_supervisor')
        .select('estado_operativo, id_supervisor')
        .eq('id', id)
        .single()

      if (fetchError || !pb) {
        return { success: false, error: "Presupuesto no encontrado o no autorizado" }
      }

      if (pb.id_supervisor !== userId) {
        return { success: false, error: "No tienes permiso para editar este presupuesto" }
      }

      if (pb.estado_operativo !== 'pendiente') {
        return { success: false, error: `No se puede editar un presupuesto en estado ${pb.estado_operativo}` }
      }
    }

    // --- LOGICA MODO DIOS PLATINUM ---
    // Recálculo imperativo del total para asegurar integridad de flujos financieros
    const materiales = Number(data.materiales) || 0;
    const manoObra = Number(data.mano_obra) || 0;
    const totalActualizado = materiales + manoObra;

    // LOGICA PLATINUM: Delegación de integridad a Postgres
    const dataFinal = {
      ...data,
      materiales,
      mano_obra: manoObra,
      updated_at: new Date()
    };

    // Removemos 'total' si existe en 'data' para evitar error de columna generada
    if ('total' in dataFinal) {
      delete (dataFinal as any).total;
    }

    // Actualización con verificación de impacto real (Maybe Single para evitar crash)
    const { data: updatedRow, error } = await supabase
      .from('presupuestos_base')
      .update(dataFinal)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      console.error("[updatePresupuestoBase] Error de persistencia:", error);
      return { success: false, error: `Error de base de datos: ${error.message}` };
    }

    if (!updatedRow) {
      console.error("[updatePresupuestoBase] No se afectaron filas. Posible RLS o ID inexistente.");
      return {
        success: false,
        error: "Falla de persistencia: El sistema rechazó el cambio. Esto puede ocurrir si el presupuesto ya fue bloqueado o si hay un conflicto de permisos."
      }
    }

    // Revalidación profunda de rutas relacionadas
    revalidatePath('/dashboard/presupuestos-base')
    if (data.id_tarea) {
      revalidatePath(`/dashboard/tareas/${data.id_tarea}`)
    }

    return { success: true, data: updatedRow }
  } catch (error: any) {
    console.error("Error updating presupuesto base:", error)
    return { success: false, error: error.message || "Error al actualizar presupuesto" }
  }
}


