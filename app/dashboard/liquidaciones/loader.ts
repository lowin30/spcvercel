import { supabaseAdmin } from "@/lib/supabase-admin"

export interface LiquidacionDTO {
    id: number
    created_at: string
    titulo_tarea: string
    total_base?: number
    gastos_reales: number
    ganancia_neta?: number
    ganancia_supervisor?: number
    ganancia_admin?: number
    total_supervisor?: number
    pagada: boolean
    fecha_pago?: string | null
    email_supervisor?: string
    email_admin?: string
    code_factura?: string
}

export async function getLiquidaciones(userId: string, role: string): Promise<LiquidacionDTO[]> {
    // 1. Admin: Ve todo
    // 1. Admin: Ve todo (Query directa a tabla autorizada para traer campos faltantes 'pagada', etc)
    if (role === 'admin') {
        const { data, error } = await supabaseAdmin
            .from('liquidaciones_nuevas')
            .select(`
                id,
                created_at,
                ganancia_neta,
                ganancia_supervisor,
                ganancia_admin,
                titulo_tarea,
                total_base,
                code_factura,
                pagada,
                fecha_pago,
                gastos_reales,
                total_supervisor,
                supervisor:usuarios!liquidaciones_nuevas_id_usuario_supervisor_fkey(email),
                admin:usuarios!liquidaciones_nuevas_id_usuario_admin_fkey(email),
                tarea:tareas!liquidaciones_nuevas_id_tarea_fkey(titulo)
            `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error("Error fetching liquidaciones (admin):", error)
            throw new Error("Error al cargar liquidaciones")
        }

        // Map to DTO
        return (data || []).map((row: any) => ({
            id: row.id,
            created_at: row.created_at,
            titulo_tarea: row.tarea?.titulo || 'Sin Título',
            total_base: row.total_base,
            gastos_reales: row.gastos_reales,
            ganancia_neta: row.ganancia_neta,
            ganancia_supervisor: row.ganancia_supervisor,
            ganancia_admin: row.ganancia_admin,
            total_supervisor: row.total_supervisor,
            pagada: row.pagada,
            fecha_pago: row.fecha_pago,
            code_factura: row.code_factura,
            email_supervisor: row.supervisor?.email,
            email_admin: row.admin?.email
        }))
    }

    // 2. Supervisor: Ve SOLO sus liquidaciones y SIN márgenes internos
    if (role === 'supervisor') {
        // Usamos la tabla base o vista filtrada manualmente por ID para máxima seguridad
        const { data, error } = await supabaseAdmin
            .from('liquidaciones_nuevas')
            .select(`
        id,
        created_at,
        titulo_tarea:tareas(titulo),
        total_base,
        gastos_reales,
        ganancia_supervisor,
        total_supervisor,
        pagada,
        fecha_pago,
        usuarios!liquidaciones_nuevas_id_usuario_supervisor_fkey(email)
      `)
            .eq('id_usuario_supervisor', userId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error("Error fetching liquidaciones (supervisor):", error)
            throw new Error("Error al cargar sus liquidaciones")
        }

        // DTO Sanitization: Map database result to safe public DTO
        // Omitimos explicitamente: ganancia_neta, ganancia_admin, sobrecosto, ajuste_admin
        return (data || []).map((row: any) => ({
            id: row.id,
            created_at: row.created_at,
            titulo_tarea: row.titulo_tarea?.titulo || 'Sin Título',
            total_base: row.total_base,
            gastos_reales: row.gastos_reales,
            ganancia_supervisor: row.ganancia_supervisor,
            total_supervisor: row.total_supervisor,
            pagada: row.pagada,
            fecha_pago: row.fecha_pago,
            email_supervisor: row.usuarios?.email
        }))
    }

    // 3. Trabajadores y otros: Bloqueo total (aunque el Page debería haberlos redirigido)
    return []
}

export async function getSupervisores() {
    const { data, error } = await supabaseAdmin
        .from('usuarios')
        .select('id, email')
        .eq('rol', 'supervisor')
        .order('email')

    if (error) {
        console.error("Error fetching supervisores:", error)
        return []
    }
    return data
}
