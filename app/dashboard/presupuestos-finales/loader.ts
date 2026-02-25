import { createServerClient } from "@/lib/supabase-server"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"

/**
 * Obtener listado de presupuestos finales optimizado
 */
export async function getPresupuestosFinales(rol: string, userId: string) {
    const supabase = await createServerClient()

    if (rol === 'trabajador') {
        return []
    }

    // Usamos la vista completa que ya incluye cálculos financieros y relaciones
    let query = supabase
        .from('vista_presupuestos_finales_completa')
        .select('*')
        .order('created_at', { ascending: false })

    if (rol === 'supervisor') {
        query = query.eq('id_supervisor', userId)
    }

    const { data, error } = await query

    if (error) {
        console.error("error fetching pf:", error)
        throw new Error("No se pudieron cargar los presupuestos finales")
    }

    return data || []
}

/**
 * Obtener detalle completo de un presupuesto final incluyendo sus items
 */
export async function getPresupuestoFinalConItems(id: number) {
    const { rol, id: userId } = await validateSessionAndGetUser()
    const supabase = await createServerClient()

    if (rol !== 'admin' && rol !== 'supervisor') {
        return null
    }

    // 1. Obtener cabecera del presupuesto
    const { data: pf, error: pfError } = await supabase
        .from('presupuestos_finales')
        .select(`
            *,
            tareas(
                id,
                titulo,
                code,
                id_edificio,
                id_supervisor,
                edificios(nombre)
            )
        `)
        .eq('id', id)
        .single()

    if (pfError || !pf) {
        console.error("error fetching pf header:", pfError)
        return null
    }

    // 2. Validación de seguridad RBAC manual para supervisores
    if (rol === 'supervisor' && pf.tareas?.id_supervisor !== userId) {
        return null
    }

    // 3. Obtener items asociados
    const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('id_presupuesto', id)
        .order('id', { ascending: true })

    if (itemsError) {
        console.error("error fetching items:", itemsError)
        return { ...pf, items: [] }
    }

    return { ...pf, items: items || [] }
}

/**
 * Obtener administradores activos para filtros
 */
export async function getAdministradores(rol: string) {
    if (rol !== 'admin') return []
    const supabase = await createServerClient()

    const { data } = await supabase
        .from("vista_administradores")
        .select("id, nombre, estado")
        .eq('estado', 'activo')
        .order("nombre")

    return data || []
}

/**
 * Obtener KPIs y recordatorios de administración (Solo Admin)
 */
export async function getKpisAdmin(rol: string) {
    if (rol !== 'admin') return null;
    const supabase = await createServerClient()

    const [
        kpisRes,
        pbSinPfRes,
        pbSinAprobarRes,
        pfAgingRes,
        pfBorradorRes,
        pfEnviadoRes,
        pfAprobadoRes
    ] = await Promise.all([
        supabase.from('vista_finanzas_admin').select('*').maybeSingle(),
        supabase.from('vista_admin_pb_finalizada_sin_pf').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('vista_admin_pb_sin_aprobar').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('vista_admin_pf_enviado_sin_actividad').select('*').order('dias_desde_envio', { ascending: false }).limit(50),
        supabase.from('vista_admin_pf_borrador_antiguo').select('*').order('created_at', { ascending: true }).limit(50),
        supabase.from('vista_admin_pf_enviado_sin_aprobar').select('*').order('updated_at', { ascending: true }).limit(50),
        supabase.from('vista_admin_pf_aprobado_sin_factura').select('*').order('created_at', { ascending: false }).limit(50)
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
