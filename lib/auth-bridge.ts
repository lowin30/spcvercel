import "server-only"
import { descopeClient } from "@/lib/descope-client"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { cookies } from "next/headers"

export type SPCUser = {
    id: string
    rol: string
    email: string
    id_delegacion?: number | null
}

/**
 * IDENTITY BRIDGE v2.0
 * Valida la sesión de Descope y recupera el usuario de Supabase (Service Role)
 * @throws Error si no hay sesión o el usuario no existe.
 */
export async function validateSessionAndGetUser(): Promise<SPCUser> {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("DS")?.value

    if (!sessionToken) {
        throw new Error("Unauthorized: No session token found")
    }

    try {
        // 1. Validar Token Descope
        const authInfo = await descopeClient.validateSession(sessionToken)

        // 2. Extraer Email
        const email = authInfo.token.email || authInfo.token.sub
        if (!email) {
            throw new Error("Unauthorized: No email in token")
        }

        // 3. Buscar Usuario en DB (Bypass RLS)
        const { data: usuario, error } = await supabaseAdmin
            .from('usuarios')
            .select('id, rol, id_delegacion, email')
            .ilike('email', email)
            .single()

        if (error || !usuario) {
            console.error(`Auth Bridge: User not found for email ${email}`, error)
            throw new Error("Forbidden: User not registered")
        }

        return usuario as SPCUser

    } catch (error) {
        console.error("Auth Bridge Error:", error)
        throw new Error("Unauthorized: Invalid Session")
    }
}
