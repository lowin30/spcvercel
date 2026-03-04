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
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function run() {
    try {
        // 1. Encontrar al usuario
        const { data: users, error: userError } = await supabase.auth.admin.listUsers();
        if (userError) throw userError;

        const user = users.users.find(u => u.email === 'miretendencia@gmail.com');
        if (!user) {
            console.log("Usuario NO encontrado en Auth");
            return;
        }
        console.log("Usuario encontrado Auth UID:", user.id);

        // 2. Comprobar que sea supervisor en public.usuarios
        const { data: publicUser } = await supabase.from('usuarios').select('*').eq('id', user.id).single();
        console.log("Datos public.usuarios:", publicUser);

        // 3. Obtener el JWT para simular al supervisor (RLS / Vistas con security definer auth.uid())
        // Wait, generating a JWT for simulation is hard in script. 
        // I can just query the tables manually.

        // 4. Ver las tareas de este supervisor
        const { data: asignaciones } = await supabase.from('supervisores_tareas').select('id_tarea').eq('id_supervisor', user.id);
        console.log(`\nEste supervisor tiene ${asignaciones?.length || 0} tareas asignadas:`, asignaciones?.map(a => a.id_tarea));

        if (asignaciones && asignaciones.length > 0) {
            const ids = asignaciones.map(a => a.id_tarea);
            const { data: tareas } = await supabase.from('vista_tareas_supervisor').select('id, titulo, estado_codigo, tiene_presupuesto_base, pb_aprobado, finalizada').in('id', ids);
            console.log("\nTareas del supervisor en 'vista_tareas_supervisor':\n", JSON.stringify(tareas, null, 2));
        }

        // 5. Ver finanzas
        // vista_finanzas_supervisor may use auth.uid() internally.
        const { data: viewDef } = await supabase.rpc('query_view_definition', { view_name: 'vista_finanzas_supervisor' }).catch(() => ({ data: null }));
        console.log("\nDefinition of vista_finanzas_supervisor might use auth.uid().");

        const { data: finanzasManual } = await supabase.from('vista_finanzas_supervisor').select('*').limit(5);
        console.log("\nRaw fetch vista_finanzas_supervisor via admin:", finanzasManual);

    } catch (err) {
        console.error("Error:", err);
    }
}

run();
