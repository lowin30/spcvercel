import { tool } from 'ai'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * HERRAMIENTAS ADICIONALES PARA BOTONES DE QUICK ACTIONS
 * Agregando tools faltantes usando esquema real de DB
 */

// Tool: Ver Alertas del Sistema (Admin/Supervisor)
export const verAlertas = tool({
    description: 'Muestra alertas críticas del sistema: tareas sin asignar, presupuestos sin aprobar, facturas pendientes. Solo para admin y supervisores.',
    parameters: z.object({}),
    execute: async () => {
        try {
            const cookieStore = await cookies();
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
            );

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { error: 'No autenticado' };

            // Obtener alertas desde la vista de admin
            const { data, error } = await supabase
                .from('v_ai_context_admin')
                .select('alertas_sistema_json')
                .eq('user_id', user.id)
                .single();

            if (error || !data) {
                return {
                    alertas: [],
                    mensaje: 'No se pudieron obtener alertas'
                };
            }

            const alertas = data.alertas_sistema_json || {};
            const alertasList = [];

            if (alertas.presupuestos_sin_aprobar_count > 0) {
                alertasList.push(`⚠️ ${alertas.presupuestos_sin_aprobar_count} presupuestos pendientes de aprobación`);
            }
            if (alertas.facturas_con_pagos_pendientes > 0) {
                alertasList.push(`💳 ${alertas.facturas_con_pagos_pendientes} facturas con saldo pendiente`);
            }
            if (alertas.tareas_sin_trabajador > 0) {
                alertasList.push(`👷 ${alertas.tareas_sin_trabajador} tareas sin trabajador asignado`);
            }

            return {
                alertas: alertasList,
                total: alertasList.length,
                mensaje: alertasList.length > 0
                    ? `Tienes ${alertasList.length} alertas activas`
                    : '✅ No hay alertas críticas'
            };
        } catch (e: any) {
            return { error: e.message };
        }
    }
});

// Tool: Aprobar Gasto (Supervisor/Admin)
export const aprobarGasto = tool({
    description: 'Aprueba un gasto pendiente. Solo supervisores de la tarea o admins pueden aprobar.',
    parameters: z.object({
        gasto_id: z.number().describe('ID del gasto a aprobar'),
    }),
    execute: async ({ gasto_id }) => {
        try {
            const cookieStore = await cookies();
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
            );

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: 'No autenticado' };

            // Actualizar estado del gasto
            const { data, error } = await supabase
                .from('gastos_tarea')
                .update({
                    estado: 'aprobado',
                    updated_at: new Date().toISOString()
                })
                .eq('id', gasto_id)
                .select()
                .single();

            if (error) return { success: false, error: error.message };

            return {
                success: true,
                mensaje: `✅ Gasto de $${data.monto} aprobado correctamente`,
                gasto_id: data.id
            };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
});

// Tool: Ver Mi Equipo (Supervisor)
export const verMiEquipo = tool({
    description: 'Muestra información del equipo de trabajadores asignados a las tareas del supervisor.',
    parameters: z.object({}),
    execute: async () => {
        try {
            const cookieStore = await cookies();
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
            );

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { error: 'No autenticado' };

            // Obtener trabajadores de las tareas supervisadas
            const { data, error } = await supabase
                .from('supervisores_tareas')
                .select(`
                    id_tarea,
                    tareas!inner(
                        titulo,
                        trabajadores_tareas(
                            trabajadores(
                                id,
                                nombre
                            )
                        )
                    )
                `)
                .eq('id_supervisor', user.id);

            if (error) return { error: error.message };

            // Agrupar trabajadores únicos
            const trabajadoresSet = new Set();
            const tareasCount: Record<string, number> = {};

            data?.forEach((row: any) => {
                row.tareas?.trabajadores_tareas?.forEach((tt: any) => {
                    if (tt.trabajadores) {
                        const trabajadorId = tt.trabajadores.id;
                        trabajadoresSet.add(JSON.stringify({
                            id: trabajadorId,
                            nombre: tt.trabajadores.nombre
                        }));
                        tareasCount[trabajadorId] = (tareasCount[trabajadorId] || 0) + 1;
                    }
                });
            });

            const trabajadores = Array.from(trabajadoresSet).map((t: any) => {
                const trabajador = JSON.parse(t);
                return {
                    ...trabajador,
                    tareas_asignadas: tareasCount[trabajador.id] || 0
                };
            });

            return {
                trabajadores,
                total: trabajadores.length,
                mensaje: `Supervisas ${trabajadores.length} trabajadores en ${data?.length || 0} tareas`
            };
        } catch (e: any) {
            return { error: e.message };
        }
    }
});

// Tool: Registrar Parte de Trabajo (Trabajador)
// EXACTAMENTE como /api/partes/registrar/route.ts - Lógica replicada inline
export const registrarParte = tool({
    description: 'Registra el parte diario de trabajo de un trabajador en una tarea específica. Solo semana actual (Lunes-Domingo). El trabajador debe estar asignado a la tarea.',
    parameters: z.object({
        tarea_id: z.number().describe('ID de la tarea'),
        tipo_jornada: z.enum(['dia_completo', 'medio_dia']).describe('Tipo de jornada trabajada'),
        fecha: z.string().optional().describe('Fecha en formato YYYY-MM-DD (opcional, default: hoy)'),
    }),
    execute: async ({ tarea_id, tipo_jornada, fecha }) => {
        try {
            const cookieStore = await cookies();
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
            );

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: 'No autenticado' };

            // Fecha default: hoy
            const fechaISO = fecha || new Date().toISOString().split('T')[0];

            // Validar semana actual (L→D)
            const today = new Date();
            const day = today.getDay();
            const mondayOffset = (day + 6) % 7;
            const start = new Date(today);
            start.setHours(0, 0, 0, 0);
            start.setDate(start.getDate() - mondayOffset);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            const d = new Date(`${fechaISO}T00:00:00`);

            if (!(d >= start && d <= end)) {
                return { success: false, error: 'Solo puedes registrar en la semana actual (Lunes-Domingo)' };
            }

            // Verificar que el trabajador está asignado a la tarea (RLS real)
            const { data: asignacion } = await supabase
                .from('trabajadores_tareas')
                .select('id')
                .eq('id_tarea', tarea_id)
                .eq('id_trabajador', user.id)
                .maybeSingle();

            if (!asignacion) {
                return { success: false, error: 'No estás asignado a esta tarea' };
            }

            // Verificar capacidad diaria (máximo 1 día total en todas las tareas)
            const { data: partesExistentes } = await supabase
                .from('partes_de_trabajo')
                .select('id, tipo_jornada')
                .eq('id_trabajador', user.id)
                .eq('fecha', fechaISO);

            const suma = (partesExistentes || []).reduce((acc, p) => {
                return acc + (p.tipo_jornada === 'dia_completo' ? 1 : 0.5);
            }, 0);

            const valorNuevo = tipo_jornada === 'dia_completo' ? 1 : 0.5;
            if (suma + valorNuevo > 1) {
                return { success: false, error: 'Capacidad diaria excedida (máximo 1 día por fecha)' };
            }

            // Insertar (RLS permitirá porque el trabajador está asignado)
            const { data, error } = await supabase
                .from('partes_de_trabajo')
                .insert({
                    id_tarea: tarea_id,
                    id_trabajador: user.id,
                    fecha: fechaISO,
                    tipo_jornada,
                    id_registrador: user.id
                })
                .select('id')
                .single();

            if (error) return { success: false, error: error.message };

            return {
                success: true,
                mensaje: `✅ Parte de ${tipo_jornada === 'dia_completo' ? 'jornada completa' : 'media jornada'} registrado para ${fechaISO}`,
                parte_id: data.id
            };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
});

// Tool: Ver Mis Pagos (Trabajador)
export const verMisPagos = tool({
    description: 'Muestra el historial de pagos y liquidaciones del trabajador.',
    parameters: z.object({
        limit: z.number().default(5).describe('Número de pagos a mostrar (default: 5)'),
    }),
    execute: async ({ limit }) => {
        try {
            const cookieStore = await cookies();
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
            );

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { error: 'No autenticado' };

            // Obtener datos financieros del trabajador desde vista
            const { data, error } = await supabase
                .from('v_ai_context_trabajador')
                .select('finanzas_personales_json')
                .eq('user_id', user.id)
                .single();

            if (error || !data) return { error: 'No se pudieron obtener pagos' };

            const finanzas = data.finanzas_personales_json || {};

            return {
                total_pendiente: finanzas.total_pendiente || 0,
                total_pagado: finanzas.total_pagado || 0,
                jornales_pendientes: finanzas.jornales_pendientes || 0,
                mensaje: `💰 Pendiente: $${finanzas.total_pendiente || 0} | ✅ Pagado: $${finanzas.total_pagado || 0}`
            };
        } catch (e: any) {
            return { error: e.message };
        }
    }
});

// Tool: Ver Liquidación del Equipo (Supervisor)
export const verLiquidacionEquipo = tool({
    description: 'Muestra resumen de liquidaciones del equipo supervisado.',
    parameters: z.object({}),
    execute: async () => {
        try {
            const cookieStore = await cookies();
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
            );

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { error: 'No autenticado' };

            // Obtener métricas del supervisor
            const { data, error } = await supabase
                .from('v_ai_context_supervisor')
                .select('metricas_obras_json')
                .eq('user_id', user.id)
                .single();

            if (error || !data) return { error: 'No se pudieron obtener métricas' };

            const metricas = data.metricas_obras_json || {};

            return {
                gastos_totales: metricas.gastos_totales || 0,
                presupuesto_total: metricas.presupuesto_total || 0,
                tareas_activas: metricas.tareas_activas || 0,
                mensaje: `📊 Gastos: $${metricas.gastos_totales || 0} | Presupuesto: $${metricas.presupuesto_total || 0}`
            };
        } catch (e: any) {
            return { error: e.message };
        }
    }
});

// Tool: Crear Presupuesto Base (Supervisor/Admin)
export const crearPresupuestoBase = tool({
    description: 'Crea un presupuesto base para una tarea. Requiere permisos de supervisor o admin.',
    parameters: z.object({
        tarea_id: z.number().describe('ID de la tarea'),
        materiales: z.number().describe('Costo estimado de materiales'),
        mano_obra: z.number().describe('Costo estimado de mano de obra'),
        descripcion: z.string().optional().describe('Descripción del presupuesto'),
    }),
    execute: async ({ tarea_id, materiales, mano_obra, descripcion }) => {
        try {
            const cookieStore = await cookies();
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
            );

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: 'No autenticado' };

            // Insertar presupuesto base
            const { data, error } = await supabase
                .from('presupuestos_base')
                .insert({
                    id_tarea: tarea_id,
                    materiales,
                    mano_obra,
                    descripcion: descripcion || '',
                    aprobado: false
                })
                .select()
                .single();

            if (error) return { success: false, error: error.message };

            const total = materiales + mano_obra;
            return {
                success: true,
                mensaje: `✅ Presupuesto base creado: $${total} (Materiales: $${materiales}, Mano de obra: $${mano_obra})`,
                presupuesto_id: data.id,
                total
            };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
});
