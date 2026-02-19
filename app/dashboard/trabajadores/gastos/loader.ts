import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * GASTOS LOADER v109.0 (Server-Side Data Loading)
 * Usa supabaseAdmin para bypassear RLS.
 * Carga datos role-based para la página de gastos.
 */

interface GastoCompleto {
    id: number
    id_tarea: number
    titulo_tarea: string
    code_tarea: string
    monto: number
    fecha_gasto: string
    liquidado: boolean
    id_usuario: string
    [key: string]: any
}

export async function getGastosData(userId: string, userRol: string) {
    // 1. Obtener IDs de tareas del supervisor (si aplica)
    let idsTareasSuper: number[] = []
    if (userRol === 'supervisor') {
        const { data: tareasSuper } = await supabaseAdmin
            .from('supervisores_tareas')
            .select('id_tarea')
            .eq('id_supervisor', userId)
        idsTareasSuper = (tareasSuper || []).map((t: any) => t.id_tarea)
    }

    // 2. Gastos no liquidados (filtrados por rol)
    let gastosQuery = supabaseAdmin
        .from('vista_gastos_tarea_completa')
        .select('*')
        .eq('liquidado', false)

    if (userRol === 'trabajador') {
        gastosQuery = gastosQuery.eq('id_usuario', userId)
    } else if (userRol === 'supervisor') {
        if (idsTareasSuper.length > 0) {
            const idsList = idsTareasSuper.join(',')
            gastosQuery = gastosQuery.or(`id_usuario.eq.${userId},id_tarea.in.(${idsList})`)
        } else {
            gastosQuery = gastosQuery.eq('id_usuario', userId)
        }
    }
    // admin: no filter, sees all

    // 3. Jornales pendientes (filtrados por rol)
    let jornalesQuery = supabaseAdmin
        .from('vista_partes_trabajo_completa')
        .select('*')
        .eq('liquidado', false)

    if (userRol === 'trabajador') {
        jornalesQuery = jornalesQuery.eq('id_trabajador', userId)
    } else if (userRol === 'supervisor') {
        if (idsTareasSuper.length > 0) {
            const idsList = idsTareasSuper.join(',')
            jornalesQuery = jornalesQuery.or(`id_trabajador.eq.${userId},id_tarea.in.(${idsList})`)
        } else {
            jornalesQuery = jornalesQuery.eq('id_trabajador', userId)
        }
    }

    // 4. Última liquidación
    const liquidacionQuery = supabaseAdmin
        .from('liquidaciones_trabajadores')
        .select('gastos_reembolsados, created_at, total_pagar')
        .eq('id_trabajador', userId)
        .order('created_at', { ascending: false })
        .limit(1)

    // 5. Tareas disponibles (según rol)
    let tareasPromise
    if (userRol === 'trabajador') {
        tareasPromise = supabaseAdmin
            .from('trabajadores_tareas')
            .select('tareas(id, titulo, code, finalizada)')
            .eq('id_trabajador', userId)
    } else if (userRol === 'supervisor') {
        tareasPromise = supabaseAdmin
            .from('supervisores_tareas')
            .select('tareas(id, titulo, code, finalizada)')
            .eq('id_supervisor', userId)
    } else {
        tareasPromise = supabaseAdmin
            .from('tareas')
            .select('id, titulo, code')
            .eq('finalizada', false)
            .order('titulo')
    }

    // Execute all queries in parallel
    const [gastosResponse, jornalesResponse, liquidacionResponse, tareasResponse] = await Promise.all([
        gastosQuery.order('fecha_gasto', { ascending: false }),
        jornalesQuery.order('fecha', { ascending: false }),
        liquidacionQuery,
        tareasPromise,
    ])

    const gastos = (gastosResponse.data || []) as GastoCompleto[]
    const jornalesRaw = jornalesResponse.data || []
    const lastLiquidation = liquidacionResponse.data?.[0] || null

    // Process tareas
    const tareasData = (userRol === 'trabajador' || userRol === 'supervisor')
        ? (tareasResponse.data?.map((item: any) => item.tareas).filter((t: any) => t && t.finalizada === false) || [])
        : (tareasResponse.data || [])

    // 6. Enrich jornales with salary data
    const trabajadorIds = [...new Set(jornalesRaw.map((j: any) => j.id_trabajador))]
    let configMap: Record<string, number> = {}

    if (trabajadorIds.length > 0) {
        const { data: configData } = await supabaseAdmin
            .from('configuracion_trabajadores')
            .select('id_trabajador, salario_diario')
            .in('id_trabajador', trabajadorIds)

        if (configData) {
            configMap = Object.fromEntries(configData.map(c => [c.id_trabajador, c.salario_diario]))
        }
    }

    const jornalesConSalario = jornalesRaw
        .filter((j: any) => configMap[j.id_trabajador])
        .map((j: any) => ({
            ...j,
            salario_diario: configMap[j.id_trabajador]
        }))

    return {
        gastos,
        jornalesConSalario,
        lastLiquidation,
        tareas: tareasData,
    }
}
