import "server-only"
import { descopeClient } from "@/lib/descope-client"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export type SPCUser = {
    id: string
    rol: string
    email: string
}

/**
 * IDENTITY BRIDGE v2.0
 * Valida la sesión de Descope y recupera el usuario de Supabase (Service Role)
 * @throws Error si el usuario no esta registrado o error interno.
 * @redirects /login si no hay sesion valida.
 */
export async function validateSessionAndGetUser(): Promise<SPCUser> {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("DS")?.value

    if (!sessionToken) {
        // Log para debuguear bugs de Vercel (cookie missing)
        console.error("Auth Bridge: No Session Token (DS Cookie missing). Cookies:", cookieStore.getAll().map(c => c.name))
        redirect('/login')
    }

    let authInfo;
    try {
        // 1. Validar Token Descope
        authInfo = await descopeClient.validateSession(sessionToken)
    } catch (error) {
        console.error("Auth Bridge: Session Validation Failed (Expired/Invalid)", error)
        // No redirect here to avoid swallowing NEXT_REDIRECT
    }

    if (!authInfo) {
        redirect('/login')
    }

    // 2. Extraer Email
    const email = authInfo.token.email || authInfo.token.sub
    if (!email) {
        console.error("Auth Bridge: No email in token")
        redirect('/login')
    }

    // 3. Buscar Usuario en DB (Bypass RLS)
    const { data: usuario, error } = await supabaseAdmin
        .from('usuarios')
        .select('id, rol, email')
        .ilike('email', email)
        .single()

    if (error || !usuario) {
        console.error(`Auth Bridge: User not found in DB for email ${email}`, error)
        // En este caso lanzamos error porque el usuario ESTA logueado en Descope pero no tiene acceso al sistema SPC.
        // Redirigir al login seria un loop infinito si Descope sigue validando la sesion ok.
        throw new Error("Usuario no registrado en el sistema. Contacte al administrador.")
    }

    return usuario as SPCUser
}
