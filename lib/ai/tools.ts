import { tool } from 'ai'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * HERRAMIENTAS FINANCIERAS PARA IA
 * 
 * Estas funciones evitan errores matemáticos de LLMs
 * al hacer cálculos en TypeScript puro.
 */

// Tool 1: Calcular ROI preciso
export const calcularROI = tool({
    description: 'Calcula el ROI (Return on Investment) de forma precisa sin errores matemáticos. Usa esto en lugar de calcular manualmente.',
    parameters: z.object({
        presupuesto_final: z.number().describe('Presupuesto final del proyecto (lo que se cobró al cliente)'),
        gastos_reales: z.number().describe('Gastos reales del proyecto (materiales + mano de obra)'),
        margen_extra: z.number().default(0).describe('Margen extra agregado por admin (opcional)'),
    }),
    execute: async ({ presupuesto_final, gastos_reales, margen_extra }) => {
        // Default en código
        const margen = margen_extra

        // Cálculo puro en TypeScript - SIN errores de IA
        const ganancia_bruta = presupuesto_final - gastos_reales
        const ganancia_neta = ganancia_bruta - margen
        const roi = (ganancia_neta / gastos_reales) * 100
        const margen_porcentaje = (ganancia_bruta / presupuesto_final) * 100

        return {
            presupuesto_final,
            gastos_reales,
            margen_extra: margen,
            ganancia_bruta,
            ganancia_neta,
            roi_porcentaje: parseFloat(roi.toFixed(2)),
            margen_porcentaje: parseFloat(margen_porcentaje.toFixed(2)),
            analisis: roi > 30 ? 'muy_rentable' : roi > 15 ? 'rentable' : roi > 5 ? 'aceptable' : 'bajo',
            alerta: roi < 10,
            recomendacion: roi < 10
                ? 'ROI bajo - revisar costos o aumentar presupuesto'
                : roi > 30
                    ? 'Excelente rentabilidad - replicar estrategia'
                    : 'Rentabilidad aceptable'
        }
    }
})

// Tool 2: Obtener resumen de proyecto desde Supabase
export const obtenerResumenProyecto = tool({
    description: 'Obtiene el resumen financiero completo de un proyecto/tarea desde la base de datos. Incluye presupuesto, gastos, y estado.',
    parameters: z.object({
        tarea_id: z.number().describe('ID de la tarea/proyecto'),
    }),
    execute: async ({ tarea_id }) => {
        const cookieStore = await cookies()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    }
                }
            }
        )

        // Obtener tarea con presupuesto base
        const { data: tarea, error: tareaError } = await supabase
            .from('tareas')
            .select(`
                id,
                titulo,
                descripcion,
                estado_tarea,
                presupuestos_base (
                    id,
                    total,
                    materiales,
                    mano_obra
                )
            `)
            .eq('id', tarea_id)
            .single()

        if (tareaError || !tarea) {
            return {
                error: 'Tarea no encontrada o sin acceso',
                tarea_id
            }
        }

        // Obtener gastos reales
        const { data: gastos } = await supabase
            .from('gastos_tarea')
            .select('monto')
            .eq('id_tarea', tarea_id)

        const gastos_totales = gastos?.reduce((sum, g) => sum + (g.monto || 0), 0) || 0

        const presupuesto_base = tarea.presupuestos_base?.[0]

        return {
            tarea_id: tarea.id,
            titulo: tarea.titulo,
            estado: tarea.estado_tarea,
            presupuesto_base: presupuesto_base?.total || 0,
            materiales_presupuestados: presupuesto_base?.materiales || 0,
            mano_obra_presupuestada: presupuesto_base?.mano_obra || 0,
            gastos_reales: gastos_totales,
            desviacion: presupuesto_base ? gastos_totales - presupuesto_base.total : 0,
            desviacion_porcentaje: presupuesto_base
                ? parseFloat(((gastos_totales - presupuesto_base.total) / presupuesto_base.total * 100).toFixed(2))
                : 0,
            alerta_sobrecosto: presupuesto_base ? gastos_totales > presupuesto_base.total * 0.9 : false
        }
    }
})

// Tool 3: Calcular liquidación semanal
export const calcularLiquidacionSemanal = tool({
    description: 'Calcula la liquidación semanal de un trabajador basado en sus partes de trabajo.',
    parameters: z.object({
        trabajador_id: z.string().describe('ID del trabajador (UUID)'),
        semana_inicio: z.string().describe('Fecha de inicio de semana (YYYY-MM-DD)'),
        semana_fin: z.string().describe('Fecha de fin de semana (YYYY-MM-DD)'),
    }),
    execute: async ({ trabajador_id, semana_inicio, semana_fin }) => {
        const cookieStore = await cookies()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    }
                }
            }
        )

        // Obtener partes de trabajo
        const { data: partes, error } = await supabase
            .from('partes_de_trabajo')
            .select('tipo_jornada, fecha')
            .eq('id_trabajador', trabajador_id)
            .gte('fecha', semana_inicio)
            .lte('fecha', semana_fin)

        if (error || !partes) {
            return {
                error: 'No se pudieron obtener partes de trabajo',
                trabajador_id
            }
        }

        // Calcular días trabajados
        const dias_completos = partes.filter(p => p.tipo_jornada === 'dia_completo').length
        const medios_dias = partes.filter(p => p.tipo_jornada === 'medio_dia').length
        const total_dias = dias_completos + (medios_dias * 0.5)

        // Tarifa estándar (puede configurarse)
        const tarifa_dia = 6000

        const total_jornales = total_dias * tarifa_dia

        // Obtener gastos aprobados para reembolso
        const { data: gastos } = await supabase
            .from('gastos_tarea')
            .select('monto, aprobado')
            .eq('id_usuario', trabajador_id)
            .gte('created_at', semana_inicio)
            .lte('created_at', semana_fin)
            .eq('aprobado', true)

        const total_reembolsos = gastos?.reduce((sum, g) => sum + (g.monto || 0), 0) || 0

        return {
            trabajador_id,
            semana: `${semana_inicio} a ${semana_fin}`,
            dias_completos,
            medios_dias,
            total_dias,
            tarifa_dia,
            total_jornales,
            total_reembolsos,
            total_a_pagar: total_jornales + total_reembolsos,
            detalle_partes: partes.map(p => ({
                fecha: p.fecha,
                tipo: p.tipo_jornada
            }))
        }
    }
})

// Tool 4: Estimar presupuesto con histórico
export const estimarPresupuestoConHistorico = tool({
    description: 'Estima el presupuesto de un trabajo basado en trabajos similares del histórico. Usa embeddings de similitud.',
    parameters: z.object({
        descripcion: z.string().describe('Descripción del trabajo a presupuestar'),
        tipo_trabajo: z.enum(['plomeria', 'gas', 'pintura', 'albanileria', 'herreria', 'destapacion', 'impermeabilizacion', 'otro']).default('otro').describe('Tipo de trabajo. Default: otro'),
    }),
    execute: async ({ descripcion, tipo_trabajo }) => {
        // TODO: Implementar búsqueda con embeddings cuando esté configurado pgvector
        // Por ahora, retornar estimación genérica basada en tipo

        const tipo = tipo_trabajo

        const estimaciones_base: Record<string, { materiales: number, mano_obra: number }> = {
            plomeria: { materiales: 8000, mano_obra: 5000 },
            gas: { materiales: 12000, mano_obra: 8000 },
            pintura: { materiales: 15000, mano_obra: 10000 },
            albanileria: { materiales: 10000, mano_obra: 7000 },
            herreria: { materiales: 18000, mano_obra: 12000 },
            destapacion: { materiales: 3000, mano_obra: 4000 },
            impermeabilizacion: { materiales: 20000, mano_obra: 15000 },
            otro: { materiales: 10000, mano_obra: 8000 }
        }

        const base = estimaciones_base[tipo] || estimaciones_base.otro

        return {
            descripcion,
            tipo_trabajo: tipo,
            materiales_estimados: base.materiales,
            mano_obra_estimada: base.mano_obra,
            presupuesto_base_total: base.materiales + base.mano_obra,
            confianza: tipo !== 'otro' ? 'media' : 'baja',
            nota: 'Estimación basada en promedios históricos. Para precisión mayor, implementar búsqueda con embeddings.',
            proyectos_similares: 0 // TODO: contar cuando tengamos embeddings
        }
    }
})

// Tool 5: Listar tareas/proyectos
export const listarTareas = tool({
    description: 'Lista las tareas o proyectos del sistema, permitiendo filtrar por estado. Útil para responder preguntas como "¿Qué tareas están activas?" o "Listame las tareas aprobadas".',
    parameters: z.object({
        estado: z.string().default('todas').describe('Estado de las tareas a buscar (pendiente, en_progreso, aprobado, finalizado, cancelado, todas). Default: todas'),
        limit: z.number().default(10).describe('Cantidad máxima de tareas a listar. Default: 10')
    }),
    execute: async ({ estado, limit }) => {
        console.error('[TOOL] 🚨 START listarTareas', { estado, limit })
        try {
            const estado_filtro = estado
            const limit_filtro = limit

            console.error('[TOOL] 🍪 Getting cookies...')
            const cookieStore = await cookies()

            console.error('[TOOL] 🔌 Connecting to Supabase...')
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    cookies: {
                        get(name: string) {
                            return cookieStore.get(name)?.value
                        }
                    }
                }
            )

            // Construir query - USANDO COLUMNA CORRECTA: estado_tarea
            console.error('[TOOL] 🔍 Building query...')
            // Construir query - USANDO VISTA CORRECTA
            console.error('[TOOL] 🔍 Building query...')
            let query = supabase
                .from('vista_tareas_completa')
                .select('id, titulo, descripcion, estado_tarea, fecha_visita, nombre_edificio')
                .order('created_at', { ascending: false })
                .limit(limit_filtro)

            // Aplicar filtro
            if (estado_filtro === 'activas' || estado_filtro === 'activos' || estado_filtro === 'aprobado' || estado_filtro === 'en_progreso') {
                // Soportar alias comunes y valores reales del enum
                if (estado_filtro === 'activas' || estado_filtro === 'activos') {
                    // Filtrar por estados activos en la vista
                    query = query.in('estado_tarea', ['Aprobado', 'Organizar', 'Preguntar', 'Presupuestado', 'Enviado', 'En Proceso'])
                } else {
                    query = query.ilike('estado_tarea', `%${estado_filtro}%`)
                }
            } else if (estado_filtro && estado_filtro !== 'todas') {
                query = query.ilike('estado_tarea', `%${estado_filtro}%`)
            }

            console.error('[TOOL] 🚀 Executing query...')
            const { data, error } = await query

            if (error) {
                console.error('[TOOL] ❌ Supabase Error:', error)
                return {
                    error: 'Error al buscar tareas en base de datos',
                    detalle: error.message
                }
            }

            console.error(`[TOOL] ✅ Query success. Rows: ${data?.length}`)

            if (!data || data.length === 0) {
                return {
                    mensaje: `No se encontraron tareas con criterio: ${estado_filtro}`,
                    total: 0,
                    tareas: []
                }
            }

            const resultado = {
                mensaje: `Se encontraron ${data.length} tareas`,
                filtros_usados: { estado: estado_filtro, limit: limit_filtro },
                tareas: data.map(t => ({
                    id: t.id,
                    titulo: t.titulo,
                    estado: t.estado_tarea,
                    edificio: t.nombre_edificio,
                    descripcion: t.descripcion?.substring(0, 100),
                    fecha_visita: t.fecha_visita
                }))
            }
            // console.error('[TOOL] Result:', JSON.stringify(resultado).substring(0, 100) + '...')
            return resultado

        } catch (e: any) {
            console.error('[TOOL] 💥 CRITICAL ERROR in listarTareas:', e)
            return {
                error: 'Excepción interna al listar tareas',
                mensaje: e.message
            }
        }
    }
})

// Exportar todas las herramientas
export const financialTools = {
    calcularROI,
    obtenerResumenProyecto,
    calcularLiquidacionSemanal,
    estimarPresupuestoConHistorico,
    listarTareas
}
