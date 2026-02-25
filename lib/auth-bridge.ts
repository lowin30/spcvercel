import "server-only"
import { getSupabaseServer } from "@/lib/supabase-server"
import { redirect } from "next/navigation"

export type SPCUser = {
    id: string
    rol: string
    email: string
    preferencias: Record<string, any>
}

/**
 * IDENTITY BRIDGE v3.0 (Supabase Native OIDC)
 * Valida la sesión nativa de Supabase y recupera el usuario
 * @throws Error si el usuario no esta registrado o error interno.
 * @redirects /login si no hay sesion valida.
 */
export async function validateSessionAndGetUser(): Promise<SPCUser> {
    const supabase = await getSupabaseServer()
    if (!supabase) {
        redirect('/login')
    }

    // Usar supabase.auth.getUser() en lugar de getSession() por seguridad real backend
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        console.error("Auth Bridge: Session Validation Failed (No Supabase User)", authError)
        redirect('/login')
    }

    const email = user.email
    if (!email) {
        console.error("Auth Bridge: No email in auth.users")
        redirect('/login')
    }

    // 3. Extraer Rol desde el JWT (The Platinum Standard)
    // Supabase permite inyectar custom claims en app_metadata a través de Auth Hooks.
    // Esto evita una consulta N+1 a la tabla public.usuarios y hace volar al servidor.
    const jwtRol = user.app_metadata?.rol;

    if (jwtRol) {
        console.log(`[AUTH-BRIDGE-DEBUG] Resolving JWT app_metadata.rol: ${jwtRol} for user ${email}`);
        return {
            id: user.id,
            email: email,
            rol: jwtRol,
            preferencias: user.user_metadata?.preferencias || {}
        } as SPCUser
    }

    // 4. FALLBACK de Seguridad (Por si el JWT aún no tiene el claim inyectado)
    // Esto solo ocurrirá en la transición antes de configurar el Hook en Supabase
    // o si de pronto el Hook falla temporalmente.
    console.warn(`Auth Bridge: JWT Claim 'rol' no encontrado para ${email}. Realizando consulta Fallback a BD.`);
    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id, rol, email, preferencias')
        .eq('id', user.id)
        .single()

    if (error || !usuario) {
        console.error(`Auth Bridge: User not found in public.usuarios DB for id ${user.id} (${email})`, error)
        throw new Error("Su cuenta no tiene acceso al sistema operativo SPC. Contacte al administrador.")
    }

    console.log(`[AUTH-BRIDGE-DEBUG] Resolving DB Fallback rol: ${usuario.rol} for user ${email}`);
    return usuario as SPCUser
}
