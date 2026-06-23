import { createServerClient } from "@/lib/supabase-server"
import { executeSecureQuery } from "@/lib/rls-error-handler"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"

/**
 * EDIFICIOS LOADER v140.0 (Protocolo Triple Barrera)
 * Retorna datos sanitizados RLS y un objeto 'permissions' explícito.
 */
export async function getEdificiosData(filters: { search?: string, id_administrador?: string, estado?: string } = {}) {
    const supabase = await createServerClient()
    const user = await validateSessionAndGetUser()
    const { search, id_administrador, estado } = filters

    let edificiosRes;

    // 1. Cargar edificios (Filtrado automático por RLS)
    if (search && search.trim().length >= 2) {
        // Llamar a RPC buscar_edificios_super_inteligente
        const rpcRes = await executeSecureQuery(
            supabase.rpc('buscar_edificios_super_inteligente', {
                p_query: search.trim(),
                p_id_administrador: id_administrador && id_administrador !== '_todos_' ? parseInt(id_administrador, 10) : null,
                p_estado: estado && estado !== '_todos_' ? estado : null,
                p_limit: 100
            })
        )

        if (rpcRes.success && rpcRes.data && rpcRes.data.length > 0) {
            const ids = rpcRes.data.map((r: any) => r.id)
            
            // Cargar los datos completos de vista_edificios_completa para estos IDs
            const edificiosCompletosRes = await executeSecureQuery(
                supabase
                    .from("vista_edificios_completa")
                    .select('*')
                    .in('id', ids)
            )

            if (edificiosCompletosRes.success && edificiosCompletosRes.data) {
                // Ordenar los edificios completos según la relevancia devuelta por la RPC
                const idToRelevance = new Map(rpcRes.data.map((r: any) => [r.id, r.relevancia]))
                const edificiosOrdenados = edificiosCompletosRes.data.sort((a, b) => {
                    const relA = idToRelevance.get(a.id) || 0
                    const relB = idToRelevance.get(b.id) || 0
                    return relB - relA
                })
                edificiosRes = { success: true, data: edificiosOrdenados }
            } else {
                edificiosRes = edificiosCompletosRes
            }
        } else {
            edificiosRes = { success: true, data: [] }
        }
    } else {
        // Sin búsqueda activa, usar vista_edificios_completa
        let query = supabase
            .from("vista_edificios_completa")
            .select('*')

        if (id_administrador && id_administrador !== '_todos_') {
            query = query.eq('id_administrador', parseInt(id_administrador, 10))
        }

        if (estado && estado !== '_todos_') {
            query = query.eq('estado', estado)
        }

        edificiosRes = await executeSecureQuery(
            query.order("created_at", { ascending: false })
        )
    }

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
