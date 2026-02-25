import { supabaseAdmin } from '@/lib/supabase-admin'
import { ActividadMaestra } from '@/lib/types/god-mode'

/**
 * GASTOS LOADER v110.0 (Modo Dios)
 * Usa la Súper Vista Maestra para centralizar gastos y jornales.
 */

export async function getGastosData(userId: string, userRol: string) {
    // 1. Consulta Maestra unificada (Solo pendientes de liquidar)
    let actividadQuery = supabaseAdmin
        .from('vista_actividad_maestra_god_mode')
        .select('*')
        .eq('liquidado', false)

    // Aplicar Filtros de Seguridad (Modo Dios)
    if (userRol === 'trabajador') {
        actividadQuery = actividadQuery.eq('id_usuario', userId)
    } else if (userRol === 'supervisor') {
        // En Modo Dios, el supervisor ve lo suyo Y lo de sus tareas asignadas
        actividadQuery = actividadQuery.or(`id_usuario.eq.${userId},id_supervisor.eq.${userId}`)
    }
    // admin: ve todo

    // 2. Ejecutar consultas en paralelo para velocidad
    const [actividadResponse, liquidacionResponse, tareasPromise] = await Promise.all([
        actividadQuery.order('fecha', { ascending: false }),
        supabaseAdmin
            .from('liquidaciones_trabajadores')
            .select('gastos_reembolsados, created_at, total_pagar')
            .eq('id_trabajador', userId)
            .order('created_at', { ascending: false })
            .limit(1),
        (userRol === 'trabajador')
            ? supabaseAdmin.from('trabajadores_tareas').select('tareas(id, titulo, code, finalizada)').eq('id_trabajador', userId)
            : (userRol === 'supervisor')
                ? supabaseAdmin.from('supervisores_tareas').select('tareas(id, titulo, code, finalizada)').eq('id_supervisor', userId)
                : supabaseAdmin.from('tareas').select('id, titulo, code').eq('finalizada', false).order('titulo')
    ])

    const actividadResult = (actividadResponse.data || []) as ActividadMaestra[]
    const lastLiquidation = liquidacionResponse.data?.[0] || null

    // 3. Separar por tipo para mantener compatibilidad con la UI actual
    const gastos = actividadResult
        .filter(a => a.tipo_evento === 'GASTO')
        .map(a => ({
            ...a,
            fecha_gasto: a.fecha, // Compatibilidad con GastoCompleto
            titulo_tarea: a.titulo_tarea,
            code_tarea: a.codigo_tarea
        }))

    const jornalesConSalario = actividadResult
        .filter(a => a.tipo_evento === 'JORNAL')
        .map(a => ({
            ...a,
            salario_diario: (a.monto / (a.detalle_tipo === 'medio_dia' ? 0.5 : 1)), // Revertir para UI si es necesario
            code_tarea: a.codigo_tarea
        }))

    // 4. Procesar tareas para el formulario
    const tareasData = (userRol === 'trabajador' || userRol === 'supervisor')
        ? (tareasPromise.data?.map((item: any) => item.tareas).filter((t: any) => t && t.finalizada === false) || [])
        : (tareasPromise.data || [])

    return {
        gastos,
        jornalesConSalario,
        lastLiquidation,
        tareas: tareasData,
    }
}
