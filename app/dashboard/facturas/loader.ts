import { createSsrServerClient } from "@/lib/ssr-server"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"

export async function getFacturas(rol: string, userId: string) {
    const supabase = await createSsrServerClient()

    let query = supabase
        .from("vista_facturas_completa")
        .select('*')
        .order("nombre_edificio", { ascending: true })
        .order("titulo_tarea", { ascending: true })
        .order("created_at", { ascending: false });

    // RBAC Manual: Filtros según rol
    if (rol !== 'admin') {
        // Si no es admin, solo ve lo que le corresponde (esto depende de como la vista maneje seguridad o si filtramos aqui)
        // Dado el protocolo anterior, idealmente la vista ya filtra o aplicamos filtro aqui.
        // Por seguridad, si no es admin, filtramos por algun criterio si aplica, o devolvemos vacio si es restricted.
        // En el caso de facturas, suele ser sensitive. Asumiremos Admin-only por ahora o logic especifica.

        // REVISANDO page.tsx anterior: "Restricción estricta: solo admins pueden ver esta página"
        // Por lo tanto, si no es admin, devolvemos array vacio o error.
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

    const supabase = await createSsrServerClient();

    // Fetch various KPIs in parallel
    const [
        kpiResponse,
        liqSinPfResponse,
        pfSinFacResponse,
        pbSinPfResponse,
        pfBorradorResponse,
        pfEnviadoResponse
    ] = await Promise.all([
        supabase.from('vista_finanzas_admin').select('*').single(),
        supabase.from('vista_admin_liquidaciones_sin_pf').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('vista_admin_pf_aprobado_sin_factura').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('vista_admin_pb_finalizada_sin_pf').select('*').limit(5),
        supabase.from('vista_admin_pf_borrador_antiguo').select('*').order('created_at', { ascending: true }).limit(5),
        supabase.from('vista_admin_pf_enviado_sin_aprobar').select('*').order('updated_at', { ascending: true }).limit(5)
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

    const supabase = await createSsrServerClient();

    const [adminsRes, edificiosRes, estadosRes] = await Promise.all([
        supabase.from("administradores").select("id, nombre").eq('estado', 'activo'),
        supabase.from("edificios").select("id, nombre, id_administrador").order('nombre'),
        supabase.from("estados_facturas").select("*").order("id")
    ]);

    return {
        administradores: adminsRes.data || [],
        edificios: edificiosRes.data || [],
        estados: estadosRes.data || []
    };
}
