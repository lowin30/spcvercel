import { createServerClient } from '@/lib/supabase-server'

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
    id_usuario_supervisor?: string
    detalle_gastos_json?: Array<{
        fecha: string
        descripcion: string
        monto: number
    }>
}

export interface CuentaCorrienteDTO {
    usuario_id: string
    email_supervisor: string
    total_adelantos_pendientes: number
    detalle_adelantos_json: Array<{
        id: string
        fecha: string
        monto: number
        descripcion: string
    }>
}

export async function getLiquidaciones(
    userId: string, 
    role: string, 
    filters?: { supervisor?: string; estado?: string }
): Promise<LiquidacionDTO[]> {
    const supabase = await createServerClient()

    // 1. Admin: Ve todo
    if (role === 'admin') {
        let query = supabase
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
                email_admin,
                id_usuario_supervisor,
                detalle_gastos_json
            `)
            .order('created_at', { ascending: false })

        // Filtros de Servidor (Platinum Architecture)
        if (filters?.supervisor && filters.supervisor !== '_todos_') {
            query = query.eq('email_supervisor', filters.supervisor)
        }

        const { data: viewData, error } = await query

        if (error) {
            console.error("Error fetching liquidaciones (view):", error)
            throw new Error("Error al cargar liquidaciones")
        }

        const liquidaciones = viewData || []

        if (liquidaciones.length > 0) {
            const ids = liquidaciones.map((l: any) => l.id)
            let baseQuery = supabase
                .from('liquidaciones_nuevas')
                .select('id, pagada, fecha_pago')
                .in('id', ids)
            
            if (filters?.estado === 'pagadas') {
                baseQuery = baseQuery.eq('pagada', true)
            } else if (filters?.estado === 'no_pagadas') {
                baseQuery = baseQuery.eq('pagada', false)
            }

            const { data: baseData } = await baseQuery

            // Map para acceso rápido
            const baseMap = new Map()
            baseData?.forEach((b: any) => baseMap.set(b.id, b))

            // Fusionar y filtrar por estado si es necesario
            const result = liquidaciones.map((row: any) => {
                const extra = baseMap.get(row.id)
                if (!extra && (filters?.estado === 'pagadas' || filters?.estado === 'no_pagadas')) return null
                
                return {
                    ...row,
                    pagada: extra?.pagada ?? false,
                    fecha_pago: extra?.fecha_pago ?? null
                }
            }).filter(Boolean) as LiquidacionDTO[]

            return result
        }

        return []
    }

    // 2. Supervisor: Ve SOLO sus liquidaciones
    if (role === 'supervisor') {
        let query = supabase
            .from('vista_liquidaciones_supervisores_listado')
            .select('*')
            .eq('id_usuario_supervisor', userId)
            .order('created_at', { ascending: false })

        if (filters?.estado === 'pagadas') {
            query = query.eq('pagada', true)
        } else if (filters?.estado === 'no_pagadas') {
            query = query.eq('pagada', false)
        }

        const { data, error } = await query

        if (error) {
            console.error("Error fetching liquidaciones (supervisor view):", error)
            throw new Error("Error al cargar sus liquidaciones")
        }

        return (data || []) as LiquidacionDTO[]
    }

    return []
}

export async function getCuentaCorriente(email?: string): Promise<CuentaCorrienteDTO | null> {
    const supabase = await createServerClient()
    let query = supabase
        .from('vista_cuenta_corriente_supervisores')
        .select('*')
    
    if (email && email !== '_todos_') {
        query = query.eq('email_supervisor', email)
    }

    const { data, error } = await query

    if (error) {
        console.error("Error fetching cuenta corriente:", error)
        return null
    }

    // Si pedimos uno especifico, devolvemos ese. Si es global, devolvemos los agregados (para el admin).
    if (email && email !== '_todos_') {
        return (data && data.length > 0) ? data[0] as CuentaCorrienteDTO : null
    }

    // Caso Admin: Suma de todos los supervisores visibles
    if (!data || data.length === 0) return null

    const total = data.reduce((acc, curr) => acc + (curr.total_adelantos_pendientes || 0), 0)
    const items = data.flatMap(curr => curr.detalle_adelantos_json || [])

    return {
        usuario_id: '_global_',
        email_supervisor: '_todos_',
        total_adelantos_pendientes: total,
        detalle_adelantos_json: items
    }
}

export async function getSupervisores() {
    const supabase = await createServerClient()
    const { data, error } = await supabase
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
