"use server"

import { getSupabaseServer } from '@/lib/supabase-server'

export async function getDashboardStats() {
    const supabase = await getSupabaseServer()
    if (!supabase) {
        throw new Error('Variables de entorno Supabase no configuradas o cliente no inicializado')
    }

    try {
        // 1. Obtener usuario de auth.users usando JWT validado
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
            console.error('spc: error obteniendo usuario auth en getDashboardStats', authError)
            return { error: 'No autenticado' }
        }

        // 2. Obtener rol y datos de la vista pública
        const { data: user, error: userError } = await supabase
            .from('usuarios')
            .select('id, rol, nombre, color_perfil, email, activo')
            .eq('id', authUser.id)
            .limit(1)
            .maybeSingle()

        if (userError || !user) {
            console.error('spc: error obteniendo usuario public en getDashboardStats', userError)
            return { error: 'Usuario no encontrado en base de datos' }
        }

        const { id: userId, rol } = user

        // 2. Definir consultas base
        // Usamos Promesas que se resolveran en paralelo
        const queries: any = {
            edificios: supabase.from('edificios').select('*', { count: 'exact', head: true }),
            telefonos: supabase.from('telefonos_departamento').select('*', { count: 'exact', head: true }),
            admins: supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('rol', 'admin'),
            tareas_activas: supabase.from('tareas').select('*', { count: 'exact', head: true }).eq('finalizada', false)
        }

        // 3. Aplicar filtros segun rol
        if (rol === 'trabajador') {
            // Trabajador: solo sus tareas asignadas
            const { data: tareasIds } = await supabase
                .from('trabajadores_tareas')
                .select('id_tarea')
                .eq('id_trabajador', userId)

            const ids = tareasIds?.map(t => t.id_tarea) || []
            // si no tiene tareas, filtrar por ID imposible (uuid nulo no existe, usar filtro que de 0 resultados)
            if (ids.length > 0) {
                queries.tareas_activas = queries.tareas_activas.in('id', ids)
            } else {
                queries.tareas_activas = queries.tareas_activas.eq('id', '00000000-0000-0000-0000-000000000000')
            }
        }

        if (rol === 'supervisor') {
            // Supervisor: sus tareas asignadas
            const { data: tareasIds } = await supabase
                .from('supervisores_tareas')
                .select('id_tarea')
                .eq('id_supervisor', userId)

            const ids = tareasIds?.map(t => t.id_tarea) || []
            if (ids.length > 0) {
                queries.tareas_activas = queries.tareas_activas.in('id', ids)
            } else {
                queries.tareas_activas = queries.tareas_activas.eq('id', '00000000-0000-0000-0000-000000000000')
            }
        }

        // 4. Ejecutar todas
        const [edificiosRes, telefonosRes, adminsRes, tareasRes] = await Promise.all([
            queries.edificios,
            queries.telefonos,
            queries.admins,
            queries.tareas_activas
        ])

        // 5. Obtener estadísticas específicas por rol (KPIs Financieros Platinum)
        let roleStats = null
        try {
            if (rol === 'admin') {
                const { data } = await supabase.from('vista_finanzas_admin').select('*').maybeSingle()
                roleStats = data
            } else if (rol === 'supervisor') {
                const { data } = await supabase.from('vista_finanzas_supervisor').select('*').maybeSingle()
                roleStats = data
            } else if (rol === 'trabajador') {
                const { data } = await supabase.from('vista_finanzas_trabajador').select('*').maybeSingle()
                roleStats = data
            }
        } catch (roleError) {
            console.error('spc: error obteniendo roleStats', roleError)
        }

        return {
            stats: {
                total_edificios: edificiosRes.count || 0,
                total_contactos: telefonosRes.count || 0,
                total_administradores: adminsRes.count || 0,
                tareas_activas: tareasRes.count || 0
            },
            roleStats,
            userDetails: user
        }

    } catch (err: any) {
        console.error('spc: error en getDashboardStats', err)
        return { error: err.message }
    }
}
