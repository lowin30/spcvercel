import { tool } from 'ai'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
    verAlertas,
    verMiEquipo,
    registrarParte,
    verMisPagos,
    verLiquidacionEquipo,
    crearPresupuestoBase
} from './additional-tools'
import { sanitizeText } from '@/lib/utils'

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

// HERRAMIENTA DE APRENDIZAJE (Cognitive Layer)
export const learn_term = tool({
    description: 'Call this tool when the user teaches you a new specific term, jargon, or preference. Use it to remember it forever.',
    parameters: z.object({
        term: z.string().describe('The specific word or phrase used by the user'),
        definition: z.string().describe('The meaning or mapping of that term in the system context'),
        context: z.string().optional().describe('When check this term (e.g. "lighting", "plumbing")')
    }),
    execute: async ({ term, definition, context }) => {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
        )

        try {
            const { error } = await supabase.from('user_vocabulary').upsert({
                term: term.toLowerCase(),
                definition,
                context,
                // user_id se asigna automáticamente por RLS o hay que inyectarlo si estamos server-side estricto
                // Pero la policy dice "stored user_id = auth.uid()", upsert requiere que el body machee.
                // Mejor insertamos asumiendo que el cliente supabase tiene la sesión.
            }, { onConflict: 'user_id, term' })

            if (error) throw error
            return `Aprendido: "${term}" significa "${definition}".`
        } catch (e: any) {
            return `Error aprendiendo término: ${e.message} `
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
    presupuestos_base(
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
// EXACTAMENTE como generar-liquidacion-dialog.tsx - Usa RPC calcular_liquidacion_semanal
export const calcularLiquidacionSemanal = tool({
    description: 'Calcula la liquidación semanal de un trabajador basado en sus partes de trabajo usando la función RPC de base de datos.',
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

        // Llamar a la RPC function de PostgreSQL (igual que generar-liquidacion-dialog.tsx)
        const { data, error } = await supabase.rpc('calcular_liquidacion_semanal', {
            p_trabajador_id: trabajador_id,
            p_fecha_inicio: semana_inicio,
            p_fecha_fin: semana_fin
        })

        if (error) {
            return {
                error: `Error al calcular liquidación: ${error.message}`,
                trabajador_id
            }
        }

        if (!data || data.length === 0) {
            return {
                error: 'No se encontraron datos para el período especificado',
                trabajador_id,
                semana: `${semana_inicio} a ${semana_fin}`
            }
        }

        const calculo = data[0]
        return {
            trabajador_id,
            semana: `${semana_inicio} a ${semana_fin}`,
            total_dias: calculo.total_dias,
            salario_base: calculo.salario_base,
            gastos_reembolsados: calculo.gastos_reembolsados,
            total_pagar: calculo.total_pagar,
            mensaje: `📊 Liquidación calculada: ${calculo.total_dias} días, Salario: $${calculo.salario_base.toLocaleString('es-AR')}, Gastos: $${calculo.gastos_reembolsados.toLocaleString('es-AR')}, Total: $${calculo.total_pagar.toLocaleString('es-AR')}`
        }
    }
})

// Tool 4: Estimar presupuesto con histórico
export const estimarPresupuestoConHistorico = tool({
    description: 'Estima el presupuesto de un trabajo basado en trabajos similares del histórico. Usa búsqueda por coincidencia de texto en título y descripción.',
    parameters: z.object({
        descripcion: z.string().describe('Descripción del trabajo a presupuestar'),
        tipo_trabajo: z.enum(['plomeria', 'gas', 'pintura', 'albanileria', 'herreria', 'destapacion', 'impermeabilizacion', 'otro']).default('otro').describe('Tipo de trabajo. Default: otro'),
    }),
    execute: async ({ descripcion, tipo_trabajo }) => {
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

        try {
            // Intentar buscar en histórico
            // console.log(`[AI-Estimate] Buscando histórico para: "${descripcion}"`)
            const { data, error } = await supabase.rpc('estimar_costo_tarea', { termino: descripcion })

            if (!error && data && data.length > 0 && data[0].count > 0) {
                const historico = data[0]
                // console.log('[AI-Estimate] Datos encontrados:', historico)

                return {
                    descripcion,
                    tipo_trabajo: tipo_trabajo,
                    materiales_estimados: Number(historico.avg_materiales),
                    mano_obra_estimada: Number(historico.avg_mano_obra),
                    presupuesto_base_total: Number(historico.avg_materiales) + Number(historico.avg_mano_obra),
                    confianza: 'alta',
                    nota: `Estimación basada en ${historico.count} trabajos similares encontrados en el historial. Rango: $${historico.min_total} - $${historico.max_total}`,
                    proyectos_similares: Number(historico.count),
                    source: 'historical_data'
                }
            }
        } catch (e) {
            console.error('[AI-Estimate] Error consultando histórico:', e)
        }

        // FALLBACK: Estimación genérica (Hardcoded)
        // console.log('[AI-Estimate] Fallback a estimación genérica')
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
            nota: 'Estimación basada en promedios genericos (no hay datos históricos suficientes).',
            proyectos_similares: 0,
            source: 'generic_fallback'
        }
    }
})

// Tool 5: Listar tareas/proyectos
export const listarTareas = tool({
    description: 'Lista las tareas o proyectos del sistema, permitiendo filtrar por estado. Útil para responder preguntas como "¿Qué tareas están activas?" o "Listame las tareas aprobadas".',
    parameters: z.object({
        estado: z.string().default('todas').describe('Estado de las tareas a buscar (pendiente, en_progreso, aprobado, finalizado, cancelado, todas). Default: todas'),
        termino_busqueda: z.string().optional().describe('Término de texto para buscar en título o descripción (ej: "baño", "5B", "plomería")'),
        limit: z.number().default(10).describe('Cantidad máxima de tareas a listar. Default: 10')
    }),
    execute: async ({ estado, termino_busqueda, limit }) => {
        console.error('[TOOL] 🚨 START listarTareas', { estado, termino_busqueda, limit })
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
            let query = supabase
                .from('vista_tareas_completa')
                .select('id, titulo, descripcion, estado_tarea, fecha_visita, nombre_edificio')
                .order('created_at', { ascending: false })
                .limit(limit_filtro)

            // Aplicar búsqueda por texto si existe
            if (termino_busqueda) {
                // Buscamos en titulo OR descripcion OR nombre_edificio
                // Sintaxis Supabase 'or': "col1.ilike.%term%,col2.ilike.%term%"
                const term = `%${termino_busqueda}%`
                query = query.or(`titulo.ilike.${term},descripcion.ilike.${term},nombre_edificio.ilike.${term}`)
            }

            // Aplicar filtro de estado
            if (estado_filtro === 'activas' || estado_filtro === 'activos' || estado_filtro === 'aprobado' || estado_filtro === 'en_progreso' || estado_filtro === 'pendientes') {
                // 'en_progreso' u 'activas' ahora buscan TODO lo que no esté finalizado/cancelado
                if (['activas', 'activos', 'en_progreso', 'pendientes'].includes(estado_filtro)) {
                    // Filtrar por estados activos en la vista
                    query = query.in('estado_tarea', ['Aprobado', 'Organizar', 'Preguntar', 'Presupuestado', 'Enviado', 'En Proceso'])
                } else {
                    query = query.ilike('estado_tarea', `% ${estado_filtro}% `)
                }
            } else if (estado_filtro && estado_filtro !== 'todas') {
                query = query.ilike('estado_tarea', `% ${estado_filtro}% `)
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

            console.error(`[TOOL] ✅ Query success.Rows: ${data?.length} `)

            if (!data || data.length === 0) {
                return {
                    mensaje: `No se encontraron tareas con criterio: ${estado_filtro} `,
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

// Tool 6: Obtener Contexto Unificado (AI Context Layer)
export const obtenerContextoUsuario = tool({
    description: 'Obtiene el contexto "Curado" para el usuario según su rol. Devuelve tareas, alertas y datos financieros relevantes sin ruido. USAR AL INICIO DE LA CONVERSACIÓN.',
    parameters: z.object({
        rol: z.enum(['admin', 'supervisor', 'trabajador']).describe('Rol del usuario actual'),
        email: z.string().optional().describe('Email del usuario para filtrar tareas propias'),
    }),
    execute: async ({ rol, email }) => {
        console.log('[TOOL] 🔍 obtenerContextoUsuario CALLED:', { rol, email })

        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
        )

        // Debug: Ver qué usuario está autenticado
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        console.log('[TOOL] Auth User:', user?.id, user?.email, authError?.message)

        let query;
        let vista = '';

        // Estrategia de Selección de Vista Maestra
        if (rol === 'admin') {
            vista = 'v_ai_context_admin'
            query = supabase.from(vista).select('*')
        } else if (rol === 'supervisor') {
            vista = 'v_ai_context_supervisor'
            query = supabase.from(vista).select('*')
        } else {
            vista = 'v_ai_context_trabajador'
            query = supabase.from(vista).select('*')
        }

        console.log('[TOOL] Querying vista:', vista)
        const { data, error } = await query

        console.log('[TOOL] Result:', {
            vista,
            rowCount: data?.length || 0,
            error: error?.message,
            firstRow: data?.[0] ? Object.keys(data[0]) : null
        })

        if (error) return { error: `Error cargando contexto de ${rol} `, detalle: error.message }

        return {
            tipo_contexto: rol,
            timestamp: new Date().toISOString(),
            datos: data,
            nota: "Estos son los ÚNICOS datos relevantes para este usuario. Úsalos para responder."
        }
    }
})

// ==============================================================================
// MUTATION TOOLS - "CONTROL TOTAL" (Admin/Supervisor Actions)
// ==============================================================================

// Tool: Administrar Presupuesto (Aprobar/Rechazar)
export const administrarPresupuesto = tool({
    description: 'ADMIN ONLY: Aprueba o rechaza un presupuesto final. Si se aprueba, genera automáticamente las facturas (separadas en Material y Mano de Obra). Replica la lógica de convertirPresupuestoADosFacturas.',
    parameters: z.object({
        presupuesto_id: z.number().describe('ID del presupuesto final a administrar'),
        accion: z.enum(['aprobar', 'rechazar']).describe('Acción a realizar'),
        motivo: z.string().optional().describe('Motivo de rechazo (requerido si accion=rechazar)'),
    }),
    execute: async ({ presupuesto_id, accion, motivo }) => {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        // 1. Verificar rol de admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.user_metadata?.rol || user.user_metadata.rol !== 'admin') {
            return { success: false, error: 'Permiso denegado: Solo administradores pueden gestionar presupuestos.' };
        }

        if (accion === 'rechazar') {
            if (!motivo) {
                return { success: false, error: 'El motivo es obligatorio para rechazar.' };
            }
            const { error } = await supabase
                .from('presupuestos_finales')
                .update({ aprobado: false, observaciones_rechazo: motivo })
                .eq('id', presupuesto_id);

            if (error) return { success: false, error: error.message };
            return { success: true, mensaje: `Presupuesto ${presupuesto_id} rechazado.` };
        }

        // 2. APROBAR: Lógica compleja de facturación
        try {
            const { data: presupuesto, error: presupError } = await supabase
                .from('presupuestos_finales')
                .select('*, tareas:id_tarea(id, titulo, edificios:id_edificio(nombre))')
                .eq('id', presupuesto_id)
                .single();

            if (presupError || !presupuesto) {
                return { success: false, error: 'Presupuesto no encontrado.' };
            }

            const { data: existentes } = await supabase
                .from('facturas')
                .select('id')
                .eq('id_presupuesto_final', presupuesto_id)
                .limit(1);

            if (existentes && existentes.length > 0) {
                return { success: false, error: 'Este presupuesto ya tiene facturas asociadas.' };
            }

            const { data: items, error: itemsError } = await supabase
                .from('items')
                .select('*')
                .eq('id_presupuesto', presupuesto_id);

            if (itemsError || !items || items.length === 0) {
                return { success: false, error: 'No hay ítems para facturar.' };
            }

            const itemsRegulares = items.filter(item => !item.es_material);
            const itemsMateriales = items.filter(item => item.es_material === true);

            const totalRegular = itemsRegulares.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
            const totalMaterial = itemsMateriales.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);

            const crearFacturaRegular = itemsRegulares.length > 0;
            const crearFacturaMaterial = itemsMateriales.length > 0;

            if (!crearFacturaRegular && !crearFacturaMaterial) {
                return { success: false, error: 'No hay ítems válidos para facturar.' };
            }

            const { data: tareaData } = await supabase
                .from('vista_tareas_completa')
                .select('id_administrador')
                .eq('id', presupuesto.id_tarea)
                .single();

            if (!tareaData || !tareaData.id_administrador) {
                return { success: false, error: 'No se pudo determinar el administrador de la tarea.' };
            }

            const idAdministrador = tareaData.id_administrador;
            const fechaActual = new Date();
            const datosComunes = {
                id_presupuesto_final: presupuesto.id,
                id_presupuesto: presupuesto.id_presupuesto_base,
                fecha_vencimiento: new Date(fechaActual.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                id_administrador: idAdministrador,
                tiene_ajustes: false,
                ajustes_aprobados: false,
                created_at: new Date().toISOString(),
                id_estado_nuevo: 1
            };

            const nombreBase = presupuesto.tareas?.titulo || `Presupuesto ${presupuesto.code} `;
            let facturaRegularId = null;
            let facturaMaterialId = null;

            if (crearFacturaRegular) {
                const { data: facturaR, error: facturaRError } = await supabase
                    .from('facturas')
                    .insert({
                        ...datosComunes,
                        total: Math.round(totalRegular),
                        saldo_pendiente: totalRegular,
                        total_pagado: 0,
                        nombre: nombreBase
                    })
                    .select()
                    .single();

                if (facturaRError) throw new Error(`Error creando factura regular: ${facturaRError.message} `);
                facturaRegularId = facturaR.id;

                for (const item of itemsRegulares) {
                    await supabase.from('items_factura').insert({
                        id_factura: facturaRegularId,
                        cantidad: item.cantidad || 1,
                        precio_unitario: item.precio || 0,
                        subtotal_item: (item.cantidad || 1) * (item.precio || 0),
                        descripcion: item.descripcion || 'Sin descripción',
                        producto_id: item.producto_id || null,
                        es_material: false,
                        created_at: new Date().toISOString()
                    });
                }
            }

            if (crearFacturaMaterial) {
                const { data: facturaM, error: facturaMError } = await supabase
                    .from('facturas')
                    .insert({
                        ...datosComunes,
                        total: Math.round(totalMaterial),
                        saldo_pendiente: totalMaterial,
                        total_pagado: 0,
                        nombre: `${nombreBase} material`
                    })
                    .select()
                    .single();

                if (facturaMError) throw new Error(`Error creando factura materiales: ${facturaMError.message} `);
                facturaMaterialId = facturaM.id;

                for (const item of itemsMateriales) {
                    await supabase.from('items_factura').insert({
                        id_factura: facturaMaterialId,
                        cantidad: item.cantidad || 1,
                        precio_unitario: item.precio || 0,
                        subtotal_item: (item.cantidad || 1) * (item.precio || 0),
                        descripcion: item.descripcion || 'Sin descripción',
                        producto_id: item.producto_id || null,
                        es_material: true,
                        created_at: new Date().toISOString()
                    });
                }
            }

            await supabase
                .from('presupuestos_finales')
                .update({ aprobado: true })
                .eq('id', presupuesto_id);

            return {
                success: true,
                mensaje: `Presupuesto aprobado.${facturaRegularId ? 'Factura Regular: ' + facturaRegularId : ''} ${facturaMaterialId ? 'Factura Material: ' + facturaMaterialId : ''} `,
                facturas_creadas: { regular: facturaRegularId, material: facturaMaterialId }
            };

        } catch (error: any) {
            return { success: false, error: `Error al aprobar: ${error.message} ` };
        }
    }
});

// Tool: Editar Tarea (Activa Wizard en Mod Edit)
export const editar_tarea = tool({
    description: 'Abre el asistente de EDICIÓN de tarea en el chat. Usar cuando el usuario quiera modificar una tarea existente.',
    parameters: z.object({
        taskId: z.number().describe('ID de la tarea a editar'),
        titulo: z.string().optional().describe('Nuevo título sugerido'),
        descripcion: z.string().optional().describe('Nueva descripción sugerida'),
        prioridad: z.enum(['baja', 'media', 'alta']).optional().describe('Nueva prioridad sugerida')
    }),
    execute: async ({ taskId, titulo, descripcion, prioridad }) => {
        // Esta tool NO toca la DB. Retorna instrucciones para el ChatWidget.
        return {
            action: 'open_wizard',
            mode: 'edit',
            taskId,
            initialData: {
                titulo,
                descripcion,
                prioridad
            }
        }
    }
})

// Tool: Clonar Tarea (Abre Wizard con datos precargados)
export const clonar_tarea = tool({
    description: 'Clona una tarea existente. Abre el asistente de CREACIÓN pre-llenado con los datos de la tarea original. Usar cuando el usuario quiera copiar o clonar.',
    parameters: z.object({
        taskId: z.number().describe('ID de la tarea a clonar'),
    }),
    execute: async ({ taskId }) => {
        return {
            action: 'open_wizard',
            mode: 'clone', // Special mode to signal fetch & pre-fill
            taskId
        }
    }
})

// Tool: Crear Edificio (Abre BuildingWizard)
export const crear_edificio = tool({
    description: 'Abre el asistente para crear un NUEVO edificio. Si el usuario proporciona una URL de mapa, pásala.',
    parameters: z.object({
        mapa_url: z.string().optional().describe('URL de Google Maps si el usuario la proporciona'),
    }),
    execute: async ({ mapa_url }) => {
        return {
            action: 'open_building_wizard',
            mode: 'create',
            initialData: { mapa_url }
        }
    }
})

// Tool: Editar Edificio
export const editar_edificio = tool({
    description: 'Abre el asistente para EDITAR un edificio existente.',
    parameters: z.object({
        id: z.number().describe('ID del edificio a editar'),
    }),
    execute: async ({ id }) => {
        return {
            action: 'open_building_wizard',
            mode: 'edit',
            id
        }
    }
})

// Tool: Crear Tarea
export const crearTarea = tool({
    description: 'Crea una nueva tarea usando el RPC crear_tarea_con_asignaciones. Permite asignar supervisor, trabajadores y múltiples departamentos.',
    parameters: z.object({
        titulo: z.string().describe('Título de la tarea'),
        descripcion: z.string().describe('Descripción detallada'),
        id_edificio: z.number().describe('ID del edificio'),
        id_administrador: z.number().optional().describe('ID del administrador (se infiere del edificio si no se especifica)'),
        prioridad: z.enum(['baja', 'media', 'alta']).default('media').describe('Prioridad de la tarea'),
        id_estado_nuevo: z.number().default(1).describe('ID del estado inicial (1=Organizar)'),
        departamentos_ids: z.array(z.number()).optional().describe('Lista de IDs de departamentos a asociar'),
        id_supervisor: z.string().optional().describe('UUID del supervisor'),
        id_asignado: z.string().optional().describe('UUID del trabajador asignado'),
        fecha_visita: z.string().optional().describe('Fecha de visita (formato ISO)'),
    }),
    execute: async (params) => {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        try {
            let adminId = params.id_administrador;
            if (!adminId) {
                const { data: edificio } = await supabase
                    .from('edificios')
                    .select('id_administrador')
                    .eq('id', params.id_edificio)
                    .single();

                if (edificio) adminId = edificio.id_administrador;
            }

            if (!adminId) {
                return { success: false, error: 'No se pudo determinar el administrador.' };
            }

            const { data: newTaskId, error } = await supabase.rpc('crear_tarea_con_asignaciones', {
                p_titulo: sanitizeText(params.titulo),
                p_descripcion: sanitizeText(params.descripcion),
                p_id_edificio: params.id_edificio,
                p_id_administrador: adminId,
                p_prioridad: params.prioridad,
                p_id_estado_nuevo: params.id_estado_nuevo,
                p_fecha_visita: params.fecha_visita || null,
                p_departamentos_ids: params.departamentos_ids || [],
                p_id_supervisor: params.id_supervisor || null,
                p_id_trabajador: params.id_asignado || null
            });

            if (error) return { success: false, error: error.message };

            return { success: true, mensaje: `Tarea creada con ID: ${newTaskId} `, tarea_id: newTaskId };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
});

// Tool: Crear Departamento (Visual Interface)
export const crear_departamento = tool({
    description: '🔴 INVOCA ESTA HERRAMIENTA REALMENTE. No respondas con texto diciendo que lo hiciste. ACTIVA la interfaz visual llamando a esta función. Si no tienes el ID del edificio, llámala sin parámetros (id_edificio: undefined).',
    parameters: z.object({
        id_edificio: z.number().optional().describe('ID del edificio. Opcional. Si se omite, se abrirá el selector.'),
    }),
    execute: async ({ id_edificio }) => {
        console.log('[TOOL] crear_departamento invocado', { id_edificio })
        return {
            action: 'open_department_wizard',
            mode: 'create',
            initialData: { id_edificio: id_edificio },
            info: `✅ Interfaz desplegada. PARA QUE EL USUARIO LA VEA, TU RESPUESTA FINAL DEBE INCLUIR: <tool_code>${JSON.stringify({ tool: "crear_departamento", args: { id_edificio: id_edificio ?? null } })}</tool_code>`
        };
    }
})

// Tool: Buscar Edificios
export const buscar_edificios = tool({
    description: 'Busca edificios por Nombre (o Título) y Dirección. Utiliza lógica difusa e inteligente para encontrar coincidencias incluso con errores ortográficos o términos parciales. Retorna ID y nombre. Útil para obtener el ID antes de crear departamentos.',
    parameters: z.object({
        termino: z.string().describe('Término de búsqueda (ej: "Ohigins 2470", "Edificio Centro"). Busca en Nombre y Dirección.'),
    }),
    execute: async ({ termino }) => {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
        );

        // 1. Intento Exacto/Fuzzy normal
        let { data, error } = await supabase
            .from('edificios')
            .select('id, nombre, direccion')
            .or(`nombre.ilike.%${termino}%,direccion.ilike.%${termino}%`)
            .limit(5);

        // 2. Fallback: Si no hay resultados y hay números (ej: dirección exacta), buscar por el número
        if ((!data || data.length === 0) && /\d+/.test(termino)) {
            const numbers = termino.match(/\d+/g);
            if (numbers) {
                const numberTerm = numbers.join('%'); // "2740"
                const { data: dataByNum } = await supabase
                    .from('edificios')
                    .select('id, nombre, direccion')
                    .ilike('direccion', `%${numberTerm}%`)
                    .limit(5);

                if (dataByNum && dataByNum.length > 0) {
                    data = dataByNum;
                }
            }
        }

        // 3. Fallback: Split terms (Búsqueda "Super Inteligente" palabra por palabra)
        if (!data || data.length === 0) {
            const parts = termino.split(/\s+/).filter(p => p.length > 2); // Palabras > 2 letras
            if (parts.length > 0) {
                // Construir query OR gigante: nombre.ilike.%w1%, direccion.ilike.%w1%, ...
                // Nota: Supabase permite filtros OR anidados pero stringificados es más fácil aquí.
                const conditions = parts.map(p => `nombre.ilike.%${p}%,direccion.ilike.%${p}%`).join(',');

                const { data: dataBroad } = await supabase
                    .from('edificios')
                    .select('id, nombre, direccion')
                    .or(conditions)
                    .limit(5);

                if (dataBroad && dataBroad.length > 0) {
                    data = dataBroad;
                }
            }
        }

        // 4. Fallback FINAL: Búsqueda Fuzzy en JS (fetch all candidates)
        if (!data || data.length === 0) {
            console.log('[BUSCAR_EDIFICIOS] Fallback JS Fuzzy activado para:', termino);
            const { data: allEdificios } = await supabase
                .from('edificios')
                .select('id, nombre, direccion')
                .limit(50); // Traemos un lote razonable

            if (allEdificios) {
                // Helper: Levenshtein Distance
                const levenshtein = (a: string, b: string): number => {
                    const matrix = [];
                    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
                    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
                    for (let i = 1; i <= b.length; i++) {
                        for (let j = 1; j <= a.length; j++) {
                            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                                matrix[i][j] = matrix[i - 1][j - 1];
                            } else {
                                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                            }
                        }
                    }
                    return matrix[b.length][a.length];
                };
                // Función simple de similitud (Token overlap + Jaro-Winkler simplificado o Includes)
                const scored = allEdificios.map(ed => {
                    const text = `${ed.nombre} ${ed.direccion}`.toLowerCase();
                    const target = termino.toLowerCase();

                    // 1. Coincidencia de número (Exacta o Fuzzy)
                    const targetNums = target.match(/\d+/g) || [];
                    const textNums = text.match(/\d+/g) || [];

                    let numScore = 0;
                    if (targetNums.length > 0 && textNums.length > 0) {
                        // Check exact match
                        if (targetNums.some(n => textNums.includes(n))) {
                            numScore = 5;
                        } else {
                            // Check fuzzy match (dist <= 2 for numbers)
                            // e.g. 2470 vs 2740 (dist 2)
                            let bestNumDist = 99;
                            targetNums.forEach(tn => {
                                textNums.forEach(xn => {
                                    const dist = levenshtein(tn, xn);
                                    if (dist < bestNumDist) bestNumDist = dist;
                                });
                            });
                            if (bestNumDist <= 2) numScore = 3;
                        }
                    }

                    // 2. Fuzzy Text Match (Normalizado + Levenshtein)
                    const normalize = (s: string) => s ? s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
                    const nombreNorm = normalize(ed.nombre);
                    const direccionNorm = normalize(ed.direccion);
                    const targetNorm = normalize(termino);

                    const targetWords = targetNorm.split(/\W+/).filter(w => w.length > 3);
                    const sourceWords = (nombreNorm + " " + direccionNorm).split(/\W+/).filter(w => w.length > 2);

                    let wordScore = 0;
                    targetWords.forEach(tw => {
                        let bestDist = 99;
                        let bestMatch = '';
                        sourceWords.forEach(sw => {
                            const dist = levenshtein(tw, sw);
                            if (dist < bestDist) {
                                bestDist = dist;
                                bestMatch = sw;
                            }
                        });

                        if (bestDist <= 2) {
                            wordScore += 5;
                            // console.log(`[DEBUG] Word '${tw}' matched '${bestMatch}' (Dist ${bestDist}) -> +5`);
                        }
                        else if (sourceWords.some(sw => sw.includes(tw) || tw.includes(sw))) wordScore += 3;
                    });

                    const totalScore = wordScore + numScore;

                    // Bonus por "Levenshtein-ish" para casos como "ohigins" vs "o'higgins"
                    // Si target es "ohigins" y nombre es "o'higgins", distance es pequeña.
                    // Implementación dummy: Si el nombre del edificio tiene >50% de las letras del target?

                    return { ...ed, score: totalScore };
                });

                // Filtrar y ordenar
                const candidates = scored
                    .filter(x => x.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5);

                if (candidates.length > 0) {
                    console.log(`[BUSCAR_EDIFICIOS] Top 1: ${candidates[0].nombre} (${candidates[0].direccion}) Score: ${candidates[0].score}`);
                    if (candidates.length > 1) console.log(`[BUSCAR_EDIFICIOS] Top 2: ${candidates[1].nombre} (${candidates[1].direccion}) Score: ${candidates[1].score}`);

                    // AUTO-SELECT LOGIC (Aggressive)
                    // Baja el umbral a 8 para permitir matches "Fuzzy Name (5) + Fuzzy Num (3)" = 8
                    if (candidates[0].score >= 8) {
                        data = [candidates[0]];
                        console.log('[BUSCAR_EDIFICIOS] Auto-select activado. Score:', candidates[0].score);
                    } else {
                        data = candidates.map(({ score, ...rest }) => rest);
                    }
                }
            }
        }

        if (error && !data) return { error: error.message };
        return {
            edificios: data || [],
            count: data?.length || 0
        };
    }
})

// Tool administrarGasto REMOVED

// Tool: Registrar Gasto (Trabajador/Supervisor)
// EXACTAMENTE como procesador-imagen.tsx - Solo campos que existen en schema real
export const registrarGasto = tool({
    description: 'Registra un nuevo gasto asociado a una tarea. Los campos coinciden con procesador-imagen.tsx.',
    parameters: z.object({
        tarea_id: z.number().describe('ID de la tarea asociada al gasto'),
        monto: z.number().describe('Monto total del gasto'),
        tipo_gasto: z.enum(['material', 'mano_de_obra']).describe('Tipo de gasto: material o mano_de_obra'),
        descripcion: z.string().describe('Descripción detallada del gasto'),
        fecha_gasto: z.string().optional().describe('Fecha del gasto en formato YYYY-MM-DD (opcional, default: hoy)'),
    }),
    execute: async ({ tarea_id, monto, tipo_gasto, descripcion, fecha_gasto }) => {
        console.log('[TOOL] 🚀 registrarGasto called:', { tarea_id, monto, tipo_gasto, descripcion })
        try {
            const cookieStore = await cookies();
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
            );

            const { data: { user }, error: authError } = await supabase.auth.getUser();
            console.log('[TOOL] Auth User:', user?.id, authError)

            if (!user) return { success: false, error: 'No autenticado.' };

            // Insertar gasto con SOLO los campos que existen (según procesador-imagen.tsx)
            const { data, error } = await supabase
                .from('gastos_tarea')
                .insert({
                    id_tarea: tarea_id,
                    id_usuario: user.id,
                    monto: monto,
                    descripcion: descripcion,
                    fecha_gasto: fecha_gasto || new Date().toISOString().split('T')[0],
                    tipo_gasto: tipo_gasto,
                    metodo_registro: 'manual',
                    confianza_ocr: null,
                    datos_ocr: null
                })
                .select()
                .single();

            if (error) return { success: false, error: error.message };

            return {
                success: true,
                mensaje: `✅ Gasto de $${monto.toLocaleString('es-AR')} registrado para tarea ${tarea_id}. Pendiente de liquidación.`,
                gasto_id: data.id
            };
        } catch (e: any) {
            console.error('[TOOL] 💥 ERROR en registrarGasto:', e)
            return { success: false, error: e.message }
        }
    }
});

// Exportar herramientas según rol (SEGURIDAD: Zero Leakage)

//ADMIN: Acceso completo (God Mode)
export const adminTools = {
    calcularROI,
    obtenerResumenProyecto,
    calcularLiquidacionSemanal,
    estimarPresupuestoConHistorico,
    listarTareas,
    obtenerContextoUsuario,
    administrarPresupuesto,
    crearTarea,
    editar_tarea,
    clonar_tarea,
    crear_edificio,
    editar_edificio,
    buscar_edificios, // NEW
    crear_departamento,
    registrarGasto,
    verAlertas,
    verMiEquipo,
    verLiquidacionEquipo,
    crearPresupuestoBase,
    registrarParte,
    learn_term
}

// SUPERVISOR: Solo gestión de SUS tareas
export const supervisorTools = {
    obtenerContextoUsuario,
    listarTareas,
    calcularLiquidacionSemanal,
    registrarGasto,
    crear_edificio,
    editar_edificio,
    buscar_edificios, // NEW
    crear_departamento,
    verMiEquipo,
    verLiquidacionEquipo,
    crearPresupuestoBase,
    registrarParte,
    learn_term
}

// TRABAJADOR: Solo consulta y registro de gastos
export const trabajadorTools = {
    listarTareas,
    obtenerContextoUsuario,
    registrarGasto,
    registrarParte,
    verMisPagos,
    learn_term // 🆕 Nivel 2: Capacidad de aprender
}

// Legacy export para compatibilidad (mapea a adminTools)
export const financialTools = adminTools
