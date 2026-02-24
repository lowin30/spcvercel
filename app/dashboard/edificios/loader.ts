import { createServerClient } from "@/lib/supabase-server"
import { executeSecureQuery } from "@/lib/rls-error-handler"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"

/**
 * EDIFICIOS LOADER v140.0 (Protocolo Triple Barrera)
 * Retorna datos sanitizados RLS y un objeto 'permissions' explícito.
 */
export async function getEdificiosData() {
    const supabase = await createServerClient()
    const user = await validateSessionAndGetUser()

    // 1. Cargar edificios (Filtrado automático por RLS)
    const edificiosRes = await executeSecureQuery(
        supabase
            .from("vista_edificios_completa")
            .select('*')
            .order("created_at", { ascending: false })
    )

    // 2. Cargar administradores para filtro dropdown 
    const adminsRes = await executeSecureQuery(
        supabase
            .from('administradores')
            .select('id, nombre')
            .order('nombre')
    )

    // 3. 🛡️ Construcción de la Primera Barrera (Permissions Object)
    const permissions = {
        canCreateBuilding: user.rol === 'admin',
        canEditBuilding: user.rol === 'admin' || user.rol === 'supervisor',
        canManageDepartments: user.rol === 'admin' || user.rol === 'supervisor'
    }

    return {
        edificios: edificiosRes.success ? (edificiosRes.data || []) : [],
        administradores: adminsRes.success ? (adminsRes.data || []) : [],
        permissions
    }
}
