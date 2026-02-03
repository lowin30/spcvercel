const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load Env
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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listTestData() {
    console.log("Searching for 'prueba', 'test', 'demo'...");

    // 1. Search Buildings
    const { data: edificios, error: errEd } = await supabase
        .from('edificios')
        .select('*')
        .or('nombre.ilike.%prueba%,nombre.ilike.%test%,nombre.ilike.%demo%');

    if (errEd) console.error("Error searching buildings:", errEd.message);

    if (edificios && edificios.length > 0) {
        console.log("\n🏢 Edificios de Prueba:");
        edificios.forEach(e => console.log(`- [ID: ${e.id}] ${e.nombre}`));
    } else {
        console.log("\n🏢 No se encontraron Edificios de Prueba.");
    }

    // 2. Search Contacts (Departments)
    // Buscamos en 'contactos' donde el departamento o el nombre parezca test
    const { data: contactos, error: errCon } = await supabase
        .from('contactos')
        .select('id, nombre, departamento, id_padre, tipo_padre')
        .or('departamento.ilike.%prueba%,departamento.ilike.%test%,departamento.ilike.%demo%,nombre.ilike.%prueba%,nombre.ilike.%test%,nombre.ilike.%demo%');

    if (errCon) console.error("Error searching contacts/depts:", errCon.message);

    if (contactos && contactos.length > 0) {
        console.log("\n🚪 Departamentos/Contactos de Prueba (Por nombre/depto):");
        for (const c of contactos) {
            let lugar = 'Desconocido';
            if (c.tipo_padre === 'edificio' && c.id_padre) {
                const { data: ed } = await supabase.from('edificios').select('nombre').eq('id', c.id_padre).single();
                if (ed) lugar = ed.nombre;
            }
            console.log(`- [ID: ${c.id}] ${c.nombre} (Depto: ${c.departamento}) en ${lugar}`);
        }
    } else {
        console.log("\n🚪 No se encontraron Departamentos/Contactos explícitos de prueba.");
    }

    // 3. Contacts in specific Test Buildings (if any found in step 1)
    if (edificios && edificios.length > 0) {
        const ids = edificios.map(e => e.id);
        const { data: contactsInTest, error: errInTest } = await supabase
            .from('contactos')
            .select('id, nombre, departamento')
            .in('id_padre', ids)
            .eq('tipo_padre', 'edificio');

        if (contactsInTest && contactsInTest.length > 0) {
            console.log(`\n👥 Contactos dentro de Edificios de Prueba (${contactsInTest.length}):`);
            contactsInTest.forEach(c => console.log(`- [ID: ${c.id}] ${c.nombre} (Depto: ${c.departamento})`));
        }
    }

}

listTestData();
