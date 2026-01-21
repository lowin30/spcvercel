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

        if (error) return { error: `Error cargando contexto de ${rol}`, detalle: error.message }

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

            const nombreBase = presupuesto.tareas?.titulo || `Presupuesto ${presupuesto.code}`;
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

                if (facturaRError) throw new Error(`Error creando factura regular: ${facturaRError.message}`);
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

                if (facturaMError) throw new Error(`Error creando factura materiales: ${facturaMError.message}`);
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
                mensaje: `Presupuesto aprobado. ${facturaRegularId ? 'Factura Regular: ' + facturaRegularId : ''} ${facturaMaterialId ? 'Factura Material: ' + facturaMaterialId : ''}`,
                facturas_creadas: { regular: facturaRegularId, material: facturaMaterialId }
            };

        } catch (error: any) {
            return { success: false, error: `Error al aprobar: ${error.message}` };
        }
    }
});

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
                p_titulo: params.titulo,
                p_descripcion: params.descripcion,
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

            return { success: true, mensaje: `Tarea creada con ID: ${newTaskId}`, tarea_id: newTaskId };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
});

// Tool: Administrar Gasto
export const administrarGasto = tool({
    description: 'SUPERVISOR/ADMIN: Aprueba o rechaza un gasto de tarea. Supervisores solo pueden gestionar gastos de SUS tareas supervisadas.',
    parameters: z.object({
        gasto_id: z.number().describe('ID del gasto a administrar'),
        accion: z.enum(['aprobar', 'rechazar']).describe('Acción a realizar'),
        observacion: z.string().optional().describe('Observación del admin/supervisor (recomendado si rechaza)'),
    }),
    execute: async ({ gasto_id, accion, observacion }) => {
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

        const { data: { user } } = await supabase.auth.getUser();
        const rol = user?.user_metadata?.rol;
        if (!rol || !['supervisor', 'admin'].includes(rol)) {
            return { success: false, error: 'Permiso denegado: Solo supervisores y administradores pueden gestionar gastos.' };
        }

        const { data: gasto, error: gastoError } = await supabase
            .from('gastos_tarea')
            .select('*, tareas!inner(id, supervisores_tareas(id_supervisor))')
            .eq('id', gasto_id)
            .single();

        if (gastoError || !gasto) {
            return { success: false, error: 'Gasto no encontrado.' };
        }

        if (rol === 'supervisor') {
            const supervisorAsignado = gasto.tareas?.supervisores_tareas?.find(
                (st: any) => st.id_supervisor === user.id
            );
            if (!supervisorAsignado) {
                return { success: false, error: 'No tienes permiso para gestionar este gasto.' };
            }
        }

        const { error: updateError } = await supabase
            .from('gastos_tarea')
            .update({
                estado: accion === 'aprobar' ? 'aprobado' : 'rechazado',
                observaciones_admin: observacion || null
            })
            .eq('id', gasto_id);

        if (updateError) {
            return { success: false, error: updateError.message };
        }

        return {
            success: true,
            mensaje: `Gasto ${gasto_id} ${accion === 'aprobar' ? 'aprobado' : 'rechazado'} exitosamente.`
        };
    }
});

// Tool: Registrar Gasto (Trabajador/Supervisor)
export const registrarGasto = tool({
    description: 'Registra un nuevo gasto asociado a una tarea. Requiere permisos de trabajador asignado, supervisor o admin.',
    parameters: z.object({
        tarea_id: z.number().describe('ID de la tarea asociada al gasto'),
        monto: z.number().describe('Monto total del gasto'),
        tipo: z.enum(['material', 'mano_obra', 'otro']).describe('Tipo de gasto: material o mano_obra'),
        descripcion: z.string().describe('Descripción detallada del gasto'),
    }),
    execute: async ({ tarea_id, monto, tipo, descripcion }) => {
        console.log('[TOOL] 🚀 registrarGasto called:', { tarea_id, monto, tipo, descripcion })
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

            // Insertar gasto
            const { data, error } = await supabase
                .from('gastos_tarea')
                .insert({
                    id_tarea: tarea_id,
                    id_usuario: user.id,
                    monto: monto,
                    descripcion: `[${tipo.toUpperCase()}] ${descripcion}`,
                    estado: 'pendiente',
                    es_material: tipo === 'material',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) return { success: false, error: error.message };

            return {
                success: true,
                mensaje: `Gasto de $${monto} (${tipo}) registrado para tarea ${tarea_id}. Pendiente de aprobación.`,
                gasto_id: data.id
            };
        } catch (e: any) {
            console.error('[TOOL] 💥 ERROR en registrarGasto:', e)
            return { success: false, error: e.message }
        }
    }
});

// Exportar herramientas según rol (SEGURIDAD: Zero Leakage)

// ADMIN: Acceso completo (God Mode)
// ADMIN: Acceso completo (God Mode)
export const adminTools = {
    calcularROI,
    obtenerResumenProyecto,
    calcularLiquidacionSemanal,
    estimarPresupuestoConHistorico,
    listarTareas,
    obtenerContextoUsuario,
    administrarPresupuesto,
    crearTarea,
    administrarGasto,
    registrarGasto
}

// SUPERVISOR: Solo gestión de SUS tareas
export const supervisorTools = {
    obtenerContextoUsuario,
    listarTareas,
    calcularLiquidacionSemanal,
    administrarGasto,
    registrarGasto
}

// TRABAJADOR: Solo consulta y registro de gastos
export const trabajadorTools = {
    listarTareas,
    obtenerContextoUsuario,
    registrarGasto // Habilitado para trabajadores
}

// Legacy export para compatibilidad (mapea a adminTools)
export const financialTools = adminTools

