
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.local');

// Load environment variables
let envConfig = {};
if (fs.existsSync(envPath)) {
    envConfig = require('dotenv').parse(fs.readFileSync(envPath));
}

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let serviceRoleKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) serviceRoleKey = supabaseKey; // Fallback

console.log("URL:", supabaseUrl);
console.log("Key:", serviceRoleKey ? "Found" : "Missing");

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTeam() {
    console.log("2. Inspecting 'tareas' table structure...");
    const { data: tareas, error: error1 } = await supabase
        .from('tareas')
        .select('*')
        .limit(1);

    if (error1) {
        console.error("❌ Failed to query tareas:", error1.message);
    } else {
        console.log("✅ Tareas sample:");
        if (tareas && tareas.length > 0) {
            const keys = Object.keys(tareas[0]);
            console.log("Columns:", keys.join(", "));
            console.log("First row data:", JSON.stringify(tareas[0], null, 2));
        } else {
            console.log("No tasks found.");
        }
    }
}

checkTeam();
