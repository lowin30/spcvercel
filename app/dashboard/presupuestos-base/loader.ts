import { createClient } from "@supabase/supabase-js"

// cliente service role para bypass de rls (bridge protocol)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

export interface PresupuestoBase {
    id: number
    code: string
    id_tarea: number
    titulo_tarea: string
    materiales: number
    mano_obra: number
    total: number
    aprobado: boolean
    fecha_aprobacion: string | null
    id_supervisor: string
    email_supervisor: string
    id_edificio: number
    nombre_edificio: string
    id_administrador: number
    nombre_administrador: string
    created_at: string
    updated_at: string
    nota_pb: string | null
    tiene_liquidacion: boolean
    esta_liquidado: boolean
}

export async function getPresupuestosBase(params: {
    rol: string,
    userId: string,
    q?: string,
    tab?: string
}): Promise<PresupuestoBase[]> {
    const { rol, userId, q, tab } = params;

    // validacion de seguridad (manual rbac)
    if (rol === 'trabajador') {
        return []
    }

    // query base usando la vista completa
    let query = supabaseAdmin
        .from('vista_presupuestos_base_completa')
        .select('*')

    // seguridad rbac (supervisor)
    if (rol === 'supervisor') {
        query = query.eq('id_supervisor', userId)
    }

    // filtrado por tabs
    if (tab === 'pendientes') {
        query = query.eq('aprobado', false)
    } else if (tab === 'activas') {
        query = query.eq('aprobado', true).eq('esta_liquidado', false)
    } else if (tab === 'pagada') {
        query = query.eq('esta_liquidado', true)
    }
    // 'todas' no tiene filtros adicionales

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

    return data || []
}

// --- Bridge Protocol: Detalle Presupuesto Base ---
export async function getPresupuestoBaseById(id: string) {
    const { validateSessionAndGetUser } = await import("@/lib/auth-bridge");

    // 1. Validar sesión (Bridge)
    const user = await validateSessionAndGetUser();

    // 2. Consulta segura usando la vista completa
    const { data, error } = await supabaseAdmin
        .from('vista_presupuestos_base_completa')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error("Error fetching PB:", error);
        return null;
    }

    // 3. Validación de seguridad manual (RBAC)
    if (user.rol === 'supervisor') {
        if (data.id_supervisor !== user.id) {
            console.error("Acceso denegado: Supervisor intentando ver presupuesto ajeno");
            return null;
        }
    }

    return data as PresupuestoBase;
}
