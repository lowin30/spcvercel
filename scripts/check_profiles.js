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
            if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_SERVICE_KEY = value.trim();
        }
    });
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkProfiles() {
    console.log("Checking 'profiles' table...");

    // Check if table exists by selecting 1
    const { data, error } = await supabase.from('profiles').select('*').limit(1);

    if (error) {
        console.error("Error accessing profiles:", error.message);
    } else {
        console.log("Profiles table exists.");
        if (data.length > 0) {
            console.log("Sample columns:", Object.keys(data[0]));
        } else {
            console.log("Profiles table is empty. Can't infer columns from data.");
        }
    }

    // Check RLS policies? (Hard via client, easier via SQL if I could run it)
    // I can try to run a raw query via rpc if enabled, but unlikely.
}

checkProfiles();
