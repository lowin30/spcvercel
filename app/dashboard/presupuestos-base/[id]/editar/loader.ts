import { createServerClient } from '@/lib/supabase-server'

export async function getPresupuestoBaseEditData(id: string, userId: string, rol: string) {
    const supabase = await createServerClient()
    // 1. Cargar Presupuesto usando la vista correspondiente para obtener metadatos (estado_operativo)
    const viewName = rol === 'admin' ? 'vista_pb_admin' : 'vista_pb_supervisor'
    const { data: presupuesto } = await supabase
        .from(viewName)
        .select("*")
        .eq("id", id)
        .single()

    if (!presupuesto) return null

    // 2. Validación de Supervisor (Ownership)
    if (rol === "supervisor" && presupuesto.id_supervisor !== userId) {
        return null
    }

    // 3. Cargar Tareas Disponibles
    let tareas: any[] = []

    if (rol === "supervisor") {
        const { data: asignaciones } = await supabase
            .from('supervisores_tareas')
            .select('id_tarea')
            .eq('id_supervisor', userId)

        const idsTareas = asignaciones?.map((a: { id_tarea: number }) => a.id_tarea) || [];

        if (idsTareas.length > 0) {
            const { data } = await supabase
                .from('tareas')
                .select('*')
                .in('id', idsTareas)
            tareas = data || []
        }
    } else {
        // Admin ve todas
        const { data } = await supabase
            .from('tareas')
            .select('*')
        tareas = data || []
    }

    return { presupuesto, tareas }
}
