const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://fodyzgjwoccpsjmfinvm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvZHl6Z2p3b2NjcHNqbWZpbnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MTc4NzgsImV4cCI6MjA2MzI5Mzg3OH0.kpthf8iRunvBCcbk73Csvi2zmK_kMFPjS3wmnM79GNQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAdmins() {
    console.log('--- BUSCANDO EN TABLA ADMINISTRADORES ---');
    const { data: admins, error: aError } = await supabase
        .from('administradores')
        .select('*');

    if (aError) {
        console.error('Error Administradores (tal vez no existe?):', aError);
    } else {
        console.log('Administradores encontrados:', admins);
    }

    console.log('\n--- BUSCANDO EDIFICIO PAREJA 3205 ---');
    const { data: edificios } = await supabase
        .from('edificios')
        .select('id, nombre, id_administrador')
        .ilike('nombre', '%Pareja 3205%');
    console.log('Edificios:', edificios);

    if (edificios?.[0]) {
        console.log('\n--- BUSCANDO ADMIN ID 9 ---');
        const { data: admin9 } = await supabase
            .from('administradores')
            .select('*')
            .eq('id', 9);
        console.log('Admin ID 9:', admin9);
    }
}

checkAdmins();
