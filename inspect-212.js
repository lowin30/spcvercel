const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gyivcftjrpxfytydkxfd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5aXZjZnRqcnB4Znl0eWRreGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTU4MjIxMDgsImV4cCI6MjAxMTM5ODEwOH0.Iz70rzQUZi89LaCGqSqqcZp0HWApQt4aIpzunKMcuys';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectFactura() {
    console.log('--- INSPECIONANDO FACTURA 212 ---');

    // 1. Obtener datos de la factura
    const { data: factura, error: errorF } = await supabase
        .from('facturas')
        .select('*')
        .eq('id', 212)
        .single();

    if (errorF) {
        console.error('Error al buscar por ID 212:', errorF.message, errorF.code);

        // Intentar buscar por code
        const { data: facturaCode, error: errorC } = await supabase
            .from('facturas')
            .select('*')
            .eq('code', '212')
            .single();

        if (errorC) {
            console.error('Error al buscar por Code 212:', errorC.message, errorC.code);
        } else {
            console.log('Factura encontrada por CODE:', JSON.stringify(facturaCode, null, 2));
        }
    } else {
        console.log('Factura encontrada por ID:', JSON.stringify(factura, null, 2));
    }

    // 2. Revisar si hay administrador asignado
    const { data: admin, error: errorA } = await supabase
        .from('administradores')
        .select('id, nombre')
        .limit(5);

    console.log('Muestra de administradores:', admin);
}

inspectFactura();
