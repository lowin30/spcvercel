import { createServerClient } from "@/lib/supabase-server"

export interface PresupuestoBase {
    id: number
    code: string
    id_tarea: number
    titulo_tarea: string
    materiales: number
    mano_obra: number
    total: number
    pb_aprobado: boolean
    fecha_aprobacion: string | null
    id_supervisor: string
    id_edificio: number
    nombre_edificio: string
    id_administrador: number
    nombre_administrador: string
    created_at: string
    updated_at: string
    nota_pb: string | null
    esta_liquidado: boolean
    codigo_estado_pf: string | null
    pf_aprobado: boolean
    pf_rechazado: boolean
    estado_operativo: 'pendiente' | 'activa' | 'rechazada' | 'pagada'
}

export async function getPresupuestosBase(params: {
    rol: string,
    userId: string,
    q?: string,
    tab?: string
}): Promise<PresupuestoBase[]> {
    const { rol, userId, q, tab } = params;
    const supabase = await createServerClient()

    // validacion de seguridad (manual rbac)
    if (rol === 'trabajador') {
        return []
    }

    // Seleccionar la vista correcta según el rol
    const viewName = rol === 'admin' ? 'vista_pb_admin' : 'vista_pb_supervisor'

    // query base usando la vista específica por rol
    let query = supabase
        .from(viewName)
        .select('*')

    // seguridad rbac adicional (el filtrado por id_supervisor ya viene en la vista,
    // pero lo mantenemos por consistencia)
    if (rol === 'supervisor') {
        query = query.eq('id_supervisor', userId)
    }

    // filtrado inteligente por solapas (deshabilitado en servidor para permitir contadores dinámicos en cliente)
    /*
    if (tab === 'pendientes') {
        query = query.eq('estado_operativo', 'pendiente')
    } else if (tab === 'activas') {
        query = query.eq('estado_operativo', 'activa')
    } else if (tab === 'pagada') {
        query = query.eq('estado_operativo', 'pagada')
    }
    */

    // busqueda inteligente
    if (q) {
        query = query.or(`titulo_tarea.ilike.%${q}%,nombre_edificio.ilike.%${q}%,nombre_administrador.ilike.%${q}%,code.ilike.%${q}%`)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
        console.error("error fetching presupuestos base:", error)
        throw new Error("error al cargar presupuestos base")
    }

    return (data || []) as PresupuestoBase[]
}

// --- Bridge Protocol: Detalle Presupuesto Base ---
export async function getPresupuestoBaseById(id: string) {
    const { validateSessionAndGetUser } = await import("@/lib/auth-bridge");
    const supabase = await createServerClient()

    // 1. Validar sesión (Bridge)
    const user = await validateSessionAndGetUser();

    // 2. Seleccionar la vista correcta según el rol
    const viewName = user.rol === 'admin' ? 'vista_pb_admin' : 'vista_pb_supervisor'

    // 3. Consulta segura usando la vista correspondiente
    const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error("Error fetching PB:", error);
        return null;
    }

    return data as PresupuestoBase;
}
