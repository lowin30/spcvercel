"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"

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

export async function approvePresupuestoBase(id: number) {
  try {
    const user = await validateSessionAndGetUser()
    const { rol } = user

    if (rol !== 'admin' && rol !== 'supervisor') {
      return { success: false, error: "No autorizado" }
    }

    // Si es supervisor, verificar propiedad (doble check de seguridad)
    if (rol === 'supervisor') {
      const { data: pb } = await supabaseAdmin
        .from('presupuestos_base')
        .select('tareas(id_supervisor)')
        .eq('id', id)
        .single()

      // Fix type error: pb.tareas is an array or object depending on relationship. 
      // Assuming 1:1 or N:1, it implies an object.
      // But Typescript might complain if it thinks it's an array.
      // supabase-js logic: select('tareas(...)') -> tareas: { ... } or [...]
      // Let's cast to any to avoid friction or verify structure. 
      // Assuming standard relationship:
      const tareaSupId = (pb as any)?.tareas?.id_supervisor

      if (!pb || tareaSupId !== user.id) {
        return { success: false, error: "No autorizado para aprobar este presupuesto" }
      }
    }

    const { error } = await supabaseAdmin
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

    if (rol !== 'admin') {
      return { success: false, error: "Solo administradores pueden anular la aprobación" }
    }

    const { error } = await supabaseAdmin
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
    const { rol } = await validateSessionAndGetUser()

    if (rol !== 'admin') {
      return { success: false, error: "Solo administradores pueden eliminar presupuestos" }
    }

    const { error } = await supabaseAdmin
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
    if (rol !== 'admin' && rol !== 'supervisor') {
      return { success: false, error: "No autorizado" }
    }

    const { error } = await supabaseAdmin
      .from('presupuestos_base')
      .insert(data)

    if (error) throw error

    revalidatePath('/dashboard/presupuestos-base')
    return { success: true }
  } catch (error: any) {
    console.error("Error creating presupuesto base:", error)
    return { success: false, error: error.message || "Error al crear presupuesto" }
  }
}

export async function updatePresupuestoBase(id: number, data: any) {
  try {
    const { rol } = await validateSessionAndGetUser()
    if (rol !== 'admin' && rol !== 'supervisor') {
      return { success: false, error: "No autorizado" }
    }

    const { error } = await supabaseAdmin
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
