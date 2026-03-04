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
    const supervisorId = 'fc57e570-2950-4ed5-bfdc-d1bca5423c8e'; // miretendencia

    // What are the finances for this supervisor manually?
    const { data: lf } = await supabase.from('liquidaciones_supervisores').select('*').eq('id_supervisor', supervisorId);
    console.log("Liquidaciones:", lf);

    // What are the completed tasks for this month?
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { data: tareas } = await supabase.from('supervisores_tareas')
        .select('id_tarea')
        .eq('id_supervisor', supervisorId);

    if (tareas) {
        const ids = tareas.map(t => t.id_tarea);
        const { data: presupuestos } = await supabase
            .from('presupuestos_finales')
            .select('monto_supervisor')
            .in('id_tarea', ids)
            .eq('aprobado', true);

        console.log("Presupuestos Finales aportando a la ganancia:", presupuestos);
    }
}

run();
