const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// --- 1. Load Env ---
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

// --- 2. Load and Parse MD ---
const PREVIEW_FILE = path.join(__dirname, '../import_final_manual.md');

// Existing Buildings (Need IDs)
const EDIFICIOS = [
    { "id": 107, "nombre": "Aguero 1623" },
    { "id": 104, "nombre": "Aguero 1638" },
    { "id": 87, "nombre": "Aguero 1659" },
    { "id": 9, "nombre": "Alberti 293" },
    { "id": 100, "nombre": "Alsina 1592" },
    { "id": 108, "nombre": "alvarez 2531" },
    { "id": 102, "nombre": "alvarez 2560" },
    { "id": 40, "nombre": "Araoz 2976" },
    { "id": 10, "nombre": "araoz 2989" },
    { "id": 35, "nombre": "Arce 828" },
    { "id": 86, "nombre": "Arcos 2825" },
    { "id": 84, "nombre": "Belgrano 1325" },
    { "id": 30, "nombre": "Belgrano 2850" },
    { "id": 106, "nombre": "Beruti 4590" },
    { "id": 11, "nombre": "Besares 2396" },
    { "id": 32, "nombre": "Billinghurst 2465" },
    { "id": 90, "nombre": "Billinghurst 415" },
    { "id": 81, "nombre": "boatti 239 moron" },
    { "id": 69, "nombre": "Boatti 239 Moron" },
    { "id": 24, "nombre": "bonifacio 2456" },
    { "id": 96, "nombre": "Bonorino 334" },
    { "id": 38, "nombre": "Brasil 3060" },
    { "id": 89, "nombre": "Brown 1078" },
    { "id": 71, "nombre": "Brown 929 Moron" },
    { "id": 72, "nombre": "Buen Viaje 1102 Moron" },
    { "id": 12, "nombre": "Bulnes 609" },
    { "id": 13, "nombre": "Bulnes 747" },
    { "id": 36, "nombre": "Bustamante 30" },
    { "id": 51, "nombre": "Carril 3177" },
    { "id": 46, "nombre": "Catamarca 1537" },
    { "id": 34, "nombre": "Curapaligue 440" },
    { "id": 56, "nombre": "Donizetti 41" },
    { "id": 55, "nombre": "Echeverria 5835" },
    { "id": 64, "nombre": "Emilio Mitre 190" },
    { "id": 70, "nombre": "Entre Ríos 853" },
    { "id": 101, "nombre": "Falcon 2557" },
    { "id": 110, "nombre": "FRANCISCO MADERO 2036" },
    { "id": 109, "nombre": "FRANCISCO MADERO 2036" },
    { "id": 23, "nombre": "garcia 2468" },
    { "id": 39, "nombre": "Goyena 1360" },
    { "id": 93, "nombre": "Guatemala 4827" },
    { "id": 74, "nombre": "Independencia 2226" },
    { "id": 44, "nombre": "independencia  22" },
    //    { "id": 53, "nombre": "Lecker" },
    { "id": 94, "nombre": "Lemos 40" },
    { "id": 33, "nombre": "Libertad 374" },
    { "id": 25, "nombre": "Libertador 5643" },
    { "id": 26, "nombre": "Libertador 6350" },
    { "id": 31, "nombre": "Medrano 126" },
    { "id": 52, "nombre": "Medrano 1575" },
    { "id": 45, "nombre": "Mitre 4483" },
    { "id": 97, "nombre": "Moron 2910" },
    { "id": 75, "nombre": "NiceTo Vega 4628" },
    { "id": 15, "nombre": "ohiggins 2740" },
    { "id": 7, "nombre": "OHiggins 2749" },
    { "id": 17, "nombre": "ohiggins 2750" },
    { "id": 18, "nombre": "ohiggins 2760" },
    { "id": 88, "nombre": "Olleros 1882" },
    { "id": 43, "nombre": "Paraguay 3724" },
    { "id": 47, "nombre": "Pareja 3205" },
    { "id": 57, "nombre": "Paso 707" },
    { "id": 60, "nombre": "Pasteur 11" },
    { "id": 92, "nombre": "Pedro Goyena 1078" },
    { "id": 67, "nombre": "peron 1936/48/58" },
    { "id": 48, "nombre": "Peron 4015" },
    { "id": 19, "nombre": "pichincha 84" },
    { "id": 59, "nombre": "Primo 2369" },
    { "id": 91, "nombre": "Pujol 1069" },
    { "id": 41, "nombre": "Pumacahua 273" },
    { "id": 95, "nombre": "Ramón Falcón 1642" },
    { "id": 20, "nombre": "riobamba 333" },
    { "id": 103, "nombre": "Rivadavia 1376" },
    { "id": 77, "nombre": "Rivadavia 1954/58" },
    { "id": 29, "nombre": "Rivadavia 2233" },
    { "id": 76, "nombre": "Rivadavia 2559" },
    { "id": 54, "nombre": "Saavedra 1241" },
    { "id": 73, "nombre": "San Juan 1334" },
    { "id": 37, "nombre": "Santo Tome 5691" },
    { "id": 85, "nombre": "Sarandí 235 " },
    { "id": 27, "nombre": "Sarandi 40" },
    { "id": 98, "nombre": "Seguí 776" },
    { "id": 49, "nombre": "Seller Beiro Lecker" },
    { "id": 22, "nombre": "soler 4424" },
    { "id": 21, "nombre": "Soler 4433" },
    { "id": 99, "nombre": "Suipacha 119" },
    //    { "id": 28, "nombre": "Uriburu 75" },
    { "id": 42, "nombre": "Uruguay 1017" },
    { "id": 83, "nombre": "Yrigoyen 1983" }
];

function getBuildingId(name) {
    const found = EDIFICIOS.find(e => e.nombre.toLowerCase() === name.toLowerCase());
    return found ? found.id : null;
}

async function run() {
    const rawData = fs.readFileSync(PREVIEW_FILE, 'utf-8');
    const lines = rawData.split('\n');
    let importedCount = 0;

    // Skip Header and Separator |---|
    let started = false;

    console.log("Starting Import...");

    for (const line of lines) {
        if (!line.startsWith('|')) continue;
        if (line.includes('Nombre Limpio')) { started = true; continue; }
        if (line.includes('---|')) continue;
        if (!started) continue;

        // Parse Line
        // | # | Edificio | Depto | Nombre Limpio | Tipo | Teléfono |
        const parts = line.split('|').map(p => p.trim());
        // Index: 0='', 1='#', 2='Edificio', 3='Depto', 4='Nombre', 5='Tipo', 6='Tel', 7=''

        const edificioName = parts[2];
        const depto = parts[3];
        const nombre = parts[4];
        const tipoOriginal = parts[5];
        const telefono = parts[6];

        if (!edificioName || !telefono) continue;

        const edificioId = getBuildingId(edificioName);
        if (!edificioId) {
            console.error(`Could not find building ID for ${edificioName}`);
            continue;
        }

        // Map Tipo and Handle Consejo
        let relacion = 'Inquilino'; // Default value for DB 'relacion' column
        let notas = '';

        if (tipoOriginal.toLowerCase().includes('encargado')) {
            relacion = 'Encargado'; // Or specific role if DB supports
            // Actually usually Encargado is a specific role, or stored in buildings table. 
            // For now, let's put as 'Encargado' if allowed, or 'Inquilino' with notes.
            // Assumption: 'relacion' field accepts 'Inquilino', 'Propietario'. 
            // If 'Encargado' is not allowed, user might want 'Inquilino'.
        } else if (tipoOriginal.toLowerCase().includes('propietario')) {
            relacion = 'Propietario';
        } else if (tipoOriginal.toLowerCase().includes('consejo')) {
            relacion = 'Propietario';
            notas = 'Miembro del Consejo';
        }

        // Construct Name (Handle empty names)
        let finalName = nombre;
        if (finalName === '--' || finalName === 'Sin Nombre' || !finalName) {
            // Use Dept as placeholder? Or leave empty?
            finalName = `${depto} - ${relacion}`;
        }

        // Insert
        // Columns: nombre, telefono, tipo_padre='edificio', id_padre=edificioId, departamento=depto, relacion=relacion, notas=notas
        const payload = {
            nombre: finalName,
            telefono: telefono,
            tipo_padre: 'edificio',
            id_padre: edificioId,
            departamento: depto, // Assuming 'departamento' is the column name for Unit
            relacion: relacion,
            notas: notas
        };

        const { data, error } = await supabase.from('contactos').insert(payload);

        if (error) {
            console.error(`Failed to insert ${finalName} (${edificioName}):`, error.message);
        } else {
            console.log(`Imported: ${finalName} (${edificioName} ${depto})`);
            importedCount++;
        }
    }

    console.log(`\nDone! Imported ${importedCount} contacts.`);
}

run();
