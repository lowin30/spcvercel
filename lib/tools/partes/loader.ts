/**
 * SPC TOOLS: loaders de partes de trabajo
 * funciones de lectura server-side usando vistas SQL
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import type { PaseListaItem, TareaConTrabajadores, ResumenPlanificacion } from './types'

/**
 * obtener tareas activas con trabajadores asignados (para selectores)
 */
export async function getTareasActivasConTrabajadores(
    userId: string,
    userRol: string
): Promise<TareaConTrabajadores[]> {
    // obtener tareas segun rol
    let tareasIds: number[] = []

    if (userRol === 'admin') {
        const { data } = await supabaseAdmin
            .from('tareas')
            .select('id, titulo, code, id_edificio')
            .eq('finalizada', false)
            .order('titulo')

        if (!data) return []
        tareasIds = data.map(t => t.id)
    } else if (userRol === 'supervisor') {
        const { data: asigns } = await supabaseAdmin
            .from('supervisores_tareas')
            .select('id_tarea')
            .eq('id_supervisor', userId)

        if (!asigns?.length) return []
        tareasIds = asigns.map(a => a.id_tarea)
    } else {
        const { data: asigns } = await supabaseAdmin
            .from('trabajadores_tareas')
            .select('id_tarea')
            .eq('id_trabajador', userId)

        if (!asigns?.length) return []
        tareasIds = asigns.map(a => a.id_tarea)
    }

    if (!tareasIds.length) return []

    // obtener tareas con edificios
    const { data: tareas } = await supabaseAdmin
        .from('tareas')
        .select('id, titulo, code, id_edificio')
        .in('id', tareasIds)
        .eq('finalizada', false)
        .order('titulo')

    if (!tareas) return []

    // obtener nombres de edificios
    const edificioIds = [...new Set(tareas.map(t => t.id_edificio))]
    const { data: edificios } = await supabaseAdmin
        .from('edificios')
        .select('id, nombre')
        .in('id', edificioIds)

    const edificioMap = new Map((edificios || []).map(e => [e.id, e.nombre]))

    // obtener trabajadores asignados por tarea
    const { data: asignaciones } = await supabaseAdmin
        .from('trabajadores_tareas')
        .select('id_tarea, id_trabajador')
        .in('id_tarea', tareasIds)

    const trabajadorIds = [...new Set((asignaciones || []).map(a => a.id_trabajador))]
    const { data: usuarios } = await supabaseAdmin
        .from('usuarios')
        .select('id, nombre, email, color_perfil')
        .in('id', trabajadorIds)

    const userMap = new Map((usuarios || []).map(u => [u.id, u]))

    // construir resultado
    return tareas.map(t => ({
        id: t.id,
        titulo: t.titulo,
        code: t.code || '',
        nombre_edificio: edificioMap.get(t.id_edificio) || '',
        trabajadores: (asignaciones || [])
            .filter(a => a.id_tarea === t.id)
            .map(a => {
                const u = userMap.get(a.id_trabajador)
                return {
                    id: a.id_trabajador,
                    nombre: u?.nombre || u?.email?.split('@')[0] || 'sin nombre',
                    email: u?.email || '',
                    color_perfil: u?.color_perfil || '#6366f1',
                }
            })
    }))
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
