
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listUsers() {
    // Check if we can read users table (often restricted, but worth a try with service key if we had it, but we only have anon)
    // Actually, we can try to sign up a test user or see if we can read 'usuarios' table if RLS allows public read (unlikely).
    // Better: Check if there is a known test user in the code or seeds.

    // Let's just try to read one user from public table 'usuarios' (which is usually a profile table linked to auth.users)
    const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error reading users:', error);
    } else {
        console.log('User found:', data);
    }
}

listUsers();
