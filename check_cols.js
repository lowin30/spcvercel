const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    try {
        // Para ver información de la vista necesitamos hacer un query
        // Supabase JS no permite consultar information_schema directamente vía HTTP API sin RPC,
        // Pero podemos sacar una sola fila de `vista_tareas_supervisor` para ver TODAS las llaves que devuelve.
        const { data: cols } = await supabase.from('vista_tareas_supervisor').select('*').limit(1);
        console.log("Columnas disponibles:", Object.keys(cols[0]));

        // Ver los KPIs de admin (vista_finanzas_supervisor)
        const { data: finanzas } = await supabase.from('vista_finanzas_supervisor').select('*').limit(1);
        console.log("\nKPIs vista_finanzas_supervisor (admin auth):", finanzas);
    } catch (err) {
        console.error("Fatal Error:", err);
    }
}

run();
