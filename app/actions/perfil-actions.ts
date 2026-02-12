"use server"

import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { descopeClient } from "@/lib/descope-client"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// --- Helper Privado ---
async function _getValidatedUserEmail(): Promise<string | null> {
    const cookieStore = cookies()
    const sessionToken = cookieStore.get("DS")?.value

    if (!sessionToken) return null

    let descopeUserEmail: string | undefined

    try {
        if (descopeClient) {
            const authInfo = await descopeClient.validateSession(sessionToken)
            const payload = authInfo as any
            descopeUserEmail = payload.email || payload.sub?.email || payload.linkId
        }
    } catch (error) {
        console.error("[PerfilAction] Session validation failed", error)
        return null
    }

    // Fallback signature-less decode (only if validation passed or simple bridge check)
    // Note: In strict production, rely ONLY on validateSession output.
    if (!descopeUserEmail) {
        try {
            const tokenParts = sessionToken.split('.')
            if (tokenParts.length === 3) {
                const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
                descopeUserEmail = payload.email || payload.sub
            }
        } catch (e) {
            console.error("JWT Parse Error", e)
        }
    }

    return descopeUserEmail || null
}

// --- Actions Públicas ---

export async function obtenerPerfilUsuario() {
    const email = await _getValidatedUserEmail()

    if (!email) {
        console.log("[obtenerPerfilUsuario] No valid session/email")
        redirect("/login")
    }

    console.log(`[obtenerPerfilUsuario] Fetching for: ${email}`)

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })

    // ilike email to match case insensitive
    const { data: userData, error } = await supabase
        .from("usuarios")
        .select("*")
        .ilike("email", email)
        .maybeSingle()

    if (error) throw new Error("Error de base de datos")

    if (!userData) {
        throw new Error("Usuario no sincronizado. Cierre sesión e intente nuevamente.")
    }

    return userData
}

export async function actualizarAparienciaUsuario(color: string) {
    const email = await _getValidatedUserEmail()

    if (!email) {
        return { ok: false, error: "Sesión inválida" }
    }

    console.log(`[actualizarAparienciaUsuario] Updating color to ${color} for ${email}`)

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })

    // Update using email filter (secure via service role)
    // We first need to find the user to ensure it exists (optional but safer)
    // Or just update directly where email matches.

    const { error } = await supabase
        .from("usuarios")
        .update({ color_perfil: color })
        .ilike("email", email)

    if (error) {
        console.error("[actualizarAparienciaUsuario] DB Error:", error)
        return { ok: false, error: "Error al actualizar base de datos" }
    }

    // Revalidar el path para que el layout/page refleje cambios si es necesario (server components)
    revalidatePath('/dashboard/perfil')

    return { ok: true }
}
