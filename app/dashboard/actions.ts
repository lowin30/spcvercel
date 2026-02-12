"use server"

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function getDashboardStats(email: string) {
    if (!supabaseUrl || !serviceKey) {
        throw new Error('Variables de entorno Supabase no configuradas')
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false }
    })

    try {
        // 1. Obtener usuario y rol
        const { data: user, error: userError } = await supabase
            .from('usuarios')
            .select('id, rol, nombre, color_perfil, email, activo')
            .ilike('email', email)
            .limit(1)
            .maybeSingle()

        if (userError || !user) {
            console.error('spc: error obteniendo usuario en getDashboardStats', userError)
            return { error: 'Usuario no encontrado' }
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

        return {
            stats: {
                total_edificios: edificiosRes.count || 0,
                total_contactos: telefonosRes.count || 0,
                total_administradores: adminsRes.count || 0,
                tareas_activas: tareasRes.count || 0
            },
            userDetails: user
        }

    } catch (err: any) {
        console.error('spc: error en getDashboardStats', err)
        return { error: err.message }
    }
}
