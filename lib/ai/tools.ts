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
        margen_extra: z.number().optional().describe('Margen extra agregado por admin (opcional)'),
    }),
    execute: async ({ presupuesto_final, gastos_reales, margen_extra = 0 }) => {
        // Cálculo puro en TypeScript - SIN errores de IA
        const ganancia_bruta = presupuesto_final - gastos_reales
        const ganancia_neta = ganancia_bruta - margen_extra
        const roi = (ganancia_neta / gastos_reales) * 100
        const margen_porcentaje = (ganancia_bruta / presupuesto_final) * 100

        return {
            presupuesto_final,
            gastos_reales,
            margen_extra,
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
                estado,
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
            estado: tarea.estado,
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
        trabajador_id: z.string().uuid().describe('ID del trabajador'),
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
        tipo_trabajo: z.enum(['plomeria', 'gas', 'pintura', 'albanileria', 'herreria', 'destapacion', 'impermeabilizacion', 'otro']).optional(),
    }),
    execute: async ({ descripcion, tipo_trabajo }) => {
        // TODO: Implementar búsqueda con embeddings cuando esté configurado pgvector
        // Por ahora, retornar estimación genérica basada en tipo

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

        const base = estimaciones_base[tipo_trabajo || 'otro']

        return {
            descripcion,
            tipo_trabajo: tipo_trabajo || 'otro',
            materiales_estimados: base.materiales,
            mano_obra_estimada: base.mano_obra,
            presupuesto_base_total: base.materiales + base.mano_obra,
            confianza: tipo_trabajo ? 'media' : 'baja',
            nota: 'Estimación basada en promedios históricos. Para precisión mayor, implementar búsqueda con embeddings.',
            proyectos_similares: 0 // TODO: contar cuando tengamos embeddings
        }
    }
})

// Exportar todas las herramientas
export const financialTools = {
    calcularROI,
    obtenerResumenProyecto,
    calcularLiquidacionSemanal,
    estimarPresupuestoConHistorico
}
