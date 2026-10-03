import { supabaseAdmin } from "@/lib/supabase-admin"

export type BalanceTareaDTO = {
    id_tarea: number
    codigo_tarea: string
    titulo_tarea: string
    fecha_tarea: string
    tarea_finalizada: boolean
    id_edificio: number
    nombre_edificio: string
    id_administrador: number
    nombre_administrador: string
    id_supervisor: string | null
    email_supervisor: string | null
    nombre_supervisor: string | null
    supervisor_es_propietario: boolean
    id_presupuesto_base: number | null
    codigo_presupuesto_base: string | null
    total_pb: number
    id_presupuesto_final: number | null
    codigo_presupuesto_final: string | null
    total_pf: number
    pf_aprobado: boolean | null
    id_liquidacion: number | null
    codigo_liquidacion: string | null
    fecha_liquidacion: string | null
    gastos_reales_liquidacion: number
    ganancia_neta_liquidacion: number
    ganancia_supervisor: number
    ganancia_admin: number
    total_transferido_supervisor: number
    hay_sobrecosto: boolean
    monto_sobrecosto: number
    total_factura_base: number
    total_ajustes_aprobados: number
    total_facturado_neto: number
    total_cobrado_real: number
    saldo_pendiente_factura: number
    margen_comercial_pf_pb: number
    ganancia_liquida_obra: number
}

export type BalanceSupervisorAgrupado = {
    id_supervisor: string
    email_supervisor: string
    nombre_supervisor: string
    es_propietario: boolean
    tareas_totales: number
    tareas_liquidadas: number
    total_pb: number
    gastos_reales: number
    ganancia_supervisor: number
    ganancia_admin: number
    sobrecostos_count: number
    monto_sobrecostos: number
    eficiencia_pct: number
}

export type BalanceAdministradorAgrupado = {
    id_administrador: number
    nombre_administrador: string
    total_obras: number
    facturas_pendientes_count: number
    total_pb: number
    total_pf: number
    total_facturado: number
    total_cobrado: number
    saldo_adeudado: number
    gastos_totales: number
    ganancia_supervisor_total: number
    ganancia_liquida: number
    ratio_cobranza_pct: number
}

export type AuditoriaForenseLogDTO = {
    id: number
    tabla_afectada: string
    id_registro: string
    operacion: 'UPDATE' | 'DELETE'
    datos_anteriores: any
    datos_nuevos: any
    usuario_id: string | null
    usuario_email: string | null
    created_at: string
}

export async function getAuditoriaBalancesData(): Promise<{
    balances: BalanceTareaDTO[]
    supervisores: BalanceSupervisorAgrupado[]
    administradores: BalanceAdministradorAgrupado[]
    logs: AuditoriaForenseLogDTO[]
}> {
    // 1. Cargar balances principales por tarea (1 fila por obra)
    const { data: rawBalances, error: errBalances } = await supabaseAdmin
        .from('vista_auditoria_admin_balances')
        .select('*')
        .order('fecha_tarea', { ascending: false })

    if (errBalances) {
        console.error("error al cargar vista_auditoria_admin_balances:", errBalances)
    }

    const balances: BalanceTareaDTO[] = (rawBalances || []).map((r: any) => ({
        id_tarea: r.id_tarea,
        codigo_tarea: r.codigo_tarea || `TAR-${r.id_tarea}`,
        titulo_tarea: r.titulo_tarea || 'sin titulo',
        fecha_tarea: r.fecha_tarea,
        tarea_finalizada: !!r.tarea_finalizada,
        id_edificio: r.id_edificio,
        nombre_edificio: r.nombre_edificio || 'sin edificio',
        id_administrador: r.id_administrador,
        nombre_administrador: r.nombre_administrador || 'sin administrador',
        id_supervisor: r.id_supervisor,
        email_supervisor: r.email_supervisor,
        nombre_supervisor: r.nombre_supervisor || r.email_supervisor || 'no asignado',
        supervisor_es_propietario: !!r.supervisor_es_propietario,
        id_presupuesto_base: r.id_presupuesto_base,
        codigo_presupuesto_base: r.codigo_presupuesto_base,
        total_pb: Number(r.total_pb) || 0,
        id_presupuesto_final: r.id_presupuesto_final,
        codigo_presupuesto_final: r.codigo_presupuesto_final,
        total_pf: Number(r.total_pf) || 0,
        pf_aprobado: r.pf_aprobado,
        id_liquidacion: r.id_liquidacion,
        codigo_liquidacion: r.codigo_liquidacion,
        fecha_liquidacion: r.fecha_liquidacion,
        gastos_reales_liquidacion: Number(r.gastos_reales_liquidacion) || 0,
        ganancia_neta_liquidacion: Number(r.ganancia_neta_liquidacion) || 0,
        ganancia_supervisor: Number(r.ganancia_supervisor) || 0,
        ganancia_admin: Number(r.ganancia_admin) || 0,
        total_transferido_supervisor: Number(r.total_transferido_supervisor) || 0,
        hay_sobrecosto: !!r.hay_sobrecosto,
        monto_sobrecosto: Number(r.monto_sobrecosto) || 0,
        total_factura_base: Number(r.total_factura_base) || 0,
        total_ajustes_aprobados: Number(r.total_ajustes_aprobados) || 0,
        total_facturado_neto: Number(r.total_facturado_neto) || 0,
        total_cobrado_real: Number(r.total_cobrado_real) || 0,
        saldo_pendiente_factura: Number(r.saldo_pendiente_factura) || 0,
        margen_comercial_pf_pb: Number(r.margen_comercial_pf_pb) || 0,
        ganancia_liquida_obra: Number(r.ganancia_liquida_obra) || 0
    }))

    // 2. Carga DIRECTA de Administradores sin duplicacion (desde vista_facturas_completa)
    const { data: rawFacturas } = await supabaseAdmin
        .from('vista_facturas_completa')
        .select('id, total, saldo_pendiente, total_pagado, id_administrador, nombre_edificio, pagada, total_ajustes')

    const { data: rawAdmins } = await supabaseAdmin
        .from('administradores')
        .select('id, nombre')
        .eq('estado', 'activo')
        .order('nombre')

    const { data: rawLiqs } = await supabaseAdmin
        .from('liquidaciones_nuevas')
        .select('id, id_tarea, gastos_reales, ganancia_supervisor, ganancia_admin, tareas(id_edificio, edificios(id_administrador))')

    const admMap = new Map<number, BalanceAdministradorAgrupado>();

    ;(rawAdmins || []).forEach((a: any) => {
        admMap.set(a.id, {
            id_administrador: a.id,
            nombre_administrador: a.nombre,
            total_obras: 0,
            facturas_pendientes_count: 0,
            total_pb: 0,
            total_pf: 0,
            total_facturado: 0,
            total_cobrado: 0,
            saldo_adeudado: 0,
            gastos_totales: 0,
            ganancia_supervisor_total: 0,
            ganancia_liquida: 0,
            ratio_cobranza_pct: 0
        })
    })

    // Sumar facturas por administrador
    ;(rawFacturas || []).forEach((f: any) => {
        if (!f.id_administrador || !admMap.has(f.id_administrador)) return
        const adm = admMap.get(f.id_administrador)!
        adm.total_obras += 1
        if (!f.pagada) {
            adm.facturas_pendientes_count += 1
        }
        const tot = Number(f.total) || 0
        const pag = Number(f.total_pagado) || 0
        const sald = Number(f.saldo_pendiente) || 0
        adm.total_facturado += tot
        adm.total_cobrado += pag
        adm.saldo_adeudado += sald
    })

    // Sumar gastos directos y ganancias de supervisor por administrador
    ;(rawLiqs || []).forEach((l: any) => {
        const idAdm = l.tareas?.edificios?.id_administrador
        if (idAdm && admMap.has(idAdm)) {
            const adm = admMap.get(idAdm)!
            adm.gastos_totales += Number(l.gastos_reales) || 0
            adm.ganancia_supervisor_total += Number(l.ganancia_supervisor) || 0
        }
    })

    const administradores: BalanceAdministradorAgrupado[] = Array.from(admMap.values())
        .filter(a => a.total_obras > 0 || a.total_facturado > 0)
        .map((a) => {
            const ratio = a.total_facturado > 0 
                ? Math.round((a.total_cobrado / a.total_facturado) * 100)
                : 0
            // Ganancia liquida real = cobrado menos gastos de obras
            const gananciaLiquida = a.total_cobrado - a.gastos_totales - a.ganancia_supervisor_total
            return {
                ...a,
                ganancia_liquida: gananciaLiquida,
                ratio_cobranza_pct: ratio
            }
        })
        .sort((a, b) => b.ganancia_liquida - a.ganancia_liquida)

    // 3. Carga DIRECTA de Supervisores sin duplicacion (desde liquidaciones_nuevas)
    const { data: rawSupers } = await supabaseAdmin
        .from('usuarios')
        .select('id, nombre, email, es_propietario')
        .eq('rol', 'supervisor')

    const { data: rawSuperTareas } = await supabaseAdmin
        .from('supervisores_tareas')
        .select('id_supervisor, id_tarea')

    const supMap = new Map<string, BalanceSupervisorAgrupado>()

    ;(rawSupers || []).forEach((s: any) => {
        const tareasCount = (rawSuperTareas || []).filter((st: any) => st.id_supervisor === s.id).length
        supMap.set(s.id, {
            id_supervisor: s.id,
            email_supervisor: s.email,
            nombre_supervisor: s.nombre || s.email,
            es_propietario: !!s.es_propietario,
            tareas_totales: tareasCount,
            tareas_liquidadas: 0,
            total_pb: 0,
            gastos_reales: 0,
            ganancia_supervisor: 0,
            ganancia_admin: 0,
            sobrecostos_count: 0,
            monto_sobrecostos: 0,
            eficiencia_pct: 0
        })
    })

    ;(rawLiqs || []).forEach((l: any) => {
        // Encontrar supervisor de la tarea
        const rel = (rawSuperTareas || []).find((st: any) => st.id_tarea === l.id_tarea)
        if (rel && supMap.has(rel.id_supervisor)) {
            const sup = supMap.get(rel.id_supervisor)!
            sup.tareas_liquidadas += 1
            sup.gastos_reales += Number(l.gastos_reales) || 0
            sup.ganancia_supervisor += Number(l.ganancia_supervisor) || 0
            sup.ganancia_admin += Number(l.ganancia_admin) || 0
        }
    })

    // Para total_pb de supervisores, sumar presupuestos_base de sus tareas liquidadas
    const { data: rawPBs } = await supabaseAdmin
        .from('presupuestos_base')
        .select('id_tarea, total')

    ;(rawPBs || []).forEach((pb: any) => {
        const rel = (rawSuperTareas || []).find((st: any) => st.id_tarea === pb.id_tarea)
        if (rel && supMap.has(rel.id_supervisor)) {
            const sup = supMap.get(rel.id_supervisor)!
            sup.total_pb += Number(pb.total) || 0
        }
    })

    const supervisores: BalanceSupervisorAgrupado[] = Array.from(supMap.values())
        .filter(s => s.tareas_totales > 0 || s.tareas_liquidadas > 0)
        .map((s) => {
            const eficiencia = s.total_pb > 0 
                ? Math.round(((s.total_pb - s.gastos_reales) / s.total_pb) * 100)
                : 0
            return {
                ...s,
                eficiencia_pct: eficiencia
            }
        })
        .sort((a, b) => b.ganancia_admin - a.ganancia_admin)

    // 4. Cargar ultimos logs de auditoria inmutable
    let logs: AuditoriaForenseLogDTO[] = []
    const { data: rawLogs, error: errLogs } = await supabaseAdmin
        .from('auditoria_forense_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

    if (!errLogs && rawLogs) {
        logs = rawLogs as AuditoriaForenseLogDTO[]
    }

    return {
        balances,
        supervisores,
        administradores,
        logs
    }
}
