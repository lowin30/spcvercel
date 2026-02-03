const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
let SUPABASE_URL, SUPABASE_SERVICE_KEY;

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') SUPABASE_URL = value.trim();
            // USE SERVICE ROLE KEY
            if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_SERVICE_KEY = value.trim();
        }
    });
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Admin Credentials not found in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function deleteMaderoAdmin() {
    console.log("Searching for 'francisco madero' with ADMIN privileges...");

    // 1. Find
    const { data: edificios, error } = await supabase
        .from('edificios')
        .select('*')
        .ilike('nombre', '%francisco madero%');

    if (error) {
        console.error("Error searching:", error);
        return;
    }

    if (!edificios || edificios.length === 0) {
        console.log("No buildings found with that name (even with admin key).");
        return;
    }

    console.log(`Found ${edificios.length} buildings:`);
    edificios.forEach(e => console.log(`- [ID: ${e.id}] ${e.nombre}`));

    // 2. Delete
    const ids = edificios.map(e => e.id);
    console.log(`Deleting IDs: ${ids.join(', ')}...`);

    const { error: delError } = await supabase
        .from('edificios')
        .delete()
        .in('id', ids);

    if (delError) {
        console.error("Error deleting:", delError);
    } else {
        console.log("Successfully deleted.");
    }
}

deleteMaderoAdmin();
