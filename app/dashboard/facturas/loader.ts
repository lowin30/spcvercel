import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function getFacturas(rol: string, userId: string) {
    let query = supabaseAdmin
        .from("vista_facturas_completa")
        .select('*')
        .order("nombre_edificio", { ascending: true })
        .order("titulo_tarea", { ascending: true })
        .order("created_at", { ascending: false });

    // RBAC Manual: Filtros según rol
    if (rol !== 'admin') {
        // Restricted access
        return [];
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching facturas:", error);
        throw new Error("Error al cargar las facturas");
    }

    return data || [];
}

export async function getInvoiceKPIs(rol: string) {
    if (rol !== 'admin') return null;

    // Fetch various KPIs in parallel using Service Role
    const supabase = await createServerClient();
    const [
        kpiResponse,
        liqSinPfResponse,
        pfSinFacResponse,
        pbSinPfResponse,
        tareasActivasSinPfResponse,
        pfEnviadoResponse
    ] = await Promise.all([
        supabase.from('vista_finanzas_admin').select('*').single(),
        supabase.from('vista_admin_liquidaciones_sin_pf').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
        supabase.from('vista_admin_pf_aprobado_sin_factura').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
        supabase.from('vista_admin_pb_finalizada_sin_pf').select('*', { count: 'exact' }).limit(5),
        supabase.from('vista_tareas_admin').select('id, titulo, created_at', { count: 'exact' }).eq('finalizada', false).not('id_estado_nuevo', 'in', '(4,7,9,11)').eq('tiene_presupuesto_base', true).eq('tiene_presupuesto_final', false).order('created_at', { ascending: true }).limit(5),
        supabase.from('vista_admin_pf_enviado_sin_aprobar').select('*', { count: 'exact' }).order('updated_at', { ascending: true }).limit(5)
    ]);

    return {
        kpis: kpiResponse.data,
        liqSinPf: liqSinPfResponse.data || [],
        liqSinPf_count: liqSinPfResponse.count || 0,
        pfSinFac: pfSinFacResponse.data || [],
        pfSinFac_count: pfSinFacResponse.count || 0,
        pbSinPf: pbSinPfResponse.data || [],
        pbSinPf_count: pbSinPfResponse.count || 0,
        tareasActivasSinPf: (tareasActivasSinPfResponse.data || []).map((t: any) => ({ id_tarea: t.id, titulo_tarea: t.titulo })),
        tareasActivasSinPf_count: tareasActivasSinPfResponse.count || 0,
        pfEnviado: pfEnviadoResponse.data || [],
        pfEnviado_count: pfEnviadoResponse.count || 0
    };
}

export async function getFiltrosData(rol: string) {
    if (rol !== 'admin') return { administradores: [], edificios: [], estados: [] };

    const [adminsRes, edificiosRes, estadosRes] = await Promise.all([
        (await createServerClient()).from("administradores").select("id, nombre").eq('estado', 'activo'),
        (await createServerClient()).from("edificios").select("id, nombre, id_administrador").order('nombre'),
        (await createServerClient()).from("estados_facturas").select("*").order("id")
    ]);

    return {
        administradores: adminsRes.data || [],
        edificios: edificiosRes.data || [],
        estados: estadosRes.data || []
    };
}
