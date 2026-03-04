"use server"

import { getSupabaseServer } from '@/lib/supabase-server'

// Mapeos de estado para la logica de negocio
type CategoriaTarea = 'BLOQUE_1_FRENADA_POR_MI' | 'BLOQUE_2_FRENADA_POR_ADMIN' | 'BLOQUE_3_EN_OBRA' | 'OTRO';

export interface TareaEnriquecida {
    id: number;
    code_tarea: string;
    titulo: string;
    estado_codigo: string;
    estado_nombre: string;
    fecha_visita: string | null;
    updated_at: string;
    tiene_presupuesto_base: boolean;
    pb_aprobado: boolean;
    finalizada: boolean;
    categoria: CategoriaTarea;
    dias_inactivo: number;
    gastos: any;
    trabajadores: any;
    // Metricas pre-calculadas para UI
    margin_libre?: number;
    porcentaje_consumido?: number;
    monto_pb_aprobado?: number;
}

export async function getDashboardSupervisorData() {
    const supabase = await getSupabaseServer()
    if (!supabase) {
        throw new Error('Supabase no inicializado')
    }

    try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) throw new Error('No autenticado')

        // 1. Obtener los KPI Financieros Globales (Los del cajon flotante)
        const { data: kpis } = await supabase
            .from('vista_finanzas_supervisor')
            .select('ganancia_supervisor_mes, liquidaciones_pendientes, presupuestos_base_monto_total')
            .maybeSingle()

        // 2. Traer SOLO tareas ACTIVAS desde la super vista
        // Filtro identico al de /dashboard/tareas solapa "Activas":
        //   finalizada = false AND id_estado_nuevo NOT IN (4=Enviado, 7=Terminado, 9=Liquidada, 11=Vencido)
        const { data: tareasRaw, error } = await supabase
            .from('vista_tareas_supervisor')
            .select('*')
            .eq('finalizada', false)
            .not('id_estado_nuevo', 'in', '(4,7,9,11)')
            .order('updated_at', { ascending: false })

        if (error) {
            console.error("Error consultando vista_tareas_supervisor:", error);
            throw new Error("Error al obtener tareas");
        }

        // 3. ENRIQUECEDOR: Logica de Negocio (Server-Side)
        const ahora = new Date().getTime();

        const tareasEnriquecidas: TareaEnriquecida[] = (tareasRaw || []).map(t => {
            // Calcular inactividad
            const msInactivo = ahora - new Date(t.updated_at || t.created_at).getTime();
            const dias_inactivo = Math.floor(msInactivo / (1000 * 60 * 60 * 24));

            // Categorizacion Estricta (El Radar Platinum V3)
            let categoria: CategoriaTarea = 'OTRO';
            const estado = t.estado_codigo;

            // BLOQUE 1: Pelota en cancha del Supervisor (Falta PB)
            if (!t.tiene_presupuesto_base && (estado === 'organizar' || estado === 'preguntar' || estado === 'iniciar')) {
                categoria = 'BLOQUE_1_FRENADA_POR_MI';
            }
            // BLOQUE 3: El Motor (Obra Aprobada / Activa)
            else if (estado === 'aprobado' || estado === 'en_curso') {
                categoria = 'BLOQUE_3_EN_OBRA';
            }
            // BLOQUE 2: Todo lo demas que no este finalizado (Esperando a Admin o a facturar)
            else {
                categoria = 'BLOQUE_2_FRENADA_POR_ADMIN';
            }

            // Extraccion de Metricas Financieras Locales (Si existe JSON)
            let margin_libre = 0;
            let porcentaje_consumido = 0;
            let monto_pb_aprobado = 0;

            if (t.gastos_json && t.gastos_json.pb) {
                monto_pb_aprobado = typeof t.gastos_json.pb === 'number'
                    ? t.gastos_json.pb
                    : (t.gastos_json.pb.monto_aprobado || t.gastos_json.pb.monto_total || 0); // Failsafe para tomar total si no hay aprobado

                const monto_gastado = t.gastos_json.total_gastos || 0;

                margin_libre = monto_pb_aprobado - monto_gastado;
                if (monto_pb_aprobado > 0) {
                    porcentaje_consumido = (monto_gastado / monto_pb_aprobado) * 100;
                }
            }

            return {
                ...t,
                categoria,
                dias_inactivo,
                margin_libre,
                porcentaje_consumido,
                monto_pb_aprobado,
                gastos: t.gastos_json,
                trabajadores: t.trabajadores_json
            };
        });

        // 4. Entregar el Payload agrupado a NextJS
        return {
            success: true,
            kpis: kpis || {},
            bloques: {
                bloque1: tareasEnriquecidas.filter(t => t.categoria === 'BLOQUE_1_FRENADA_POR_MI'),
                bloque2: tareasEnriquecidas.filter(t => t.categoria === 'BLOQUE_2_FRENADA_POR_ADMIN'),
                bloque3: tareasEnriquecidas.filter(t => t.categoria === 'BLOQUE_3_EN_OBRA')
            }
        };

    } catch (err: any) {
        console.error('Error en getDashboardSupervisorData:', err)
        return { success: false, error: err.message }
    }
}
