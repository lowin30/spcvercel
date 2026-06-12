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
    console.log("=== COLUMNS OF presupuestos_finales ===");
    const { data, error } = await supabase.from('presupuestos_finales').select('*').limit(1);
    if (error) console.error(error);
    else console.log(Object.keys(data[0] || {}));

    console.log("\n=== COLUMNS OF facturas ===");
    const { data: dataF, error: errorF } = await supabase.from('facturas').select('*').limit(1);
    if (errorF) console.error(errorF);
    else console.log(Object.keys(dataF[0] || {}));
}

run();
