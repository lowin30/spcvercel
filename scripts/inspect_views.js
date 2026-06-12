const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
let SUPABASE_URL, SUPABASE_KEY;

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
            if (key === 'NEXT_PUBLIC_SUPABASE_URL') SUPABASE_URL = value;
            if (key === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_KEY = value;
        }
    });
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log("=== VISTA vista_presupuestos_finales_completa ===");
    const { data: pfData, error: pfErr } = await supabase.from('vista_presupuestos_finales_completa').select('*').eq('id', 313).single();
    if (pfErr) console.error(pfErr);
    else console.log(pfData);

    console.log("\n=== VISTA vista_tareas_admin ===");
    const { data: tData, error: tErr } = await supabase.from('vista_tareas_admin').select('*').eq('id', 379).single();
    if (tErr) console.error(tErr);
    else console.log(tData);

    console.log("\n=== VISTA vista_tareas_completa ===");
    const { data: tcData, error: tcErr } = await supabase.from('vista_tareas_completa').select('*').eq('id', 379).single();
    if (tcErr) console.error(tcErr);
    else console.log(tcData);
}

run();
