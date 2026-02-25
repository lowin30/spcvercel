import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * AJUSTES LOADER v105.0 (Server-Side Data Loading)
 * Usa supabaseAdmin (Service Role) para bypassear RLS.
 * Patrón idéntico al de Facturas (loader.ts).
 *
 * Contexto: La app usa Descope para auth, NO Supabase Auth.
 * El browser client no tiene sesión Supabase → auth.uid() = NULL → RLS bloquea.
 * Este loader resuelve el problema ejecutando las queries con Service Role.
 */

export async function getAjustesData() {
    // 1. Cargar facturas desde vista_facturas_completa (SIN filtro de admin)
    const { data: facturasData, error: facturasError } = await supabaseAdmin
        .from('vista_facturas_completa')
        .select('*')
        .order('created_at', { ascending: false })

    if (facturasError) {
        console.error("Error al cargar facturas para ajustes:", facturasError)
        throw new Error("Error al cargar las facturas")
    }

    // 2. Cargar administradores activos (para el filtro dropdown)
    const { data: adminsData, error: adminsError } = await supabaseAdmin
        .from('administradores')
        .select('id, nombre')
        .eq('estado', 'activo')
        .order('nombre')

    if (adminsError) {
        console.error("Error al cargar administradores:", adminsError)
    }

    return {
        facturas: facturasData || [],
        administradores: adminsData || []
    }
}
