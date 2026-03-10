import "server-only"
import { getSupabaseServer } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
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
        // RE-SINCRONIZACIÓN DE ID: Usamos el cliente admin para garantizar la resolución del UUID real.
        // Normalizamos el email a minúsculas para evitar desincronizaciones por Case Sensitivity.
        const normalizedEmail = email.toLowerCase();

        const { data: dbUser, error: dbError } = await supabaseAdmin
            .from('usuarios')
            .select('id, preferencias')
            .eq('email', normalizedEmail)
            .single();

        if (dbError) {
            console.error(`[AUTH-BRIDGE] Error crítico de sincronización para ${normalizedEmail}:`, dbError);
        }

        const finalUserId = dbUser?.id || user.id;

        return {
            id: finalUserId,
            email: normalizedEmail,
            rol: jwtRol,
            preferencias: dbUser?.preferencias || user.user_metadata?.preferencias || {}
        } as SPCUser
    }

    // 4. FALLBACK de Seguridad por Email (Inyectando supabaseAdmin para robustez)
    const normalizedEmail = email.toLowerCase();
    console.warn(`Auth Bridge: Claim 'rol' ausente para ${normalizedEmail}. Ejecutando rescate administrativo.`);
    const { data: usuario, error } = await supabaseAdmin
        .from('usuarios')
        .select('id, rol, email, preferencias')
        .eq('email', normalizedEmail)
        .single()

    if (error || !usuario) {
        console.error(`Auth Bridge: Rescate fallido para ${email}. Usuario no existe en DB.`, error)
        throw new Error("Acceso denegado: Usuario no registrado en el sistema operativo SPC.")
    }

    return {
        id: usuario.id,
        rol: usuario.rol,
        email: usuario.email,
        preferencias: usuario.preferencias || {}
    } as SPCUser
}
