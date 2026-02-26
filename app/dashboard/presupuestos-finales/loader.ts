import { createServerClient } from "@/lib/supabase-server"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"

/**
 * Obtener listado de presupuestos finales optimizado con filtros de servidor
 */
export async function getPresupuestosFinales(rol: string, userId: string, filters?: {
    search?: string,
    adminId?: string,
    edificioId?: string,
    estado?: string
}) {
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

    // Aplicar filtros de servidor si existen
    if (filters) {
        if (filters.search) {
            query = query.or(`code.ilike.%${filters.search}%,titulo_tarea.ilike.%${filters.search}%,nombre_edificio.ilike.%${filters.search}%`)
        }
        if (filters.adminId && filters.adminId !== 'todos') {
            query = query.eq('id_administrador', filters.adminId)
        }
        if (filters.edificioId && filters.edificioId !== 'todos') {
            query = query.eq('id_edificio', filters.edificioId)
        }
        if (filters.estado && filters.estado !== 'todos') {
            const estado = filters.estado.toLowerCase()
            // Filter using id_estado (integer) since the view doesn't have 'codigo_estado'
            // estados_presupuestos: 1=Borrador, 2=Enviado, 3=Aceptado, 4=Facturado, 5=Rechazado
            if (estado === "activas") {
                // Activas = Borrador + sin estado + Aceptado (sin factura)
                // Excluye: Enviado (esperando cliente), Facturado (completados), Rechazado (finalizados)
                query = query.or('id_estado.eq.1,id_estado.eq.3,id_estado.is.null')
            }
            else if (estado === "borrador") query = query.eq('id_estado', 1)
            else if (estado === "enviado") query = query.eq('id_estado', 2)
            else if (estado === "aceptado") query = query.or('id_estado.eq.3,aprobado.eq.true')
            else if (estado === "facturado") query = query.eq('id_estado', 4)
            else if (estado === "rechazado") query = query.or('id_estado.eq.5,rechazado.eq.true')
        }
    }

    const { data, error } = await query

    if (error) {
        console.error("error fetching pf:", error)
        return []
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
 * Obtener la tabla de referencia estados_presupuestos (id, nombre, color, codigo)
 * Necesario porque la vista 'vista_presupuestos_finales_completa' solo tiene id_estado y estado_presupuesto (texto),
 * pero NO tiene las columnas 'color' ni 'codigo' que necesita el componente EstadoBadge.
 */
export async function getEstadosPresupuestos() {
    const supabase = await createServerClient()
    const { data } = await supabase
        .from('estados_presupuestos')
        .select('id, nombre, color, codigo')
        .order('id')
    return data || []
}

/**
 * Obtener conteos estables para cada solapa (independiente del filtro activo)
 * Estos conteos NO cambian al cambiar de tab — siempre reflejan el total real.
 */
export async function getPresupuestosCounts(rol: string, userId: string, filters?: {
    search?: string,
    adminId?: string,
    edificioId?: string,
}) {
    const supabase = await createServerClient()

    if (rol === 'trabajador') {
        return { activas: 0, borrador: 0, enviado: 0, aceptado: 0, facturado: 0, todos: 0 }
    }

    let baseQuery = supabase
        .from('vista_presupuestos_finales_completa')
        .select('id, id_estado, aprobado, rechazado')

    if (rol === 'supervisor') {
        baseQuery = baseQuery.eq('id_supervisor', userId)
    }

    if (filters) {
        if (filters.search) {
            baseQuery = baseQuery.or(`code.ilike.%${filters.search}%,titulo_tarea.ilike.%${filters.search}%,nombre_edificio.ilike.%${filters.search}%`)
        }
        if (filters.adminId && filters.adminId !== 'todos') {
            baseQuery = baseQuery.eq('id_administrador', filters.adminId)
        }
        if (filters.edificioId && filters.edificioId !== 'todos') {
            baseQuery = baseQuery.eq('id_edificio', filters.edificioId)
        }
    }

    const { data, error } = await baseQuery

    if (error || !data) {
        return { activas: 0, borrador: 0, enviado: 0, aceptado: 0, facturado: 0, todos: 0 }
    }

    return {
        activas: data.filter(p => p.id_estado === 1 || p.id_estado === 3 || p.id_estado === null).length,
        borrador: data.filter(p => p.id_estado === 1).length,
        enviado: data.filter(p => p.id_estado === 2).length,
        aceptado: data.filter(p => p.id_estado === 3 || p.aprobado === true).length,
        facturado: data.filter(p => p.id_estado === 4).length,
        todos: data.length,
    }
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
