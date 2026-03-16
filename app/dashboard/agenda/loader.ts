import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { DBActividadMaestra } from '@/lib/types/god-mode'

/**
 * AGENDA LOADER v109.0 (Server-Side Data Loading)
 * Usa supabaseAdmin para bypassear RLS.
 * Carga datos de tareas, edificios, estados y usuarios para la agenda.
 * El filtrado por rol y searchParams se hace aquí en el servidor.
 */

interface AgendaParams {
    userId: string
    userRol: string
    edificioId?: string | null
    estadoTarea?: string | null
    fechaDesde?: string | null
    fechaHasta?: string | null
    asignadoId?: string | null
}

export async function getAgendaData(params: AgendaParams) {
    const { userId, userRol, edificioId, estadoTarea, fechaDesde, fechaHasta, asignadoId } = params

    // Rango de fechas para el calendario (si no hay parámetros, usar mes actual)
    const hoy = new Date()
    const rangoDesde = fechaDesde || new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10)
    const rangoHasta = fechaHasta || new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0, 10)

    // IDs de tareas asignadas por rol
    let tareasAsignadasIds: number[] = []

    // Construir la consulta base - Usamos la vista unificada v85.0
    let queryBuilder = supabaseAdmin
        .from("vista_agenda_operativa_unificada")
        .select(`
            global_id, id, code, titulo, comentario, prioridad,
            estado_visual, id_edificio, edificio_nombre, 
            id_departamento, departamento_nombre,
            id_asignado, asignado_nombre, tipo_registro, created_at
        `)
        .order('prioridad', { ascending: false })

    // Aplicar filtros según el rol
    if (userRol === "trabajador") {
        queryBuilder = queryBuilder.eq("id_asignado", userId)
    } else if (userRol === "supervisor") {
        // Para supervisores, filtramos por sus tareas asignadas (esto requiere cuidado si la vista no tiene supervisor)
        // Por ahora, si es supervisor, permitimos ver todo del edificio si está filtrado, 
        // o mantenemos la lógica de asignaciones previas para las 'tareas' reales.
        
        if (asignadoId) {
            queryBuilder = queryBuilder.eq("id_asignado", asignadoId)
        }
    } else {
        // Admins ven todas
        if (asignadoId) {
            queryBuilder = queryBuilder.eq("id_asignado", asignadoId)
        }
    }

    // Filtro por edificio
    if (edificioId) {
        queryBuilder = queryBuilder.eq("id_edificio", edificioId)
    }

    // Ejecutar consulta
    const response = await queryBuilder
    const itemsUnificados = response.data || []

    // Preparar datos para calendario
    const eventosVisitas = itemsUnificados.map((t: any) => ({
        ...t,
        fecha_visita: t.created_at, // Fallback
        tipo: t.tipo_registro === 'micro_tarea' ? 'microtarea' : 'visita'
    }))

    let calendarioCombinado: any[] = [...eventosVisitas]

    try {
        // [MODO DIOS] Consulta unificada de actividad (Jornales y Gastos)
        let actividadQuery = supabaseAdmin
            .from('vista_actividad_maestra_god_mode')
            .select('*')
            .gte('fecha', rangoDesde)
            .lte('fecha', rangoHasta)

        // Filtro por Rol (Seguridad de la vista)
        if (userRol === 'trabajador') {
            actividadQuery = actividadQuery.eq('id_usuario', userId)
        } else if (userRol === 'supervisor') {
            actividadQuery = actividadQuery.eq('id_supervisor', userId)
        }

        const { data: actividadData, error: actividadError } = await actividadQuery

        if (!actividadError && actividadData) {
            // Agrupar por (fecha, id_tarea) para mostrar en el calendario
            const grupos = new Map<string, any>()
            for (const a of actividadData) {
                const clave = `${a.id_tarea}|${a.fecha}`
                let g = grupos.get(clave)
                if (!g) {
                    g = {
                        id_tarea: a.id_tarea,
                        fecha: a.fecha,
                        titulo: a.titulo_tarea,
                        prioridad: 'media',
                        estado_tarea: 'ejecucion',
                        tipo: 'trabajo' as const
                    }
                    grupos.set(clave, g)
                }
            }

            const eventosTrabajo = Array.from(grupos.values()).map(g => ({
                id: g.id_tarea,
                titulo: g.titulo,
                prioridad: g.prioridad,
                estado_tarea: g.estado_tarea,
                fecha_visita: `${g.fecha}T00:00:00`,
                tipo: 'trabajo' as const,
            }))

            calendarioCombinado = [...eventosVisitas, ...eventosTrabajo]
        }
    } catch (e) {
        console.error('Error al preparar eventos de trabajo (Modo Dios) para calendario:', e)
    }

    // Cargar edificios para el filtro
    const { data: edificiosData } = await supabaseAdmin
        .from("edificios")
        .select("id, nombre")
        .order("nombre")

    // Cargar estados de tareas
    const { data: estadosData } = await supabaseAdmin
        .from("estados_tareas")
        .select("id, codigo, nombre, color")
        .order("orden")

    // Cargar usuarios para el filtro (solo para supervisores y admins)
    let usuariosData: any[] = []
    if (userRol !== "trabajador") {
        const { data: usersData } = await supabaseAdmin
            .from("usuarios")
            .select("id, email, rol")
            .in("rol", ["trabajador", "supervisor"])
            .order("email")
        usuariosData = usersData || []
    }

    return {
        tareas: itemsUnificados,
        tareasCalendar: calendarioCombinado,
        edificios: edificiosData || [],
        estadosTareas: estadosData || [],
        usuarios: usuariosData,
    }
}
