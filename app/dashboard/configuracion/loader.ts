import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * CONFIGURACIÓN LOADER v106.0 (Server-Side Data Loading)
 * Usa supabaseAdmin (Service Role) para bypassear RLS.
 * Patrón idéntico al de Facturas y Ajustes.
 *
 * Contexto: La app usa Descope para auth, NO Supabase Auth.
 * El browser client no tiene sesión Supabase → auth.uid() = NULL → RLS bloquea.
 */

export async function getConfiguracionData() {
    // 1. Todos los usuarios (para gestión de roles)
    const { data: usuariosData, error: usuariosError } = await supabaseAdmin
        .from("usuarios")
        .select("*")
        .order("email")

    if (usuariosError) {
        console.error("Error al obtener usuarios:", usuariosError)
        throw new Error("Error al cargar usuarios")
    }

    // 2. Trabajadores con su configuración
    const { data: trabajadoresData, error: trabajadoresError } = await supabaseAdmin
        .from("usuarios")
        .select("*")
        .eq("rol", "trabajador")
        .order("email")

    if (trabajadoresError) {
        console.error("Error al obtener trabajadores:", trabajadoresError)
        throw new Error("Error al cargar trabajadores")
    }

    // 2.1 Configuración de trabajadores
    const trabajadoresIds = trabajadoresData?.map(t => t.id) || []
    let configTrabajadores: any[] = []

    if (trabajadoresIds.length > 0) {
        const { data: configData, error: configError } = await supabaseAdmin
            .from("configuracion_trabajadores")
            .select("*")
            .in("id_trabajador", trabajadoresIds)

        if (!configError) {
            configTrabajadores = configData || []
        }
    }

    // 2.2 Combinar trabajadores con su configuración
    const trabajadoresConConfig = trabajadoresData?.map(trabajador => {
        const config = configTrabajadores.find((c: any) => c.id_trabajador === trabajador.id)
        return {
            ...trabajador,
            configuracion_trabajadores: config ? {
                salario_diario: config.salario_diario,
                activo: config.activo
            } : null
        }
    }) || []

    // 3. Usuarios combinados (para gestión de roles)
    const combinedUsersData = usuariosData?.map((dbUser: any) => ({
        id: dbUser.id,
        email: dbUser.email,
        rol: dbUser.rol || "sin_rol",
        color_perfil: dbUser.color_perfil || "#cccccc",
        last_sign_in_at: null,
        created_at: dbUser.created_at
    })) || []

    // 4. Categorías de productos
    const { data: categoriasData } = await supabaseAdmin
        .from("categorias_productos")
        .select("*")
        .order("nombre")

    // 5. Productos con categorías
    const { data: productosData } = await supabaseAdmin
        .from("productos")
        .select(`*, categorias_productos (id, nombre)`)
        .order("nombre")

    // 6. Administradores con conteo de edificios (RPC)
    let administradoresData: any[] = []
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('obtener_administradores_con_edificios')

    if (rpcError) {
        console.error("Error al cargar administradores con RPC:", rpcError)
        // Fallback: cargar sin conteo
        const { data: fallbackData } = await supabaseAdmin
            .from("administradores")
            .select("id, code, nombre, telefono, estado, aplica_ajustes, porcentaje_default, email1, email2, created_at")
            .order("nombre", { ascending: true })
        administradoresData = (fallbackData || []).map(admin => ({ ...admin, total_edificios: 0 }))
    } else {
        administradoresData = rpcData || []
    }

    // 7. Estados de tareas
    const { data: estadosTareasData } = await supabaseAdmin
        .from("estados_tareas")
        .select("*")
        .order("orden", { ascending: true })

    // 8. Estados de presupuestos
    const { data: estadosPresupuestosData } = await supabaseAdmin
        .from("estados_presupuestos")
        .select("*")
        .order("orden", { ascending: true })

    // 9. Estados de facturas
    const { data: estadosFacturasData } = await supabaseAdmin
        .from("estados_facturas")
        .select("*")
        .order("orden", { ascending: true })

    return {
        trabajadores: trabajadoresConConfig,
        combinedUsers: combinedUsersData,
        productos: productosData || [],
        categorias: categoriasData || [],
        administradores: administradoresData,
        estadosTareas: estadosTareasData || [],
        estadosPresupuestos: estadosPresupuestosData || [],
        estadosFacturas: estadosFacturasData || [],
    }
}
