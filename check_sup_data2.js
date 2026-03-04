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
        const userEmail = 'miretendencia@gmail.com';
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users.users.find(u => u.email === userEmail);
        console.log("Supervisor UUID:", user.id);

        const ids = [222, 265, 197];

        // Test view error
        const { data: tareas, error } = await supabase.from('vista_tareas_supervisor').select('*').in('id', ids);
        if (error) {
            console.log("!!! ERROR in vista_tareas_supervisor !!!");
            console.log(error);
        } else {
            console.log("Data from vista_tareas_supervisor:", tareas);
        }

        const { data: finanzas, error: errFin } = await supabase.from('vista_finanzas_supervisor').select('*');
        if (errFin) {
            console.log("!!! ERROR finanzas !!!");
            console.log(errFin);
        } else {
            console.log("Finanzas:", finanzas);
        }

    } catch (err) {
        console.error("Fatal Error:", err);
    }
}

run();
