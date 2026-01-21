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
// EXACTAMENTE como historial-pagos.tsx - Query directo a liquidaciones_trabajadores
export const verMisPagos = tool({
    description: 'Muestra el historial de liquidaciones y pagos del trabajador logueado.',
    parameters: z.object({
        limit: z.number().default(5).describe('Número de liquidaciones recientes a mostrar (default: 5)'),
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

            // Query directo a liquidaciones_trabajadores (igual que historial-pagos.tsx)
            const { data, error } = await supabase
                .from('liquidaciones_trabajadores')
                .select('id, semana_inicio, semana_fin, total_dias, salario_base, plus_manual, gastos_reembolsados, total_pagar, estado, created_at')
                .eq('id_trabajador', user.id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) return { error: error.message };

            if (!data || data.length === 0) {
                return {
                    liquidaciones: [],
                    total_liquidaciones: 0,
                    mensaje: 'No tienes liquidaciones registradas'
                };
            }

            // Calcular totales (igual que historial-pagos.tsx)
            const totalPagado = data
                .filter(liq => liq.estado === 'pagado')
                .reduce((sum, liq) => sum + liq.total_pagar, 0);

            const totalPendiente = data
                .filter(liq => liq.estado === 'pendiente')
                .reduce((sum, liq) => sum + liq.total_pagar, 0);

            const totalDias = data.reduce((sum, liq) => {
                const dias = typeof liq.total_dias === 'string' ? parseFloat(liq.total_dias) : liq.total_dias;
                return sum + (dias || 0);
            }, 0);

            return {
                liquidaciones: data.map(liq => ({
                    id: liq.id,
                    periodo: `${new Date(liq.semana_inicio).toLocaleDateString('es-AR')} - ${new Date(liq.semana_fin).toLocaleDateString('es-AR')}`,
                    dias_trabajados: liq.total_dias,
                    salario_base: liq.salario_base,
                    gastos: liq.gastos_reembolsados,
                    plus: liq.plus_manual,
                    total: liq.total_pagar,
                    estado: liq.estado,
                    fecha_creacion: liq.created_at
                })),
                total_liquidaciones: data.length,
                total_pagado: totalPagado,
                total_pendiente: totalPendiente,
                total_dias_trabajados: totalDias,
                mensaje: `📊 Tienes ${data.length} liquidación(es). Pagado: $${totalPagado.toLocaleString('es-AR')} | Pendiente: $${totalPendiente.toLocaleString('es-AR')}`
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
// EXACTAMENTE como presupuesto-base-form.tsx - Genera code, incluye id_supervisor y nota_pb
export const crearPresupuestoBase = tool({
    description: 'Crea un presupuesto base para una tarea. Genera código automático y requiere permisos de supervisor o admin.',
    parameters: z.object({
        tarea_id: z.number().describe('ID de la tarea'),
        materiales: z.number().describe('Costo estimado de materiales'),
        mano_obra: z.number().describe('Costo estimado de mano de obra'),
        nota_pb: z.string().optional().describe('Nota descriptiva del presupuesto (opcional)'),
    }),
    execute: async ({ tarea_id, materiales, mano_obra, nota_pb }) => {
        try {
            const cookieStore = await cookies();
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
            );

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: 'No autenticado' };

            // Generar código igual que presupuesto-base-form.tsx
            const now = new Date();
            const code = `PB-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

            // Insertar presupuesto base con TODOS los campos del componente manual
            const { data, error } = await supabase
                .from('presupuestos_base')
                .insert({
                    code,
                    id_tarea: tarea_id,
                    materiales,
                    mano_obra,
                    id_supervisor: user.id,
                    nota_pb: nota_pb || '',
                    aprobado: false
                })
                .select()
                .single();

            if (error) return { success: false, error: error.message };

            const total = materiales + mano_obra;
            return {
                success: true,
                mensaje: `✅ Presupuesto base ${code} creado: $${total.toLocaleString('es-AR')} (Materiales: $${materiales.toLocaleString('es-AR')}, Mano de obra: $${mano_obra.toLocaleString('es-AR')})`,
                presupuesto_id: data.id,
                code: data.code,
                total
            };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
});
