"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { createServerClient } from "@/lib/supabase-server"

// --- Actions Públicas ---

export async function obtenerPerfilUsuario() {
    let user
    try {
        user = await validateSessionAndGetUser()
    } catch {
        redirect("/login")
    }

    const supabase = await createServerClient()

    // RLS Policy: [V2] Usuario Propio CRUD - perfil → id = auth.uid()
    // El usuario solo puede leer su propia fila, así que es seguro usar select("*")
    const { data: userData, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", user.id)
        .single()

    if (error) throw new Error("Error de base de datos")

    if (!userData) {
        throw new Error("Usuario no sincronizado. Cierre sesión e intente nuevamente.")
    }

    return userData
}

export async function actualizarAparienciaUsuario(color: string) {
    let user
    try {
        user = await validateSessionAndGetUser()
    } catch {
        return { ok: false, error: "Sesión inválida" }
    }

    const supabase = await createServerClient()

    // RLS Policy: [V2] Usuario Propio CRUD - perfil → id = auth.uid()
    const { error } = await supabase
        .from("usuarios")
        .update({ color_perfil: color })
        .eq("id", user.id)

    if (error) {
        console.error("[actualizarAparienciaUsuario] DB Error:", error)
        return { ok: false, error: "Error al actualizar base de datos" }
    }

    revalidatePath('/dashboard/perfil')
    return { ok: true }
}
