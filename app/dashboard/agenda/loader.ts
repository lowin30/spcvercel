import { createServerClient } from '@/lib/supabase-server'

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
        .order("fecha_visita", { ascending: true, nullsLast: true })

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

    // Preparar datos para calendario: visitas + trabajo real
    const visitasConTipo = tareasVisitas.map((t: any) => ({ ...t, tipo: 'visita' as const }))
    let calendarioCombinado: any[] = [...visitasConTipo]

    try {
        let partesQuery = supabaseAdmin
            .from('partes_de_trabajo')
            .select('id_tarea, fecha, id_trabajador, tipo_jornada, liquidado')
            .gte('fecha', rangoDesde)
            .lte('fecha', rangoHasta)

        if (userRol === 'trabajador') {
            partesQuery = partesQuery.eq('id_trabajador', userId)
        } else if (userRol === 'supervisor') {
            if (tareasAsignadasIds.length > 0) {
                partesQuery = partesQuery.in('id_tarea', tareasAsignadasIds)
            } else {
                partesQuery = partesQuery.eq('id_tarea', -1)
            }
        }

        const partesResp = await partesQuery
        const partes = partesResp.data || []

        // Agrupar por (fecha, id_tarea)
        const grupos = new Map<string, any>()
        for (const p of partes) {
            const clave = `${p.id_tarea}|${p.fecha}`
            let g = grupos.get(clave)
            if (!g) {
                g = { id_tarea: p.id_tarea, fecha: p.fecha, partes: 0, jornales: 0, trabajadores: new Set<string>(), liquidado: true }
                grupos.set(clave, g)
            }
            g.partes += 1
            g.jornales += (p.tipo_jornada === 'dia_completo' ? 1 : (p.tipo_jornada === 'medio_dia' ? 0.5 : 0))
            g.trabajadores.add(p.id_trabajador)
            g.liquidado = g.liquidado && (p.liquidado === true)
        }

        const idsTrabajo = Array.from(new Set(Array.from(grupos.values()).map((g: any) => g.id_tarea)))

        let idsFiltrados = idsTrabajo
        if (asignadoId) {
            const { data: asignTResp } = await supabaseAdmin
                .from('vista_asignaciones_tareas_trabajadores')
                .select('id_tarea')
                .eq('id_trabajador', asignadoId)
            const idsTrab = (asignTResp || []).map((x: any) => x.id_tarea)
            if (idsTrab.length > 0) {
                const setTrab = new Set(idsTrab)
                idsFiltrados = idsTrabajo.filter((id: number) => setTrab.has(id))
            } else {
                idsFiltrados = []
            }
        }

        if (idsFiltrados.length > 0) {
            const { data: infoData } = await supabaseAdmin
                .from('vista_tareas_completa')
                .select('id, titulo, prioridad, id_estado_nuevo, estado_tarea, finalizada, id_edificio')
                .in('id', idsFiltrados)

            const infoMap = new Map<number, any>()
            for (const it of infoData || []) {
                if (it.finalizada !== false) continue
                if (edificioId && String(it.id_edificio) !== String(edificioId)) continue
                if (estadoTarea && String(it.id_estado_nuevo) !== String(estadoTarea)) continue
                infoMap.set(it.id, it)
            }

            const sinteticas: any[] = []
            for (const g of Array.from(grupos.values())) {
                const it = infoMap.get(g.id_tarea)
                if (!it) continue
                sinteticas.push({
                    id: it.id,
                    titulo: it.titulo,
                    prioridad: it.prioridad || 'media',
                    estado_tarea: it.estado_tarea,
                    fecha_visita: `${g.fecha}T00:00:00`,
                    tipo: 'trabajo' as const,
                })
            }

            if (sinteticas.length > 0) {
                calendarioCombinado = [...tareasVisitas, ...sinteticas]
            }
        }
    } catch (e) {
        console.error('Error al preparar eventos de trabajo para calendario:', e)
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
