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
    console.log("=== LISTING TRIGGERS IN PUBLIC SCHEMA ===");
    try {
        const { data, error } = await supabase.rpc('verificar_trigger_existe', { nombre_trigger: 'dummy' });
        console.log("RPC verificar_trigger_existe returned:", { data, error });
    } catch (e) {
        console.error("RPC call failed:", e);
    }
    
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
        console.log("Dependencies:", Object.keys(pkg.dependencies || {}));
    } catch (e) {
        console.error("Failed to read package.json:", e);
    }
}

run();
