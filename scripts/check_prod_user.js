require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkUser() {
    const email = 'lowin30@gmail.com';
    console.log(`Checking user: ${email}`);

    // 1. Exact match
    const { data: exact, error: exactError } = await supabase
        .from('usuarios')
        .select('id, email, rol, nombre')
        .eq('email', email);

    if (exactError) console.error('Exact Error:', exactError);
    console.log('Exact Match:', exact);

    // 2. Case insensitive (if needed, but usually email is key)
    // emulating with ilike if possible or just fetching all and filtering (dangerous if many users, but fine for test)
    const { data: all, error: allError } = await supabase
        .from('usuarios')
        .select('id, email, rol, nombre')
        .ilike('email', email);

    if (allError) console.error('All Error:', allError);
    console.log('ILIKE Match:', all);
}

checkUser();
