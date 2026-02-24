import { createServerClient } from '@/lib/supabase-server'

export async function getPresupuestoBaseEditData(id: string, userId: string, rol: string) {
    // 1. Cargar Presupuesto
    const { data: presupuesto } = await supabaseAdmin
        .from("presupuestos_base")
        .select("*")
        .eq("id", id)
        .single()

    if (!presupuesto) return null

    // 2. Validación de Supervisor (Ownership)
    // Si es supervisor y el presupuesto no es suyo, retornamos null o error
    // Nota: id_supervisor existe en la tabla presupuestos_base? Asumimos que sí por lógica anterior.
    if (rol === "supervisor" && presupuesto.id_supervisor !== userId) {
        // Retornamos null para manejar como 404 o Unauthorized en la pagina
        return null
    }

    // 3. Cargar Tareas Disponibles
    let tareas: any[] = []

    if (rol === "supervisor") {
        const { data: asignaciones } = await supabaseAdmin
            .from('supervisores_tareas')
            .select('id_tarea')
            .eq('id_supervisor', userId)

        const idsTareas = asignaciones?.map((a: { id_tarea: number }) => a.id_tarea) || [];

        if (idsTareas.length > 0) {
            const { data } = await supabaseAdmin
                .from('tareas')
                .select('*')
                .in('id', idsTareas)
            tareas = data || []
        }
    } else {
        // Admin ve todas
        const { data } = await supabaseAdmin
            .from('tareas')
            .select('*')
        tareas = data || []
    }

    return { presupuesto, tareas }
}
