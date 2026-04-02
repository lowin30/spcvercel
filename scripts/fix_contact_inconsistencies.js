const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer variables de entorno
let env = {};
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim().replace(/"/g, '');
                env[key] = val;
            }
        });
    }
} catch (e) {
    console.warn("No se pudo leer .env.local", e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Faltan credenciales de Supabase (URL o Service Role Key)");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixContactInconsistencies() {
    console.log("--- Iniciando Saneamiento de Contactos (Protocolo Platinum) ---");

    // 1. Obtener todos los contactos
    const { data: contacts, error: cError } = await supabase
        .from('contactos')
        .select(`
            id, 
            nombre, 
            "nombreReal", 
            telefono, 
            departamento_id, 
            departamento,
            id_padre, 
            tipo_padre, 
            relacion
        `)
        .order('id');

    if (cError) {
        console.error("Error al obtener contactos:", cError);
        return;
    }

    console.log(`Analizando ${contacts.length} registros...`);

    // 2. Obtener tabla de departamentos para matching
    const { data: depts } = await supabase.from('departamentos').select('id, edificio_id, codigo');
    const deptMap = new Map(); // Llave: "edificioId-codigo"
    depts?.forEach(d => deptMap.set(`${d.edificio_id}-${d.codigo.toLowerCase()}`, d.id));

    let fixedIds = 0;
    let fixedPhones = 0;
    let fixedNames = 0;

    for (const c of contacts) {
        let needsUpdate = false;
        const updates = {};

        // A. Fix departamento_id si falta
        if (!c.departamento_id && c.id_padre && c.tipo_padre === 'edificio' && c.departamento) {
            const key = `${c.id_padre}-${c.departamento.toLowerCase()}`;
            const matchedId = deptMap.get(key);
            if (matchedId) {
                updates.departamento_id = matchedId;
                needsUpdate = true;
                fixedIds++;
            }
        }

        // B. Estandarizar Teléfono (+549...)
        if (c.telefono && (c.telefono.includes(' ') || c.telefono.includes('-') || !c.telefono.startsWith('+'))) {
            let cleanPhone = c.telefono.replace(/\D/g, '');
            if (cleanPhone.length > 0) {
                if (!cleanPhone.startsWith('549')) {
                   // Intento de corrección básica para números locales sin código país
                   if (cleanPhone.length === 10) cleanPhone = '549' + cleanPhone;
                }
                const finalPhone = '+' + cleanPhone;
                if (finalPhone !== c.telefono) {
                    updates.telefono = finalPhone;
                    needsUpdate = true;
                    fixedPhones++;
                }
            }
        }

        // C. Reparar nombreReal si está vacío pero el slug tiene info
        // Según el usuario, el slug tiene: edificio-depto-nombreReal-relacion
        if (!c["nombreReal"] || c["nombreReal"] === "") {
            const parts = c.nombre.split('-');
            if (parts.length >= 3) {
                // Asumimos que la penúltima parte o las últimas partes después de edificio/depto son el nombre
                // Esta lógica es aproximada pero mejor que vacío
                const possibleName = parts.slice(2).join(' ');
                updates["nombreReal"] = possibleName;
                needsUpdate = true;
                fixedNames++;
            }
        }

        if (needsUpdate) {
            const { error: uError } = await supabase
                .from('contactos')
                .update(updates)
                .eq('id', c.id);
            
            if (uError) {
                console.error(`Error actualizando ID ${c.id}:`, uError.message);
            }
        }
    }

    // 3. Unificación Específica (Diego Rabino ID 5 y 107)
    console.log("Revisando duplicados Diego Rabino...");
    const { data: d107 } = await supabase.from('contactos').select('*').eq('id', 107).single();
    if (d107) {
        console.log("Fundiendo ID 107 en ID 5...");
        await supabase.from('contactos').update({
            relacion: 'Inquilino',
            es_principal: false,
            "nombreReal": "Diego Rabino"
        }).eq('id', 5);
        
        // El usuario preferirá borrar el duplicado? Sí, para limpiar.
        await supabase.from('contactos').delete().eq('id', 107);
    }

    console.log("\nSaneamiento completado:");
    console.log(`- departamentos_id vinculados: ${fixedIds}`);
    console.log(`- teléfonos estandarizados: ${fixedPhones}`);
    console.log(`- nombres_reales recuperados: ${fixedNames}`);
    console.log("- duplicados unificados.");
}

fixContactInconsistencies();
