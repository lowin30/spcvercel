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
    console.log("Querying view definitions...");
    const views = ['vista_presupuestos_finales_completa', 'vista_tareas_completa', 'vista_tareas_admin'];
    
    for (const view of views) {
        const { data, error } = await supabase.rpc('execute_sql', {
            query: `SELECT view_definition FROM information_schema.views WHERE table_name = '${view}';`
        });
        if (error) {
            console.error(`Error querying ${view}:`, error);
        } else {
            console.log(`\n=== Definition of ${view} ===`);
            if (data && data.length > 0) {
                console.log(data[0].view_definition);
            } else {
                console.log("No definition found.");
            }
        }
    }
}

run();
