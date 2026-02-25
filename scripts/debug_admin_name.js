const { createClient } = require('@supabase/supabase-js');
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

async function debugAdmin() {
    console.log('--- BUSCANDO EDIFICIO PAREJA 3205 ---');
    const { data: edificios, error: edifError } = await supabase
        .from('edificios')
        .select('id, nombre, id_administrador')
        .ilike('nombre', '%Pareja 3205%');

    if (edifError) {
        console.error('Error edificios:', edifError);
        return;
    }

    console.log('Edificios encontrados:', edificios);

    if (edificios.length > 0) {
        const building = edificios[0];
        console.log('\n--- BUSCANDO ADMINISTRADOR DEL EDIFICIO ---');
        const { data: adminEdif, error: adminError } = await supabase
            .from('contactos')
            .select('id, nombre')
            .eq('id', building.id_administrador);

        console.log('Admin asignado al edificio:', adminEdif);

        console.log('\n--- BUSCANDO PRESUPUESTOS BASE DE ESTE EDIFICIO ---');
        const { data: pbs, error: pbError } = await supabase
            .from('presupuestos_base')
            .select('id, code, id_administrador, id_tarea')
            .eq('id_edificio', building.id);

        if (pbError) console.error(pbError);
        else {
            for (const pb of pbs) {
                const { data: adminPb } = await supabase
                    .from('contactos')
                    .select('id, nombre')
                    .eq('id', pb.id_administrador);

                const { data: tarea } = await supabase
                    .from('tareas')
                    .select('titulo')
                    .eq('id', pb.id_tarea);

                console.log(`PB: ${pb.code} | Tarea: ${tarea?.[0]?.titulo} | Admin ID en PB: ${pb.id_administrador} | Nombre Admin en PB: ${adminPb?.[0]?.nombre}`);
            }
        }
    }
}

debugAdmin();
