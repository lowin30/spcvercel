import { createServerClient } from '@/lib/supabase-server'

export async function getPresupuestos(rol: string) {
    if (rol !== 'admin') {
        return []
    }

    const { data, error } = await supabaseAdmin
        .from("presupuestos_finales")
        .select(`
            *,
            estados_presupuestos:id_estado (id, nombre, color, codigo),
            tareas:id_tarea (id, titulo, edificios:id_edificio (id, nombre, id_administrador))
        `)
        .order("created_at", { ascending: false }); // Ordenamiento por defecto que tenía la page

    if (error) {
        console.error("Error fetching presupuestos:", error);
        throw new Error("Error al cargar los presupuestos");
    }

    // Mapeo 'tipo: final' que hacía la page
    return (data || []).map((p: any) => ({ ...p, tipo: 'final' }));
}

export async function getAdministradores(rol: string) {
    if (rol !== 'admin') return []

    const { data } = await supabaseAdmin
        .from("vista_administradores")
        .select("id, nombre, estado")
        .order("nombre", { ascending: true })

    return (data || []).filter((a: any) => a.estado === 'activo');
}

export async function getKpisAdmin(rol: string) {
    if (rol !== 'admin') return null;

    const [
        kpisRes,
        pbSinPfRes,
        pbSinAprobarRes,
        pfAgingRes,
        pfBorradorRes,
        pfEnviadoRes,
        pfAprobadoRes
    ] = await Promise.all([
        (await createServerClient()).from('vista_finanzas_admin').select('*').single(),
        (await createServerClient()).from('vista_admin_pb_finalizada_sin_pf').select('*').order('created_at', { ascending: false }).limit(50),
        (await createServerClient()).from('vista_admin_pb_sin_aprobar').select('*').order('created_at', { ascending: false }).limit(50),
        (await createServerClient()).from('vista_admin_pf_enviado_sin_actividad').select('*').order('dias_desde_envio', { ascending: false }).limit(50),
        (await createServerClient()).from('vista_admin_pf_borrador_antiguo').select('*').order('created_at', { ascending: true }).limit(50),
        (await createServerClient()).from('vista_admin_pf_enviado_sin_aprobar').select('*').order('updated_at', { ascending: true }).limit(50),
        (await createServerClient()).from('vista_admin_pf_aprobado_sin_factura').select('*').order('created_at', { ascending: false }).limit(50)
    ]);

    return {
        kpis: kpisRes.data || null,
        pbSinPf: pbSinPfRes.data || [],
        pbSinAprobar: pbSinAprobarRes.data || [],
        pfAging: pfAgingRes.data || [],
        pfBorrador: pfBorradorRes.data || [],
        pfEnviado: pfEnviadoRes.data || [],
        pfAprobado: pfAprobadoRes.data || []
    };
}
