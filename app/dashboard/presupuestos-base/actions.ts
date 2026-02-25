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

    const { data: insertedData, error } = await supabase
      .from('presupuestos_base')
      .insert(data)
      .select()

    if (error) throw error

    revalidatePath('/dashboard/presupuestos-base')
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

    const { error } = await supabase
      .from('presupuestos_base')
      .update(data)
      .eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/presupuestos-base')
    return { success: true }
  } catch (error: any) {
    console.error("Error updating presupuesto base:", error)
    return { success: false, error: error.message || "Error al actualizar presupuesto" }
  }
}

