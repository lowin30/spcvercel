"use server"

import { createServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function createExpressProjectPBAction(formData: {
    id_administrador: string
    id_edificio: string
    id_departamento?: string
    titulo: string
    descripcion: string
    id_supervisor?: string
    materiales: number
    mano_obra: number
    nota_pb: string
}) {
    const supabase = await createServerClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("No autenticado")

        // 1. Crear Tarea (Express)
        const { data: task, error: taskError } = await supabase
            .from('tareas')
            .insert({
                titulo: formData.titulo,
                descripcion: formData.descripcion,
                id_edificio: parseInt(formData.id_edificio),
                id_estado_nuevo: 1, // Pendiente / Organizar
                finalizada: false,
                id_administrador: parseInt(formData.id_administrador),
                id_creador: user.id
            })
            .select('id')
            .single()

        if (taskError) throw taskError

        // 2. Vincular Departamento (si existe)
        if (formData.id_departamento) {
            await supabase.from('departamentos_tareas').insert({
                id_tarea: task.id,
                id_departamento: parseInt(formData.id_departamento)
            })
        }

        // 3. Vincular Supervisor (si existe)
        if (formData.id_supervisor) {
            await supabase.from('supervisores_tareas').insert({
                id_tarea: task.id,
                id_supervisor: formData.id_supervisor
            })
        }

        // 4. Crear Presupuesto Base
        const pbCode = `PB-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`

        const { data: pb, error: pbError } = await supabase
            .from('presupuestos_base')
            .insert({
                code: pbCode,
                id_tarea: task.id,
                materiales: formData.materiales,
                mano_obra: formData.mano_obra,
                nota_pb: formData.nota_pb,
                total: formData.materiales + formData.mano_obra,
                aprobado: false, // El PB Express requiere aprobación para convertirse en Final
                id_edificio: parseInt(formData.id_edificio),
                id_administrador: parseInt(formData.id_administrador)
            })
            .select('id')
            .single()

        if (pbError) {
            // Rollback manual de la tarea en caso de fallo crítico en PB
            await supabase.from('tareas').delete().eq('id', task.id)
            throw pbError
        }

        revalidatePath('/dashboard/presupuestos-base')

        return {
            success: true,
            taskId: task.id,
            pbId: pb.id
        }

    } catch (error: any) {
        console.error("Error in createExpressProjectPBAction:", error)
        return { success: false, message: error.message }
    }
}

export async function getCatalogosPBExpress() {
    const supabase = await createServerClient()

    // Obtener catálogos necesarios para los selectores del Express
    const [adminsRes, supervisorsRes] = await Promise.all([
        supabase.from('administradores').select('id, nombre').order('nombre'),
        supabase.from('usuarios').select('id, email').eq('rol', 'supervisor').order('email')
    ]);

    return {
        success: true,
        data: {
            administradores: (adminsRes.data || []).map(a => ({ id: a.id.toString(), nombre: a.nombre })),
            supervisores: (supervisorsRes.data || []).map(s => ({ id: s.id, email: s.email }))
        }
    };
}

export async function getTareasSinPBAction() {
    const supabase = await createServerClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, data: [] }

        const { data: userData } = await supabase.from("usuarios").select("rol").eq("id", user.id).single()
        const rol = userData?.rol

        let query = supabase.from("tareas").select("id, titulo, code").eq('finalizada', false)

        if (rol === "supervisor") {
            const { data: tareasSupervisadas } = await supabase.from("supervisores_tareas").select("id_tarea").eq("id_supervisor", user.id);
            const tareasIds = tareasSupervisadas?.map(t => t.id_tarea) || [];
            if (tareasIds.length > 0) {
                query = query.in("id", tareasIds)
            } else {
                return { success: true, data: [] }
            }
        }

        const { data, error } = await query
        if (error) throw error

        // Filtrar tareas que ya tienen Presupuesto Base
        const { data: pbs } = await supabase.from('presupuestos_base').select('id_tarea')
        const pbTaskIds = new Set(pbs?.map(p => p.id_tarea) || [])

        const availableTasks = (data || []).filter(t => !pbTaskIds.has(t.id))

        return { success: true, data: availableTasks }
    } catch (e: any) {
        return { success: false, data: [] }
    }
}
