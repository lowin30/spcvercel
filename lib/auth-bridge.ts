import "server-only"
import { getSupabaseServer } from "@/lib/supabase-server"
import { redirect } from "next/navigation"

export type SPCUser = {
    id: string
    rol: string
    email: string
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

    // 3. Buscar Usuario en DB
    // Ahora que usamos Supabase Auth, read directo con el Supabase Server Auth client (aplica RLS localmente)
    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id, rol, email')
        .eq('id', user.id)
        .single()

    if (error || !usuario) {
        console.error(`Auth Bridge: User not found in public.usuarios DB for id ${user.id} (${email})`, error)
        throw new Error("Su cuenta no tiene acceso al sistema operativo SPC. Contacte al administrador.")
    }

    return usuario as SPCUser
}
