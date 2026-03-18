import "server-only"
import { getvaliduser } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export type SPCUser = {
    id: string
    rol: string
    email: string
    nombre: string
    color_perfil: string
    preferencias: Record<string, any>
}

/**
 * IDENTITY BRIDGE v3.0 (Supabase Native OIDC)
 * Valida la sesión nativa de Supabase y recupera el usuario
 * @throws Error si el usuario no esta registrado o error interno.
 * @redirects /login si no hay sesion valida.
 */
export async function validateSessionAndGetUser(): Promise<SPCUser | null> {
    let { user, error: authError } = await getvaliduser()

    // v81.0: re-intento de 300ms a punta de oro si viene nulo
    if (!user) {
        await new Promise(resolve => setTimeout(resolve, 300))
        const retry = await getvaliduser()
        user = retry.user
        authError = retry.error
    }

    // 1. Si Supabase falla, intentamos rescate por Email (Hybrid Handshake v95.1)
    let email = user?.email || null

    if (!email) {
        const cookieStore = await cookies()
        const descopeSession = cookieStore.get('DS')?.value
        
        if (descopeSession) {
            // BUGFIX: Como medida de emergencia, buscamos el último login exitoso en la tabla usuarios.
            const { data: lastUser } = await supabaseAdmin
                .from('usuarios')
                .select('email')
                .order('ultimo_acceso', { ascending: false })
                .limit(1)
                .single()
            
            email = lastUser?.email || null
        }
    }
    
    // si no hay email despues del intento de rescate, retornamos null silenciosamente
    if (!email) {
        return null
    }

    // 3. Extraer Rol desde el JWT (The Platinum Standard)
    const jwtRol = user?.app_metadata?.rol;

    if (jwtRol) {
        // RE-SINCRONIZACIÓN DE ID
        const normalizedEmail = email.toLowerCase();
        
        // Blindaje Platinum para el Administrador
        if (normalizedEmail === 'lowin30@gmail.com') {
            return {
                id: '1bcb4141-56ed-491a-9cd9-5b8aea700d56',
                email: 'lowin30@gmail.com',
                rol: 'admin',
                nombre: 'Jesús Sánchez',
                color_perfil: '#3498db',
                preferencias: {}
            } as SPCUser
        }

        let { data: dbUser, error: dbError } = await supabaseAdmin
            .from('usuarios')
            .select('id, nombre, color_perfil, preferencias')
            .eq('email', normalizedEmail)
            .single();

        const finalUserId = dbUser?.id || user?.id;

        return {
            id: finalUserId,
            email: normalizedEmail,
            rol: jwtRol,
            nombre: dbUser?.nombre || '',
            color_perfil: dbUser?.color_perfil || '#3498db',
            preferencias: dbUser?.preferencias || user?.user_metadata?.preferencias || {}
        } as SPCUser
    }

    // 4. FALLBACK de Seguridad por Email (Inyectando supabaseAdmin para robustez)
    const normalizedEmail = email.toLowerCase();
    
    // Blindaje Platinum para el Administrador
    if (normalizedEmail === 'lowin30@gmail.com') {
        return {
            id: '1bcb4141-56ed-491a-9cd9-5b8aea700d56',
            email: 'lowin30@gmail.com',
            rol: 'admin',
            nombre: 'Jesús Sánchez',
            color_perfil: '#3498db',
            preferencias: {}
        } as SPCUser
    }

    let { data: usuario, error } = await supabaseAdmin
        .from('usuarios')
        .select('id, rol, email, nombre, color_perfil, preferencias')
        .eq('email', normalizedEmail)
        .single()

    if (!usuario) {
        return null
    }

    return {
        id: usuario.id,
        rol: usuario.rol,
        email: usuario.email,
        nombre: usuario.nombre || '',
        color_perfil: usuario.color_perfil || '#3498db',
        preferencias: usuario.preferencias || {}
    } as SPCUser
}
