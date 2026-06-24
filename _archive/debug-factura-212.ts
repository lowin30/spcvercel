import { supabaseAdmin } from './lib/supabase-admin'

async function debugFactura() {
    console.log('--- DIAGNÓSTICO FACTURA 212 ---')

    // 1. Buscar por ID numérico
    const { data: byId, error: errorId } = await supabaseAdmin
        .from('facturas')
        .select('*')
        .eq('id', 212)
        .maybeSingle()

    console.log('Búsqueda por ID 212:', byId ? 'ENCONTRADA' : 'NO ENCONTRADA')
    if (errorId) console.error('Error búsqueda ID:', errorId)

    // 2. Buscar por CODE
    const { data: byCode, error: errorCode } = await supabaseAdmin
        .from('facturas')
        .select('*')
        .eq('code', '212')
        .maybeSingle()

    console.log('Búsqueda por CODE "212":', byCode ? 'ENCONTRADA' : 'NO ENCONTRADA')
    if (errorCode) console.error('Error búsqueda CODE:', errorCode)

    // 3. Inspeccionar estructura de la tabla (vía RPC o consulta dummy)
    if (byId || byCode) {
        const f = byId || byCode
        console.log('Datos de la factura:', JSON.stringify(f, null, 2))
        console.log('ID type:', typeof f.id)
        console.log('ID value:', f.id)
        console.log('id_administrador:', f.id_administrador)
        console.log('saldo_pendiente:', f.saldo_pendiente)
    } else {
        // Buscar las últimas 5 facturas para ver el formato de ID
        const { data: recent } = await supabaseAdmin
            .from('facturas')
            .select('id, code')
            .order('created_at', { ascending: false })
            .limit(5)

        console.log('Últimas 5 facturas:', recent)
    }
}

debugFactura()
