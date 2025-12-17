import type { SupabaseClient } from '@supabase/supabase-js'

export type VistaFactura = any

export async function getFacturasVista(
  supabase: SupabaseClient,
  opts: { adminId?: number | null; limit?: number; offset?: number } = {}
) {
  const { adminId = null, limit = 100, offset = 0 } = opts

  let query = supabase
    .from('vista_facturas_completa')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (adminId && adminId !== 0) {
    query = query.eq('id_administrador', adminId)
  }

  return query
}
