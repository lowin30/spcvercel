
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

if (!serviceRoleKey) serviceRoleKey = supabaseKey;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkSchema() {
    console.log("Inspecting 'trabajadores_tareas' table structure...");
    const { data, error } = await supabase
        .from('trabajadores_tareas')
        .select('*')
        .limit(1);

    if (error) {
        console.error("❌ Failed to query:", error.message);
    } else {
        console.log("✅ Sample Row:");
        if (data && data.length > 0) {
            const keys = Object.keys(data[0]);
            console.log("Columns:", keys.join(", "));
            console.log("Row:", JSON.stringify(data[0], null, 2));
        } else {
            console.log("No rows found. Cannot infer columns easily via select *.");
        }
    }
}

checkSchema();
