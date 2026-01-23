
const { createClient } = require('@supabase/supabase-js');


const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.local');

let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;


if (fs.existsSync(envPath)) {
    const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
    if (envConfig.SUPABASE_SERVICE_ROLE_KEY) {
        serviceRoleKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;
    }
    // Load others
    process.env.NEXT_PUBLIC_SUPABASE_URL = envConfig.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    console.error("No Supabase URL found in .env.local");
    process.exit(1);
}

if (!serviceRoleKey) {
    console.warn("No Service Role Key found. Using Anon Key (RLS might block results).");
    serviceRoleKey = supabaseKey;
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
    // 1. Get User ID for traba1@gmail.com
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    const traba1 = users.find(u => u.email === 'traba1@gmail.com');
    if (!traba1) {
        console.log("User traba1@gmail.com not found");
        return;
    }

    console.log("Traba1 ID:", traba1.id);

    // 2. Check Expenses
    const { data: gastos, error: gastosError } = await supabase
        .from('gastos_tarea')
        .select('*')
        .eq('id_usuario', traba1.id)
        .is('id_liquidacion', null); // Check NULL specifically

    if (gastosError) {
        console.error("Error fetching gastos:", gastosError);
    } else {
        console.log(`Found ${gastos.length} PENDING expenses for traba1:`);
        const total = gastos.reduce((sum, g) => sum + g.monto, 0);
        console.log(`Total Pending Amount: ${total}`);
        gastos.forEach(g => {
            console.log(`- ID: ${g.id} | Monto: ${g.monto} | Fecha: ${g.fecha_gasto}`);
        });
    }

    // 3. Check Specific Liquidation 29
    const { data: liq, error: liqError } = await supabase
        .from('liquidaciones_trabajadores')
        .select('*')
        .eq('id', 29)
        .single();

    if (liqError) {
        console.error("Error fetching liquidation 29:", liqError);
    } else {
        console.log("Liquidation 29 Details:");
        console.log(liq);
    }
}

check();
