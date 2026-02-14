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
    if (role === 'admin') {
        const { data: viewData, error } = await supabaseAdmin
            .from('vista_liquidaciones_completa')
            .select(`
                id,
                created_at,
                ganancia_neta,
                ganancia_supervisor,
                ganancia_admin,
                titulo_tarea,
                total_base,
                code_factura,
                gastos_reales,
                total_supervisor,
                email_supervisor,
                email_admin
            `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error("Error fetching liquidaciones (view):", error)
            throw new Error("Error al cargar liquidaciones")
        }

        const liquidaciones = viewData || []

        // Enriquecer datos faltantes en la vista (pagada, fecha_pago)
        // buscándolos en la tabla base 'liquidaciones_nuevas'
        if (liquidaciones.length > 0) {
            const ids = liquidaciones.map((l: any) => l.id)
            const { data: baseData } = await supabaseAdmin
                .from('liquidaciones_nuevas')
                .select('id, pagada, fecha_pago')
                .in('id', ids)

            // Map para acceso rápido
            const baseMap = new Map()
            baseData?.forEach((b: any) => baseMap.set(b.id, b))

            // Fusionar
            return liquidaciones.map((row: any) => {
                const extra = baseMap.get(row.id) || {}
                return {
                    id: row.id,
                    created_at: row.created_at,
                    titulo_tarea: row.titulo_tarea || 'Sin Título',
                    total_base: row.total_base,
                    gastos_reales: row.gastos_reales,
                    ganancia_neta: row.ganancia_neta || 0,
                    ganancia_supervisor: row.ganancia_supervisor || 0,
                    ganancia_admin: row.ganancia_admin || 0,
                    total_supervisor: row.total_supervisor || 0,
                    code_factura: row.code_factura,
                    email_supervisor: row.email_supervisor,
                    email_admin: row.email_admin,
                    // Campos enriquecidos
                    pagada: extra.pagada ?? false,
                    fecha_pago: extra.fecha_pago ?? null
                }
            })
        }

        return []
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
