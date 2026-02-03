const { createClient } = require('@supabase/supabase-js');
// Need access to ENV vars or hardcoded keys?
// Usually keys are in .env.local
// Let's rely on reading .env.local first
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Credentials not found in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSchema() {
    // Try to insert a dummy row to get error about columns? Or select * limit 1?
    const { data, error } = await supabase.from('contactos').select('*').limit(1);
    if (error) {
        console.error('Error fetching:', error);
    } else {
        if (data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('Table empty, cannot infer columns easily. Trying to insert known cols to see if it works.');
        }
    }
}

checkSchema();
