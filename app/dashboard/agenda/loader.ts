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

    // Construir la consulta base - Solo campos necesarios
    let queryBuilder = supabaseAdmin
        .from("vista_tareas_completa")
        .select(`
            id, code, titulo, descripcion, prioridad,
            id_estado_nuevo, estado_tarea, fecha_visita, finalizada,
            nombre_edificio, trabajadores_emails, id_edificio, id_asignado
        `)
        .order('prioridad', { ascending: false })

    // Aplicar filtros según el rol
    if (userRol === "trabajador") {
        const { data: asigns } = await supabaseAdmin
            .from('vista_asignaciones_tareas_trabajadores')
            .select('id_tarea')
            .eq('id_trabajador', userId)

        const tareasAsignadas = asigns?.map((t: any) => t.id_tarea) || []
        tareasAsignadasIds = tareasAsignadas

        if (tareasAsignadas.length > 0) {
            queryBuilder = queryBuilder.in("id", tareasAsignadas)
        } else {
            queryBuilder = queryBuilder.eq("id", -1)
        }
    } else if (userRol === "supervisor") {
        const { data: asigns } = await supabaseAdmin
            .from('vista_asignaciones_tareas_supervisores')
            .select('id_tarea')
            .eq('id_supervisor', userId)

        const tareasAsignadas = asigns?.map((t: any) => t.id_tarea) || []
        tareasAsignadasIds = tareasAsignadas

        if (tareasAsignadas.length > 0) {
            queryBuilder = queryBuilder.in("id", tareasAsignadas)

            if (asignadoId) {
                const { data: asignsTrab } = await supabaseAdmin
                    .from('vista_asignaciones_tareas_trabajadores')
                    .select('id_tarea')
                    .eq('id_trabajador', asignadoId)

                const idsTrab = asignsTrab?.map((t: any) => t.id_tarea) || []
                if (idsTrab.length > 0) {
                    queryBuilder = queryBuilder.in("id", idsTrab)
                } else {
                    queryBuilder = queryBuilder.eq("id", -1)
                }
            }
        } else {
            queryBuilder = queryBuilder.eq("id", -1)
        }
    } else {
        // Admins ven todas pero pueden filtrar por usuario asignado
        if (asignadoId) {
            queryBuilder = queryBuilder.eq("id_asignado", asignadoId)
        }
    }

    // Filtro por edificio
    if (edificioId) {
        queryBuilder = queryBuilder.eq("id_edificio", edificioId)
    }

    // Filtro por estado
    if (estadoTarea) {
        queryBuilder = queryBuilder.eq("id_estado_nuevo", estadoTarea)
    }

    // Solo tareas con fecha de visita (agenda) y no finalizadas
    queryBuilder = queryBuilder.not("fecha_visita", "is", null)
    queryBuilder = queryBuilder.eq("finalizada", false)

    // Filtrar por rango de fechas
    if (fechaDesde) {
        queryBuilder = queryBuilder.gte("fecha_visita", fechaDesde)
    }
    if (fechaHasta) {
        queryBuilder = queryBuilder.lte("fecha_visita", `${fechaHasta}T23:59:59`)
    }

    // Ejecutar consulta
    const tareasResponse = await queryBuilder
    const tareasVisitas = tareasResponse.data || []

    // Preparar datos para calendario: visitas + trabajo real (Modo Dios)
    const visitasConTipo = tareasVisitas.map((t: any) => ({ ...t, tipo: 'visita' as const }))
    let calendarioCombinado: any[] = [...visitasConTipo]

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
                        estado_tarea: 'ejecucion', // Default o mapear si es necesario
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

            calendarioCombinado = [...visitasConTipo, ...eventosTrabajo]
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
        tareas: tareasVisitas,
        tareasCalendar: calendarioCombinado,
        edificios: edificiosData || [],
        estadosTareas: estadosData || [],
        usuarios: usuariosData,
    }
}
