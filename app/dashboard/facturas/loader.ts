import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function getFacturas(
    rol: string,
    userId: string,
    filters: { search?: string; id_administrador?: string; id_estado?: string; id_edificio?: string } = {}
) {
    // RBAC Manual: Filtros según rol
    if (rol !== 'admin') {
        // Restricted access
        return [];
    }

    const { search, id_administrador, id_estado, id_edificio } = filters;
    let data: any[] = [];

    if (search && search.trim().length >= 2) {
        // 1. Obtener IDs y relevancia desde la RPC buscar_facturas_super_inteligente
        const rpcRes = await supabaseAdmin.rpc('buscar_facturas_super_inteligente', {
            p_query: search.trim(),
            p_id_administrador: id_administrador && id_administrador !== '_todos_' ? parseInt(id_administrador, 10) : null,
            p_id_estado: id_estado && id_estado !== '_todos_' ? parseInt(id_estado, 10) : null,
            p_enviada: null,
            p_pagada: null,
            p_limit: 100
        });

        if (rpcRes.error) {
            console.error("Error executing RPC buscar_facturas_super_inteligente:", rpcRes.error);
            throw new Error("Error al buscar las facturas");
        }

        if (rpcRes.data && rpcRes.data.length > 0) {
            const ids = rpcRes.data.map((r: any) => r.id);

            // 2. Cargar los datos completos de vista_facturas_completa para estos IDs
            let query = supabaseAdmin
                .from("vista_facturas_completa")
                .select('*')
                .in('id', ids);

            if (id_edificio && id_edificio !== '_todos_') {
                query = query.eq('edificio_id', parseInt(id_edificio, 10));
            }

            const { data: fullData, error: fullError } = await query;

            if (fullError) {
                console.error("Error fetching full facturas:", fullError);
                throw new Error("Error al cargar las facturas completas");
            }

            if (fullData) {
                // Ordenar según relevancia devuelta por la RPC
                const idToRelevance = new Map(rpcRes.data.map((r: any) => [r.id, r.relevancia]));
                data = fullData.sort((a, b) => {
                    const relA = idToRelevance.get(a.id) || 0;
                    const relB = idToRelevance.get(b.id) || 0;
                    return relB - relA;
                });
            }
        }
    } else {
        // Consulta convencional sin búsqueda de texto activa
        let query = supabaseAdmin
            .from("vista_facturas_completa")
            .select('*');

        if (id_administrador && id_administrador !== '_todos_') {
            query = query.eq('id_administrador', parseInt(id_administrador, 10));
        }

        if (id_estado && id_estado !== '_todos_') {
            query = query.eq('id_estado_nuevo', parseInt(id_estado, 10));
        }

        if (id_edificio && id_edificio !== '_todos_') {
            query = query.eq('edificio_id', parseInt(id_edificio, 10));
        }

        query = query
            .order("nombre_edificio", { ascending: true })
            .order("titulo_tarea", { ascending: true })
            .order("created_at", { ascending: false });

        const { data: resData, error } = await query;

        if (error) {
            console.error("Error fetching facturas:", error);
            throw new Error("Error al cargar las facturas");
        }
        data = resData || [];
    }

    return data;
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
