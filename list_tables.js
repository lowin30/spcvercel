
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

async function listTables() {
    console.log("Listing tables in public schema...");
    const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (error) {
        // information_schema might be restricted. Try blindly selecting from known candidates.
        console.log("❌ Error listing tables directly:", error.message);
        console.log("Trying 'gastos'...");
        const { error: e1 } = await supabase.from('gastos').select('id').limit(1);
        if (!e1) console.log("✅ 'gastos' exists");

        console.log("Trying 'gastos_trabajo'...");
        const { error: e2 } = await supabase.from('gastos_trabajo').select('id').limit(1);
        if (!e2) console.log("✅ 'gastos_trabajo' exists");

        console.log("Trying 'expense_entries'...");
        const { error: e3 } = await supabase.from('expense_entries').select('id').limit(1);
        if (!e3) console.log("✅ 'expense_entries' exists");
    } else {
        console.log("✅ Tables:", data.map(t => t.table_name).join(", "));
    }
}

listTables();
