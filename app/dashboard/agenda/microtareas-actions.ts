"use server"

/**
 * SPC: Server Actions para Microtareas Operativas [v85.0]
 * manejo de captura rapida, edicion inline y promocion a tarea
 */

import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"

interface MicroTareaData {
    id?: number
    titulo: string
    descripcion?: string
    comentario?: string
    id_edificio?: number | null
    id_departamento?: number | null
    id_asignado?: string | null
    prioridad?: string
    id_tarea_padre?: number | null
    realizada?: boolean
}

/**
 * guardar o actualizar una microtarea
 */
export async function saveMicroTareaAction(data: MicroTareaData) {
    try {
        const user = await validateSessionAndGetUser()
        if (!user) throw new Error("no autorizado")

        const { id, ...payload } = data

        // AUTO-ASIGNACIÓN: si no hay asignado, jesus (current user) toma la soberanía
        const finalData = {
            ...payload,
            id_asignado: payload.id_asignado || user.id,
            id_edificio: payload.id_edificio || null
        }

        if (id) {
            // update
            const { error } = await supabaseAdmin
                .from('micro_tareas_operativas')
                .update({
                    ...finalData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error
        } else {
            // insert
            const { error } = await supabaseAdmin
                .from('micro_tareas_operativas')
                .insert([{
                    ...finalData
                }])

            if (error) throw error
        }

        revalidatePath('/dashboard/agenda')
        return { success: true }

    } catch (e: any) {
        console.error("[ACTIONS-MT] error en saveMicroTareaAction:", e.message)
        return { success: false, message: e.message }
    }
}

/**
 * promocionar una microtarea a tarea formal
 */
export async function promocionarMicroTareaAction(id: number) {
    try {
        const user = await validateSessionAndGetUser()
        if (!user) throw new Error("no autorizado")

        // 1. Obtener datos de la microtarea
        const { data: mt, error: mtError } = await supabaseAdmin
            .from('micro_tareas_operativas')
            .select('*')
            .eq('id', id)
            .single()

        if (mtError || !mt) throw new Error("no se encontro la microtarea")
        if (mt.promocionada) throw new Error("esta microtarea ya fue promocionada")

        // 2. Crear la tarea formal
        // Buscamos un codigo nuevo (esto podria requerir mas logica, pero usamos un fallback)
        const timestamp = Date.now().toString().slice(-4)
        const newCode = `T-${timestamp}`

        const { data: tarea, error: tareaError } = await supabaseAdmin
            .from('tareas')
            .insert([{
                titulo: mt.titulo,
                descripcion: mt.descripcion || mt.comentario || 'promocionada desde microtarea',
                id_edificio: mt.id_edificio,
                id_estado_nuevo: 1, // Pendiente
                prioridad: mt.prioridad || 'media',
                code: newCode,
                id_administrador: user.id // El que promociona queda como admin responsable? O el del edificio?
            }])
            .select()
            .single()

        if (tareaError) throw tareaError

        // 3. Vincular departamento si existe
        if (mt.id_departamento) {
            await supabaseAdmin
                .from('departamentos_tareas')
                .insert([{
                    id_tarea: tarea.id,
                    id_departamento: mt.id_departamento
                }])
        }

        // 4. Vincular asignado si existe
        if (mt.id_asignado) {
            await supabaseAdmin
                .from('trabajadores_tareas')
                .insert([{
                    id_tarea: tarea.id,
                    id_trabajador: mt.id_asignado
                }])
        }

        // 5. Marcar microtarea como promocionada y vincular id de tarea resultante
        await supabaseAdmin
            .from('micro_tareas_operativas')
            .update({ 
                promocionada: true,
                id_tarea_padre: tarea.id // O podria ser una relacion de 'evolucion'
            })
            .eq('id', id)

        revalidatePath('/dashboard/agenda')
        revalidatePath(`/dashboard/tareas/${tarea.id}`)
        
    } catch (e: any) {
        console.error("[ACTIONS-MT] error en promocionarMicroTareaAction:", e.message)
        return { success: false, message: e.message }
    }
}

/**
 * obtener tareas vinculables para un usuario saltando RLS (God Mode)
 */
export async function getTareasVinculablesAction(userId: string) {
    try {
        console.log("[SERVER-LINKER] Iniciando para userId:", userId)
        const user = await validateSessionAndGetUser()
        if (!user) throw new Error("no autorizado")

        // 1. Obtener IDs de donde el usuario es trabajador o supervisor
        const [workerRes, supervisorRes] = await Promise.all([
            supabaseAdmin.from('trabajadores_tareas').select('id_tarea').eq('id_trabajador', userId),
            supabaseAdmin.from('supervisores_tareas').select('id_tarea').eq('id_supervisor', userId)
        ])

        const workerTaskIds = workerRes.data?.map(r => r.id_tarea) || []
        const supervisorTaskIds = supervisorRes.data?.map(r => r.id_tarea) || []
        const allTaskIds = Array.from(new Set([...workerTaskIds, ...supervisorTaskIds]))

        console.log(`[SERVER-LINKER] Asignaciones encontradas: ${workerTaskIds.length} (W), ${supervisorTaskIds.length} (S). Total unificados: ${allTaskIds.length}`)

        if (allTaskIds.length === 0) {
            console.log("[SERVER-LINKER] No hay asignaciones para este usuario.")
            return { success: true, data: [] }
        }

        // 2. Obtener las tareas activas correspondientes usando supabaseAdmin (BYPASS RLS)
        const { data, error } = await supabaseAdmin
            .from('tareas')
            .select('id, titulo, code, finalizada')
            .eq('finalizada', false)
            .in('id', allTaskIds)
            .order('created_at', { ascending: false })

        if (error) {
            console.error("[SERVER-LINKER] Error en query tareas:", error.message)
            throw error
        }

        console.log(`[SERVER-LINKER] Tareas activas finales retornadas: ${data?.length || 0}`)
        if (data && data.length > 0) {
            data.forEach(t => console.log(`  - [${t.id}] ${t.titulo} (F: ${t.finalizada})`))
        }

        return { success: true, data: data || [] }

    } catch (e: any) {
        console.error("[ACTIONS-MT] error en getTareasVinculablesAction:", e.message)
        return { success: false, message: e.message }
    }
}

/**
 * finalización rápida de una microtarea
 */
export async function finalizarMicroTareaAction(id: number) {
    try {
        const user = await validateSessionAndGetUser()
        if (!user) throw new Error("no autorizado")

        const { error } = await supabaseAdmin
            .from('micro_tareas_operativas')
            .update({ 
                realizada: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error

        revalidatePath('/dashboard/agenda')
        return { success: true }
    } catch (e: any) {
        console.error("[ACTIONS-MT] error en finalizarMicroTareaAction:", e.message)
        return { success: false, message: e.message }
    }
}
