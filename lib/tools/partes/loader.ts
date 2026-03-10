/**
 * SPC TOOLS: loaders de partes de trabajo
 * funciones de lectura server-side usando vistas SQL
 */

import { getSupabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

import type {
    PaseListaItem,
    TareaConTrabajadores,
    ResumenPlanificacion,
    AgendaData,
    AgendaEvento
} from './types'

/**
 * obtener tareas activas con trabajadores asignados (para selectores)
 */
export async function getTareasActivasConTrabajadores(
    userId: string,
    userRol: string
): Promise<TareaConTrabajadores[]> {
    console.log(`[LOADER-GOD] Carga de tareas para ${userId} (${userRol})`);

    const supabase = await getSupabaseServer()
    // 1. Obtener todas las tareas activas (finalizada = false)
    let query = supabase
        .from('vista_tareas_completa')
        .select('*')
        .eq('finalizada', false)
        .order('titulo')

    // 2. Filtrar por rol si no es admin
    if (userRol === 'supervisor') {
        const { data: asigns, error: asignsError } = await supabase
            .from('supervisores_tareas')
            .select('id_tarea')
            .eq('id_supervisor', userId)

        if (asignsError) console.error(`[LOADER-GOD] Error supervisores_tareas para ${userId}:`, asignsError);
        const ids = asigns?.map(a => a.id_tarea) || []
        console.log(`[LOADER-GOD] Tareas asignadas: ${ids.length}`);

        if (ids.length === 0) return []
        query = query.in('id', ids)
    } else if (userRol === 'trabajador') {
        const { data: asigns, error: asignsError } = await supabase
            .from('trabajadores_tareas')
            .select('id_tarea')
            .eq('id_trabajador', userId)

        if (asignsError) console.error(`[LOADER-GOD] Error trabajadores_tareas para ${userId}:`, asignsError);
        const ids = asigns?.map(a => a.id_tarea) || []

        if (ids.length === 0) return []
        query = query.in('id', ids)
    }

    const { data: tareas, error } = await query
    console.log(`[LOADER-GOD] SQL Result - Tareas: ${tareas?.length || 0}, Error: ${error?.message || 'none'}`);

    if (error || !tareas) return []

    // 3. Mapear al tipo TareaConTrabajadores
    return tareas.map(t => {
        const trabajadoresJson = Array.isArray(t.trabajadores_json) ? t.trabajadores_json : []
        return {
            id: t.id,
            titulo: t.titulo,
            code: t.code || '',
            nombre_edificio: t.nombre_edificio || '',
            trabajadores: trabajadoresJson.map((tr: any) => ({
                id: tr.id,
                nombre: tr.nombre || tr.email?.split('@')[0] || 'Sin nombre',
                email: tr.email || '',
                color_perfil: tr.color_perfil || '#6366f1'
            }))
        }
    })
}

/**
 * obtener partes del dia para el pase de lista
 */
export async function getPartesDelDia(
    fecha: string,
    userId: string,
    userRol: string
): Promise<PaseListaItem[]> {
    let query = supabaseAdmin
        .from('vista_actividad_maestra_god_mode')
        .select('*')
        .eq('tipo_evento', 'JORNAL')
        .eq('fecha', fecha)

    // filtrar por rol
    if (userRol === 'supervisor') {
        query = query.eq('id_supervisor', userId)
    } else if (userRol === 'trabajador') {
        query = query.eq('id_usuario', userId)
    }

    const { data, error } = await query

    if (error || !data) return []

    return data.map((a: any) => ({
        id: a.event_id,
        id_tarea: a.id_tarea,
        titulo_tarea: a.titulo_tarea || '',
        codigo_tarea: a.codigo_tarea || '',
        nombre_edificio: a.nombre_edificio || '',
        id_trabajador: a.id_usuario,
        nombre_trabajador: a.nombre_usuario || a.email_usuario?.split('@')[0] || '',
        email_trabajador: a.email_usuario || '',
        color_trabajador: a.ui_metadata?.color_perfil || '#6366f1',
        fecha: a.fecha,
        tipo_jornada: a.detalle_tipo,
        estado: a.estado || 'confirmado',
    }))
}

/**
 * obtener partes de la semana actual (para planificador)
 */
export async function getPartesSemana(
    fechaInicio: string,
    fechaFin: string,
    userId: string,
    userRol: string
): Promise<PaseListaItem[]> {
    let query = supabaseAdmin
        .from('vista_actividad_maestra_god_mode')
        .select('*')
        .eq('tipo_evento', 'JORNAL')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)

    if (userRol === 'supervisor') {
        query = query.eq('id_supervisor', userId)
    } else if (userRol === 'trabajador') {
        query = query.eq('id_usuario', userId)
    }

    const { data, error } = await query
    if (error || !data) return []

    return data.map((a: any) => ({
        id: a.event_id,
        id_tarea: a.id_tarea,
        titulo_tarea: a.titulo_tarea || '',
        codigo_tarea: a.codigo_tarea || '',
        nombre_edificio: a.nombre_edificio || '',
        id_trabajador: a.id_usuario,
        nombre_trabajador: a.nombre_usuario || a.email_usuario?.split('@')[0] || '',
        email_trabajador: a.email_usuario || '',
        color_trabajador: a.ui_metadata?.color_perfil || '#6366f1',
        fecha: a.fecha,
        tipo_jornada: a.detalle_tipo,
        estado: a.estado || 'confirmado',
    }))
}

/**
 * resumen de planificacion (KPIs)
 */
export async function getResumenPlanificacion(
    fechaInicio: string,
    fechaFin: string,
    userId: string,
    userRol: string
): Promise<ResumenPlanificacion> {
    const partes = await getPartesSemana(fechaInicio, fechaFin, userId, userRol)

    return {
        total_proyectados: partes.filter(p => p.estado === 'proyectado').length,
        total_confirmados: partes.filter(p => p.estado === 'confirmado').length,
        total_pendientes: partes.filter(p => p.estado === 'proyectado').length,
        trabajadores_activos: new Set(partes.map(p => p.id_trabajador)).size,
        tareas_con_actividad: new Set(partes.map(p => p.id_tarea)).size,
    }
}

/**
 * LOADER AGENDA PLATINUM v2
 * Unifica todo en una sola carga server-side
 */
export async function getAgendaDataV2(params: {
    userId: string
    userRol: string
    edificioId?: number
    trabajadorId?: string
    fechaDesde: string
    fechaHasta: string
}): Promise<AgendaData> {
    const { userId, userRol, edificioId, trabajadorId, fechaDesde, fechaHasta } = params

    const supabase = await getSupabaseServer()
    // 1. Cargar Partes (Proyectados y Confirmados) + Gastos desde vista actividad maestra
    let queryActividad = supabase
        .from('vista_actividad_maestra_god_mode')
        .select('*')
        .gte('fecha', fechaDesde)
        .lte('fecha', fechaHasta)

    if (userRol === 'supervisor') {
        queryActividad = queryActividad.eq('id_supervisor', userId)
    } else if (userRol === 'trabajador') {
        queryActividad = queryActividad.eq('id_usuario', userId)
    }

    console.log(`[LOADER-GOD] Aplicando filtros - Edificio: ${edificioId}, Trabajador: ${trabajadorId}`);

    if (edificioId && edificioId !== 0) {
        queryActividad = queryActividad.eq('id_edificio', edificioId)
    }

    if (trabajadorId && trabajadorId !== "0") {
        queryActividad = queryActividad.eq('id_usuario', trabajadorId)
    }

    const { data: actividad } = await queryActividad

    // 2. Cargar Tareas con fecha_visita (Agenda Clásica)
    let queryTareas = supabase
        .from('vista_tareas_completa')
        .select('*')
        .not('fecha_visita', 'is', null)
        .gte('fecha_visita', fechaDesde)
        .lte('fecha_visita', fechaHasta)
        .eq('finalizada', false)

    // Filtrado por Rol para Visitas
    if (userRol === 'supervisor') {
        const { data: asigns } = await supabase
            .from('supervisores_tareas')
            .select('id_tarea')
            .eq('id_supervisor', userId)

        const ids = asigns?.map(a => a.id_tarea) || []
        if (ids.length > 0) {
            queryTareas = queryTareas.in('id', ids)
        } else {
            queryTareas = queryTareas.eq('id', -1)
        }
    } else if (userRol === 'trabajador') {
        const { data: asigns } = await supabase
            .from('trabajadores_tareas')
            .select('id_tarea')
            .eq('id_trabajador', userId)

        const ids = asigns?.map(a => a.id_tarea) || []
        if (ids.length > 0) {
            queryTareas = queryTareas.in('id', ids)
        } else {
            queryTareas = queryTareas.eq('id', -1)
        }
    }

    if (edificioId && edificioId !== 0) {
        queryTareas = queryTareas.eq('id_edificio', edificioId)
    }

    if (trabajadorId && trabajadorId !== "0") {
        // Filtrar por si el trabajador está en la tarea mediante pivot table
        const { data: workerTasks } = await supabase
            .from('trabajadores_tareas')
            .select('id_tarea')
            .eq('id_trabajador', trabajadorId)

        const workerTaskIds = workerTasks?.map(a => a.id_tarea) || []
        if (workerTaskIds.length > 0) {
            queryTareas = queryTareas.in('id', workerTaskIds)
        } else {
            queryTareas = queryTareas.eq('id', -1)
        }
    }

    const { data: tareas } = await queryTareas

    // 3. Unificar Eventos
    const eventos: AgendaEvento[] = []

    // Mapear actividad (Jornales y Gastos)
    actividad?.forEach((a: any) => {
        eventos.push({
            id: a.event_id,
            tipo: a.tipo_evento === 'JORNAL'
                ? (a.estado === 'proyectado' ? 'proyectado' : 'confirmado')
                : 'gasto',
            fecha: a.fecha,
            id_tarea: a.id_tarea,
            titulo: a.titulo_tarea || a.descripcion || 'Actividad',
            nombre_edificio: a.nombre_edificio,
            id_usuario: a.id_usuario,
            nombre_usuario: a.nombre_usuario || a.email_usuario?.split('@')[0],
            tipo_jornada: a.detalle_tipo,
        })
    })

    // Mapear tareas (Visitas)
    tareas?.forEach((t: any) => {
        const trabajadoresArr = Array.isArray(t.trabajadores_json) ? t.trabajadores_json : []

        // Si no hay trabajadores asignados, crear un evento genérico (fallback)
        if (trabajadoresArr.length === 0) {
            // Truncar fecha por Espacio o T (soporte universal Postgres string/ISO)
            const fechaVisita = t.fecha_visita.split(/[ T]/)[0]

            const existeParte = eventos.find(e => e.id_tarea === t.id && e.fecha === fechaVisita)
            if (!existeParte) {
                eventos.push({
                    id: `visita-${t.id}-gen`,
                    tipo: 'visita',
                    fecha: fechaVisita,
                    id_tarea: t.id,
                    titulo: t.titulo,
                    nombre_edificio: t.nombre_edificio,
                    id_usuario: undefined,
                    id_estado_tarea: t.id_estado_nuevo || 1,
                    estado_tarea: t.estado_tarea || 'Pendiente',
                    prioridad: t.prioridad || 'media'

                })
            }
            return
        }

        // Crear un evento de visita por cada trabajador asignado
        trabajadoresArr.forEach((tr: any) => {
            const fechaVisita = t.fecha_visita.split(/[ T]/)[0]


            // Solo agregar si el trabajador NO tiene ya un parte (proyectado o confirmado) para esta tarea/fecha
            const existeParte = eventos.find(e =>
                e.id_tarea === t.id &&
                e.fecha === fechaVisita &&
                e.id_usuario === tr.id
            )

            if (!existeParte) {
                eventos.push({
                    id: `visita-${t.id}-${tr.id}`,
                    tipo: 'visita',
                    fecha: fechaVisita,
                    id_tarea: t.id,
                    titulo: t.titulo,
                    nombre_edificio: t.nombre_edificio,
                    id_usuario: tr.id,
                    nombre_usuario: tr.nombre || tr.email?.split('@')[0],
                    id_estado_tarea: t.id_estado_nuevo || 1,
                    estado_tarea: t.estado_tarea || 'Pendiente',
                    prioridad: t.prioridad || 'media'

                })
            }
        })
    })

    // 4. Catalogos para filtros y agendamiento
    const [edificiosRes, usuariosRes, estadosRes, tareasActivas] = await Promise.all([
        supabase.from('edificios').select('id, nombre').order('nombre'),
        userRol !== 'trabajador'
            ? supabase.from('usuarios').select('id, email, nombre, rol, color_perfil').in('rol', ['trabajador', 'supervisor']).order('nombre')
            : Promise.resolve({ data: [] }),
        supabase.from('estados_tareas').select('id, nombre, color').order('orden'),
        getTareasActivasConTrabajadores(userId, userRol) // Reutilizamos esta función para el planificador
    ])

    console.log(`[LOADER-GOD] Final Catalog Summary:`, {
        eventos: eventos.length,
        edificios: edificiosRes.data?.length || 0,
        usuarios: (usuariosRes as any).data?.length || 0,
        estados: estadosRes.data?.length || 0,
        tareasActivas: tareasActivas.length
    });




    // console.log(`[LOADER] AgendaData cargada: ${eventos.length} eventos, ${tareasActivas.length} tareas activas, ${(usuariosRes as any).data?.length || 0} usuarios`);

    return {
        eventos,
        resumen: {
            total_proyectados: eventos.filter(e => e.tipo === 'proyectado').length,
            total_confirmados: eventos.filter(e => e.tipo === 'confirmado').length,
            total_pendientes: eventos.filter(e => e.tipo === 'visita').length,
            trabajadores_activos: new Set(eventos.filter(e => e.id_usuario).map(e => e.id_usuario)).size,
            tareas_con_actividad: new Set(eventos.filter(e => e.id_tarea).map(e => e.id_tarea)).size,
        },

        catalogos: {
            edificios: edificiosRes.data || [],
            usuarios: (usuariosRes as any).data || [],
            estados: estadosRes.data || [],
            tareas: tareasActivas || []
        }
    }
}
