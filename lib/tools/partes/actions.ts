'use server'

/**
 * SPC TOOLS: server actions de partes de trabajo
 * logica de negocio desacoplada, reutilizable desde cualquier pagina
 */

import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import type { ToolContext, ToolResult } from './types'

// validar que la fecha esta en la ventana permitida (semana actual + días de gracia de la anterior)
function enVentanaPermitida(fecha: string): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Inicio de la semana actual (Lunes)
    const day = today.getDay()
    const mondayOffset = (day + 6) % 7
    const startSemanaActual = new Date(today)
    startSemanaActual.setDate(today.getDate() - mondayOffset)

    // Ventanilla de Gracia: Aumentamos a 7 días para permitir que el lunes se edite toda la semana pasada
    const startConGracia = new Date(startSemanaActual)
    startConGracia.setDate(startSemanaActual.getDate() - 7)

    // Fin de la semana actual (Domingo)
    const endSemanaActual = new Date(startSemanaActual)
    endSemanaActual.setDate(startSemanaActual.getDate() + 6)
    endSemanaActual.setHours(23, 59, 59, 999)

    const d = new Date(`${fecha}T00:00:00`)

    // LOGS DE DEPURACIÓN PARA DIOS
    console.log(`[GRACE-CHECK] Fecha evaluada: ${fecha}`)
    console.log(`[GRACE-CHECK] Window: ${startConGracia.toISOString().split('T')[0]} <--> ${endSemanaActual.toISOString().split('T')[0]}`)
    console.log(`[GRACE-CHECK] Resultado: ${d >= startConGracia && d <= endSemanaActual}`)

    return d >= startConGracia && d <= endSemanaActual
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
 * sincronizar la proxima fecha de visita en la tabla tareas
 * calcula la fecha proyectada mas cercana y la guarda en la columna nativa
 */
async function syncProximaFechaTarea(id_tarea: number) {
    try {
        const { data: proximo } = await supabaseAdmin
            .from('partes_de_trabajo')
            .select('fecha')
            .eq('id_tarea', id_tarea)
            .eq('estado', 'proyectado')
            .gte('fecha', new Date().toISOString().split('T')[0])
            .order('fecha', { ascending: true })
            .limit(1)
            .maybeSingle()

        await supabaseAdmin
            .from('tareas')
            .update({ fecha_visita: proximo?.fecha || null })
            .eq('id', id_tarea)
    } catch (e) {
        console.error("[SYNC-DATE-ERROR]", e)
    }
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

        // validar ventana temporal (con gracia)
        if (!enVentanaPermitida(ctx.fecha)) {
            return { ok: false, error: 'fuera de la ventana permitida (semana actual + gracia)' }
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
        await syncProximaFechaTarea(ctx.id_tarea)
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

        // sync todas las tareas afectadas
        const { data: afectados } = await supabaseAdmin.from('partes_de_trabajo').select('id_tarea').in('id', ids)
        const uniqueTareaIds = Array.from(new Set(afectados?.map(a => a.id_tarea) || []))

        revalidar()
        for (const tid of uniqueTareaIds) {
            await syncProximaFechaTarea(tid)
        }
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


        // buscar tarea antes de borrar para el sync
        const { data: parte } = await supabaseAdmin.from('partes_de_trabajo').select('id_tarea').eq('id', id).single()

        const { error } = await supabaseAdmin
            .from('partes_de_trabajo')
            .delete()
            .eq('id', id)
            .eq('estado', 'proyectado')

        if (error) return { ok: false, error: error.message }

        revalidar()
        if (parte) await syncProximaFechaTarea(parte.id_tarea)
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

        // buscar tarea origen para el sync
        const { data: parte } = await supabaseAdmin.from('partes_de_trabajo').select('id_tarea').eq('id', id).single()

        const { error } = await supabaseAdmin
            .from('partes_de_trabajo')
            .update({ id_tarea: nuevoIdTarea })
            .eq('id', id)
            .eq('estado', 'proyectado')

        if (error) return { ok: false, error: error.message }

        revalidar()
        if (parte) await syncProximaFechaTarea(parte.id_tarea)
        await syncProximaFechaTarea(nuevoIdTarea)

        return { ok: true }
    } catch (e: any) {
        return { ok: false, error: e.message || 'error inesperado' }
    }
}

/**
 * eliminar un parte (solo si no esta liquidado)
 */
export async function eliminarParte(id: number): Promise<ToolResult> {
    // ... (omitiendo contenido para brevedad del replace si es posible, pero debo mantener la estructura)
    try {
        const user = await validateSessionAndGetUser()

        const { data: parte } = await supabaseAdmin
            .from('partes_de_trabajo')
            .select('id, liquidado, id_trabajador, id_tarea, fecha')
            .eq('id', id)
            .single()

        if (!parte) return { ok: false, error: 'parte no encontrado' }
        if (parte.liquidado) return { ok: false, error: 'no se puede eliminar un parte liquidado' }

        if (user.rol === 'trabajador' && parte.id_trabajador !== user.id) {
            return { ok: false, error: 'no puedes eliminar partes de otros trabajadores' }
        }

        if (!enVentanaPermitida(parte.fecha)) {
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

/**
 * actualizar un parte existente (permite cambiar tipo de jornada)
 */
export async function actualizarParte(id: number, cambios: {
    tipo_jornada?: 'dia_completo' | 'medio_dia'
    id_tarea?: number
}): Promise<ToolResult> {
    try {
        const user = await validateSessionAndGetUser()

        const { data: parte } = await supabaseAdmin
            .from('partes_de_trabajo')
            .select('*')
            .eq('id', id)
            .single()

        if (!parte) return { ok: false, error: 'registro no encontrado' }
        if (parte.liquidado) return { ok: false, error: 'no se puede editar un registro ya liquidado' }

        if (user.rol !== 'admin' && user.rol !== 'supervisor' && parte.id_trabajador !== user.id) {
            return { ok: false, error: 'no tienes permiso para editar este registro' }
        }

        if (!enVentanaPermitida(parte.fecha)) {
            return { ok: false, error: 'fuera de la ventana de edicion' }
        }

        const { error } = await supabaseAdmin
            .from('partes_de_trabajo')
            .update({
                ...cambios,
                id_registrador: user.id
            })
            .eq('id', id)

        if (error) return { ok: false, error: error.message }

        revalidar()
        return { ok: true }
    } catch (e: any) {
        return { ok: false, error: e.message || 'error inesperado' }
    }
}

/**
 * agendar multiple dias para una tarea (wizard)
 * permite sembrar varios proyectados de una vez
 */
export async function agendarTareaMultiDia(ctx: {
    id_tarea: number
    id_trabajador: string
    fechas: { fecha: string; tipo_jornada: 'dia_completo' | 'medio_dia' }[]
}): Promise<ToolResult> {
    try {
        const user = await validateSessionAndGetUser()
        if (user.rol !== 'admin' && user.rol !== 'supervisor') {
            return { ok: false, error: 'solo supervisores y admins pueden agendar' }
        }

        if (!ctx.fechas.length) return { ok: false, error: 'no hay fechas seleccionadas' }

        // Validar que el id_trabajador sea un UUID válido
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!ctx.id_trabajador || !uuidRegex.test(ctx.id_trabajador)) {
            return { ok: false, error: 'Debe seleccionar un trabajador válido para agendar' }
        }

        // preparar inserts
        const inserts = ctx.fechas.map(f => ({
            id_tarea: ctx.id_tarea,
            id_trabajador: ctx.id_trabajador,
            fecha: f.fecha,
            tipo_jornada: f.tipo_jornada,
            id_registrador: user.id,
            estado: 'proyectado',
        }))

        // insertar en batch. nota: si hay conflicto de fecha/trabajador en algun item, fallará todo (transaccional)
        const { data, error } = await supabaseAdmin
            .from('partes_de_trabajo')
            .insert(inserts)
            .select('id')

        if (error) {
            if (error.code === '23505') return { ok: false, error: 'alguna de las fechas ya está agendada para este trabajador y tarea' }
            return { ok: false, error: error.message }
        }

        revalidar()
        await syncProximaFechaTarea(ctx.id_tarea)
        return { ok: true, data }
    } catch (e: any) {
        return { ok: false, error: e.message || 'error inesperado' }
    }
}

/**
 * registrar partes de trabajo en batch (multiples trabajadores para una misma tarea/fecha)
 * herramienta premium para supervisores
 */
export async function registrarParteBatch(ctx: ToolContext & {
    id_tarea: number
    ids_trabajadores: string[]
    fecha: string
    tipo_jornada: 'dia_completo' | 'medio_dia'
}): Promise<ToolResult> {
    try {
        const user = await validateSessionAndGetUser()
        if (user.rol !== 'admin' && user.rol !== 'supervisor') {
            return { ok: false, error: 'rol no autorizado para registro masivo' }
        }

        if (!enVentanaPermitida(ctx.fecha)) {
            return { ok: false, error: 'fuera de la ventana permitida' }
        }

        const inserts = ctx.ids_trabajadores.map(id_trabajador => ({
            id_tarea: ctx.id_tarea,
            id_trabajador,
            fecha: ctx.fecha,
            tipo_jornada: ctx.tipo_jornada,
            id_registrador: user.id,
            estado: 'confirmado'
        }))

        const { data, error } = await supabaseAdmin
            .from('partes_de_trabajo')
            .insert(inserts)
            .select('id')

        if (error) {
            if (error.code === '23505') return { ok: false, error: 'alguno de los trabajadores ya tiene un registro en esta fecha/tarea' }
            return { ok: false, error: error.message }
        }

        revalidar()
        return { ok: true, data }
    } catch (e: any) {
        return { ok: false, error: e.message || 'error inesperado' }
    }
}

/**
 * Registro masivo multi-fecha y multi-trabajador con UPSERT Inteligente
 * El Motor Inmortal de "La Tira del Tiempo" Dual
 */
export async function registrarParteMultiFecha(ctx: ToolContext & {
    id_tarea: number
    ids_trabajadores: string[]
    fechas: string[]
    tipo_jornada: 'dia_completo' | 'medio_dia'
    id_registrador?: string
}): Promise<ToolResult> {
    try {
        const user = await validateSessionAndGetUser()
        const registradorFinal = ctx.id_registrador || user.id

        // 1. Validar ventana de gracia
        const fechasInvalidas = ctx.fechas.filter(f => !enVentanaPermitida(f))
        if (fechasInvalidas.length > 0) {
            return { ok: false, error: 'algunas fechas están fuera de la ventana permitida' }
        }

        // 2. Extraer el estado actual de la BD para estos trabajadores en estas fechas en TODAS las tareas
        const { data: registrosExistentes, error: errExistentes } = await supabaseAdmin
            .from('partes_de_trabajo')
            .select('id, id_tarea, id_trabajador, fecha, tipo_jornada')
            .in('id_trabajador', ctx.ids_trabajadores)
            .in('fecha', ctx.fechas)

        if (errExistentes) throw errExistentes

        // 3. Preparar lotes de inserción y actualización
        const insertsNuevos: any[] = []
        const updatesACompleto: number[] = []

        ctx.ids_trabajadores.forEach(id_trabajador => {
            ctx.fechas.forEach(fecha => {

                // Buscar si este trabajador ya tiene algo este día
                const registrosDelDia = registrosExistentes?.filter(r => r.id_trabajador === id_trabajador && r.fecha === fecha) || []

                // Calcular "ocupación global" del día
                let ocupacionGlobal = 0
                registrosDelDia.forEach(r => ocupacionGlobal += (r.tipo_jornada === 'dia_completo' ? 1.0 : 0.5))

                // Buscar específicamente si ya tiene registro en ESTA tarea hoy
                const registroEstaTarea = registrosDelDia.find(r => r.id_tarea === ctx.id_tarea)

                if (registroEstaTarea) {
                    // YA HAY REGISTRO EN ESTA MISMA TAREA
                    if (registroEstaTarea.tipo_jornada === 'dia_completo') {
                        // Ignorar: ya está al 100% aquí
                    } else if (registroEstaTarea.tipo_jornada === 'medio_dia') {
                        // Es medio dia. Si intentan meter otro (o un completo), hacemos UPGRADE a completo
                        updatesACompleto.push(registroEstaTarea.id)
                    }
                } else {
                    // NO HAY REGISTRO EN ESTA TAREA AÚN
                    if (ocupacionGlobal < 1.0) {
                        // Tiene hueco, creamos nuevo registro.
                        // (Si pide dia_completo pero solo le cabe 0.5, por diseño de la UI le permitimos insertar medio... 
                        //  pero aquí simplificamos: insertamos lo que pide, y si da > 1.0, el UI debió prevenirlo grisándolo).
                        insertsNuevos.push({
                            id_tarea: ctx.id_tarea,
                            id_trabajador,
                            fecha,
                            tipo_jornada: ctx.tipo_jornada,
                            id_registrador: registradorFinal,
                            estado: 'confirmado'
                        })
                    } else {
                        // Ya tiene 1.0 en otras tareas conjugadas. Ignorar silenciosamente (UI debió bloquear).
                    }
                }
            })
        })

        // 4. Ejecutar Upgrades de forma silenciosa (si el user seleccionó medio dia sobre medio dia)
        if (updatesACompleto.length > 0) {
            const { error: errUp } = await supabaseAdmin
                .from('partes_de_trabajo')
                .update({ tipo_jornada: 'dia_completo', id_registrador: registradorFinal })
                .in('id', updatesACompleto)
            if (errUp) throw errUp
        }

        // 5. Ejecutar Inserciones Nuevas
        if (insertsNuevos.length > 0) {
            console.log(`[UPSERT-GOD] Insertando ${insertsNuevos.length} registros nuevos`)
            const { error: errIn } = await supabaseAdmin
                .from('partes_de_trabajo')
                .insert(insertsNuevos)
            if (errIn) throw errIn
        }

        revalidar()

        // Retornar feedback inteligente
        let feedback = "Jornadas procesadas correctamente"
        if (insertsNuevos.length > 0 && updatesACompleto.length > 0) {
            feedback = `✅ Registrados ${insertsNuevos.length} nuevos y completados ${updatesACompleto.length} medios días`
        } else if (updatesACompleto.length > 0 && insertsNuevos.length === 0) {
            feedback = `✅ Se actualizaron ${updatesACompleto.length} medios días a días completos`
        } else if (insertsNuevos.length > 0 && updatesACompleto.length === 0) {
            feedback = `✅ Registradas ${insertsNuevos.length} jornadas`
        } else {
            feedback = "⚠️ No hubo cambios: Los días seleccionados ya están completos (1.0) para este personal."
        }

        return { ok: true, data: { msg: feedback, isUpsert: true, inserts: insertsNuevos.length, upgrades: updatesACompleto.length } }
    } catch (e: any) {
        return { ok: false, error: e.message || 'error inesperado' }
    }
}
