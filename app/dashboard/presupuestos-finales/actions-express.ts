'use server'

import { createServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'

export async function createExpressProjectAction(formData: {
    id_administrador: string
    id_edificio: string
    id_departamento?: string
    titulo: string
    id_supervisor?: string
}) {
    const supabase = await createServerClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("No autenticado")

        // 1. Crear Tarea (Express)
        // Eliminado taskCode manual ya que es GENERATED ALWAYS en la DB
        const { data: task, error: taskError } = await supabase
            .from('tareas')
            .insert({
                titulo: formData.titulo,
                descripcion: `Proyecto Express creado para ${formData.titulo}`,
                id_edificio: parseInt(formData.id_edificio),
                id_estado_nuevo: 1, // Pendiente
                finalizada: false,
                id_administrador: parseInt(formData.id_administrador)
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

        // 4. Crear Presupuesto Base (Auto-Aprobado para saltar al Final)
        // Formato oficial: PB-XXXXXX-XXX
        const pbCode = `PB-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`

        const { data: pb, error: pbError } = await supabase
            .from('presupuestos_base')
            .insert({
                code: pbCode,
                id_tarea: task.id,
                total: 0,
                aprobado: true,
                id_edificio: parseInt(formData.id_edificio),
                id_administrador: parseInt(formData.id_administrador)
            })
            .select('id')
            .single()

        if (pbError) throw pbError

        revalidatePath('/dashboard/presupuestos-finales')

        return {
            success: true,
            taskId: task.id,
            pbId: pb.id
        }

    } catch (error: any) {
        console.error("Error in createExpressProjectAction:", error)
        return { success: false, message: error.message }
    }
}
