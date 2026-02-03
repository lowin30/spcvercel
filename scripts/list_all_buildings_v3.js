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

async function listBuildings() {
    console.log("Fetching ALL buildings (limit 1000)...");
    const { data: all, error: errAll } = await supabase
        .from('edificios')
        .select('id, nombre')
        .limit(1000)
        .order('nombre', { ascending: true });

    if (errAll) console.error("Error:", errAll);
    else {
        console.log(`Found ${all.length} buildings.`);
        all.forEach(e => console.log(`[ID: ${e.id}] "${e.nombre}"`));
    }
}

listBuildings();
