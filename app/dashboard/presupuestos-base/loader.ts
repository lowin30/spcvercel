import { createClient } from "@supabase/supabase-js"

// Cliente Service Role para bypass de RLS (Manual RBAC)
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

export async function getPresupuestosBase(rol: string, userId: string) {
    // 1. Validacion de Seguridad (Manual RBAC)
    if (rol === 'trabajador') {
        return [] // Trabajadores no ven presupuestos
    }

    // 2. Query Base
    let query = supabaseAdmin
        .from('presupuestos_base')
        .select(`
            *,
            tareas!inner(
                id,
                titulo,
                code,
                id_edificio,
                id_usuario_asignado,
                id_supervisor
            )
        `)
        .order('created_at', { ascending: false })

    // 3. Filtrado por Rol
    if (rol === 'supervisor') {
        // Supervisor solo ve presupuestos de tareas donde es supervisor
        query = query.eq('tareas.id_supervisor', userId)
    }

    // Admin ve todo (no se aplica filtro extra)

    const { data, error } = await query

    if (error) {
        console.error("Error fetching presupuestos base:", error)
        throw new Error("Error al cargar presupuestos base")
    }

    return data || []
}

export async function getPresupuestoBaseById(id: string, rol: string, userId: string) {
    if (rol === 'trabajador') return null

    const { data, error } = await supabaseAdmin
        .from('presupuestos_base')
        .select(`
            *,
            tareas!inner(
                id,
                titulo,
                code,
                id_edificio,
                id_usuario_asignado,
                id_supervisor
            )
        `)
        .eq('id', id)
        .single()

    if (error || !data) return null

    // Validacion Post-Query para Supervisor
    if (rol === 'supervisor') {
        if (data.tareas.id_supervisor !== userId) {
            return null // Acceso denegado
        }
    }

    return data
}
