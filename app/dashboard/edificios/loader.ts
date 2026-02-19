import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * EDIFICIOS LOADER v107.0 (Server-Side Data Loading)
 * Usa supabaseAdmin (Service Role) para bypassear RLS.
 * Patrón idéntico al de Facturas, Ajustes y Configuración.
 */

export async function getEdificiosData() {
    // 1. Cargar edificios desde vista optimizada
    const { data: edificiosData, error: edificiosError } = await supabaseAdmin
        .from("vista_edificios_completa")
        .select('*')
        .order("created_at", { ascending: false })

    if (edificiosError) {
        console.error("Error al obtener edificios:", edificiosError)
        throw new Error("Error al cargar edificios")
    }

    // 2. Cargar administradores para filtro dropdown
    const { data: adminsData, error: adminsError } = await supabaseAdmin
        .from('administradores')
        .select('id, nombre')
        .order('nombre')

    if (adminsError) {
        console.error("Error al cargar administradores:", adminsError)
    }

    return {
        edificios: edificiosData || [],
        administradores: adminsData || [],
    }
}
