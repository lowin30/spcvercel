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
    console.log("Fetching buildings...");
    const { data: edificios, error } = await supabase
        .from('edificios')
        .select('id, nombre')
        .ilike('nombre', '%madero%'); // Narrow search first

    if (error) {
        console.error("Error:", error);
    } else {
        if (edificios.length === 0) {
            console.log("No buildings found matching 'madero'. Listing ALL...");
            const { data: all, error: errAll } = await supabase
                .from('edificios')
                .select('id, nombre');
            if (errAll) console.error(errAll);
            else all.forEach(e => console.log(`[ID: ${e.id}] "${e.nombre}"`));
        } else {
            edificios.forEach(e => console.log(`[ID: ${e.id}] "${e.nombre}"`));
        }
    }
}

listBuildings();
