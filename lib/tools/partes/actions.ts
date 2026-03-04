'use server'

/**
 * SPC TOOLS: server actions de partes de trabajo
 * logica de negocio desacoplada, reutilizable desde cualquier pagina
 */

import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import type { ToolContext, ToolResult } from './types'

// validar que la fecha esta en la semana actual (lunes a domingo)
function enSemanaActual(fecha: string): boolean {
    const today = new Date()
    const day = today.getDay()
    const mondayOffset = (day + 6) % 7
    const start = new Date(today)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - mondayOffset)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    const d = new Date(`${fecha}T00:00:00`)
    return d >= start && d <= end
}

// validar que la fecha esta dentro de los proximos 30 dias (para planificacion)
function enVentanaPlanificacion(fecha: string): boolean {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const limite = new Date(hoy)
    limite.setDate(limite.getDate() + 30)
    const d = new Date(`${fecha}T00:00:00`)
    return d >= hoy && d <= limite
}

function revalidar() {
    revalidatePath('/dashboard/trabajadores/registro-dias')
    revalidatePath('/dashboard/agenda')
    revalidatePath('/dashboard/tareas')
}

/**
 * registrar un parte de trabajo rapido (confirmado al instante)
 * equivale al flujo actual de /api/partes/registrar pero como server action
 */
export async function registrarParteRapido(ctx: ToolContext & {
    id_tarea: number
    id_trabajador: string
    fecha: string
    tipo_jornada: 'dia_completo' | 'medio_dia'
}): Promise<ToolResult> {
    try {
        const user = await validateSessionAndGetUser()

        // validar ventana temporal
        if (!enSemanaActual(ctx.fecha)) {
            return { ok: false, error: 'solo puedes registrar en la semana actual (lunes a domingo)' }
        }

        // validar rol (admin puede todo, supervisor debe estar asignado)
        if (user.rol === 'supervisor') {
            const { data: supOk } = await supabaseAdmin
                .from('supervisores_tareas')
                .select('id')
                .eq('id_tarea', ctx.id_tarea)
                .eq('id_supervisor', user.id)
                .maybeSingle()
            if (!supOk) return { ok: false, error: 'no estas asignado como supervisor de esta tarea' }
        } else if (user.rol === 'trabajador') {
            if (ctx.id_trabajador !== user.id) {
                return { ok: false, error: 'no puedes registrar partes para otros trabajadores' }
            }
        } else if (user.rol !== 'admin') {
            return { ok: false, error: 'rol no autorizado' }
        }

        // validar que el trabajador esta asignado a la tarea
        if (user.rol !== 'admin') {
            const { data: trabOk } = await supabaseAdmin
                .from('trabajadores_tareas')
                .select('id')
                .eq('id_tarea', ctx.id_tarea)
                .eq('id_trabajador', ctx.id_trabajador)
                .maybeSingle()
            if (!trabOk) return { ok: false, error: 'el trabajador no esta asignado a esta tarea' }
        }

        // insertar con estado = confirmado
        const { data, error } = await supabaseAdmin
            .from('partes_de_trabajo')
            .insert({
                id_tarea: ctx.id_tarea,
                id_trabajador: ctx.id_trabajador,
                fecha: ctx.fecha,
                tipo_jornada: ctx.tipo_jornada,
                id_registrador: user.id,
                estado: 'confirmado',
            })
            .select('id')
            .single()

        if (error) {
            const esCapacidad = error.message?.toLowerCase().includes('capacidad diaria excedida')
            return { ok: false, error: esCapacidad ? 'capacidad diaria excedida para este trabajador' : error.message }
        }

        revalidar()
        return { ok: true, data }
    } catch (e: any) {
        return { ok: false, error: e.message || 'error inesperado' }
    }
}

/**
 * planificar un parte proyectado (sin restriccion de semana actual)
 * el supervisor "siembra" bloques para la semana que viene
 */
export async function planificarParte(ctx: {
    id_tarea: number
    id_trabajador: string
    fecha: string
    tipo_jornada: 'dia_completo' | 'medio_dia'
}): Promise<ToolResult> {
    try {
        const user = await validateSessionAndGetUser()
        if (user.rol !== 'admin' && user.rol !== 'supervisor') {
            return { ok: false, error: 'solo supervisores y admins pueden planificar' }
        }

        if (!enVentanaPlanificacion(ctx.fecha)) {
            return { ok: false, error: 'solo puedes planificar hasta 30 dias en el futuro' }
        }

        // verificar que no exista ya un parte para ese trabajador/tarea/fecha
        const { data: existente } = await supabaseAdmin
            .from('partes_de_trabajo')
            .select('id')
            .eq('id_trabajador', ctx.id_trabajador)
            .eq('id_tarea', ctx.id_tarea)
            .eq('fecha', ctx.fecha)
            .maybeSingle()

        if (existente) {
            return { ok: false, error: 'ya existe un registro para este trabajador en esta tarea y fecha' }
        }

        const { data, error } = await supabaseAdmin
            .from('partes_de_trabajo')
            .insert({
                id_tarea: ctx.id_tarea,
                id_trabajador: ctx.id_trabajador,
                fecha: ctx.fecha,
                tipo_jornada: ctx.tipo_jornada,
                id_registrador: user.id,
                estado: 'proyectado',
            })
            .select('id')
            .single()

        if (error) return { ok: false, error: error.message }

        revalidar()
        return { ok: true, data }
    } catch (e: any) {
        return { ok: false, error: e.message || 'error inesperado' }
    }
}

/**
 * confirmacion masiva: cambia estado de proyectado a confirmado
 * el supervisor "pasa lista" y confirma multiples partes en un batch
 */
export async function confirmarJornadaBatch(ids: number[]): Promise<ToolResult> {
    try {
        const user = await validateSessionAndGetUser()
        if (user.rol !== 'admin' && user.rol !== 'supervisor') {
            return { ok: false, error: 'solo supervisores y admins pueden confirmar jornadas' }
        }

        if (!ids.length) return { ok: false, error: 'no hay registros para confirmar' }

        const { error } = await supabaseAdmin
            .from('partes_de_trabajo')
            .update({ estado: 'confirmado', id_registrador: user.id })
            .in('id', ids)
            .eq('estado', 'proyectado')

        if (error) return { ok: false, error: error.message }

        revalidar()
        return { ok: true, data: { confirmados: ids.length } }
    } catch (e: any) {
        return { ok: false, error: e.message || 'error inesperado' }
    }
}

/**
 * marcar ausencia: elimina un registro proyectado
 */
export async function marcarAusencia(id: number): Promise<ToolResult> {
    try {
        const user = await validateSessionAndGetUser()
        if (user.rol !== 'admin' && user.rol !== 'supervisor') {
            return { ok: false, error: 'solo supervisores y admins pueden marcar ausencias' }
        }

        const { error } = await supabaseAdmin
            .from('partes_de_trabajo')
            .delete()
            .eq('id', id)
            .eq('estado', 'proyectado')

        if (error) return { ok: false, error: error.message }

        revalidar()
        return { ok: true }
    } catch (e: any) {
        return { ok: false, error: e.message || 'error inesperado' }
    }
}

/**
 * mover un parte proyectado a otra tarea (imprevisto)
 */
export async function moverParteProyectado(id: number, nuevoIdTarea: number): Promise<ToolResult> {
    try {
        const user = await validateSessionAndGetUser()
        if (user.rol !== 'admin' && user.rol !== 'supervisor') {
            return { ok: false, error: 'solo supervisores y admins pueden mover partes' }
        }

        const { error } = await supabaseAdmin
            .from('partes_de_trabajo')
            .update({ id_tarea: nuevoIdTarea })
            .eq('id', id)
            .eq('estado', 'proyectado')

        if (error) return { ok: false, error: error.message }

        revalidar()
        return { ok: true }
    } catch (e: any) {
        return { ok: false, error: e.message || 'error inesperado' }
    }
}

/**
 * eliminar un parte (solo si no esta liquidado)
 */
export async function eliminarParte(id: number): Promise<ToolResult> {
    try {
        const user = await validateSessionAndGetUser()

        // verificar que no este liquidado
        const { data: parte } = await supabaseAdmin
            .from('partes_de_trabajo')
            .select('id, liquidado, id_trabajador, id_tarea, fecha')
            .eq('id', id)
            .single()

        if (!parte) return { ok: false, error: 'parte no encontrado' }
        if (parte.liquidado) return { ok: false, error: 'no se puede eliminar un parte liquidado' }

        // validar permisos
        if (user.rol === 'trabajador' && parte.id_trabajador !== user.id) {
            return { ok: false, error: 'no puedes eliminar partes de otros trabajadores' }
        }

        // validar ventana temporal para registros confirmados
        if (!enSemanaActual(parte.fecha)) {
            return { ok: false, error: 'fuera de la ventana de edicion' }
        }

        const { error } = await supabaseAdmin
            .from('partes_de_trabajo')
            .delete()
            .eq('id', id)

        if (error) return { ok: false, error: error.message }

        revalidar()
        return { ok: true }
    } catch (e: any) {
        return { ok: false, error: e.message || 'error inesperado' }
    }
}
