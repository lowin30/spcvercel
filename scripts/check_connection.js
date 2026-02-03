const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
let SUPABASE_URL, SUPABASE_KEY;

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') SUPABASE_URL = value.trim();
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') SUPABASE_KEY = value.trim();
        }
    });
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    console.log("Checking Supabase Connection...");

    // 1. Check Contactos
    const { data: c, error: cErr, count } = await supabase
        .from('contactos')
        .select('id', { count: 'exact', head: true });

    if (cErr) console.error("Contactos Error:", cErr);
    else console.log(`Contactos Count: ${count}`);

    // 2. Check Edificios
    const { data: e, error: eErr, count: eCount } = await supabase
        .from('edificios')
        .select('id', { count: 'exact', head: true });

    if (eErr) console.error("Edificios Error:", eErr);
    else console.log(`Edificios Count: ${eCount}`);

    // 3. Try to select one building
    const { data: oneBuild } = await supabase.from('edificios').select('*').limit(1);
    console.log("First Building:", oneBuild);
}

check();
