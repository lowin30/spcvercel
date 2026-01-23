
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.local');

let envConfig = {};
if (fs.existsSync(envPath)) {
    envConfig = require('dotenv').parse(fs.readFileSync(envPath));
}

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let serviceRoleKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) serviceRoleKey = supabaseKey;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function findTask() {
    console.log("Searching for task 'Julián Alvarez'...");
    const { data, error } = await supabase
        .from('tareas')
        .select('id, titulo') // Removed non-existent 'estado'
        .ilike('titulo', '%Julián Alvarez%')
        .limit(5);

    if (error) {
        console.error("❌ Error finding task:", error.message);
    } else {
        console.log("✅ Tasks Found:");
        console.log(JSON.stringify(data, null, 2));
    }
}

findTask();
