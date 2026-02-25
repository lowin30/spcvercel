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
    const [
        kpiResponse,
        liqSinPfResponse,
        pfSinFacResponse,
        pbSinPfResponse,
        pfBorradorResponse,
        pfEnviadoResponse
    ] = await Promise.all([
        (await createServerClient()).from('vista_finanzas_admin').select('*').single(),
        (await createServerClient()).from('vista_admin_liquidaciones_sin_pf').select('*').order('created_at', { ascending: false }).limit(5),
        (await createServerClient()).from('vista_admin_pf_aprobado_sin_factura').select('*').order('created_at', { ascending: false }).limit(5),
        (await createServerClient()).from('vista_admin_pb_finalizada_sin_pf').select('*').limit(5),
        (await createServerClient()).from('vista_admin_pf_borrador_antiguo').select('*').order('created_at', { ascending: true }).limit(5),
        (await createServerClient()).from('vista_admin_pf_enviado_sin_aprobar').select('*').order('updated_at', { ascending: true }).limit(5)
    ]);

    return {
        kpis: kpiResponse.data,
        liqSinPf: liqSinPfResponse.data || [],
        pfSinFac: pfSinFacResponse.data || [],
        pbSinPf: pbSinPfResponse.data || [],
        pfBorrador: pfBorradorResponse.data || [],
        pfEnviado: pfEnviadoResponse.data || []
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
