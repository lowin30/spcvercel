import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * NUEVO EDIFICIO LOADER v108.0 (Server-Side Data Loading)
 * Usa supabaseAdmin (Service Role) para bypassear RLS.
 */

export async function getNuevoEdificioFormData() {
    // Cargar administradores para el dropdown del formulario
    const { data: administradoresData, error: administradoresError } = await supabaseAdmin
        .from("administradores")
        .select("id, nombre")
        .order("nombre")

    if (administradoresError) {
        console.error("Error al cargar administradores:", administradoresError)
        throw new Error("Error al cargar datos de administradores")
    }

    return {
        administradores: administradoresData || [],
    }
}
