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
    console.error("Faltan credenciales de Supabase");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function slugify(text) {
    if (!text) return "";
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[^a-z0-9]/g, '-') // Reemplazar no-alfanumericos por -
        .replace(/-+/g, '-') // Quitar guiones duplicados
        .replace(/^-+|-+$/g, ''); // Quitar guiones al principio/final
}

async function restoreIdentities() {
    console.log("--- Restauración de Identidad & Slugs (SPC Platinum) ---");

    // 1. Obtener contactos con nombres de edificios
    const { data: contacts, error } = await supabase
        .from('contactos')
        .select(`
            id, 
            nombre, 
            "nombreReal", 
            departamento, 
            relacion, 
            id_padre, 
            tipo_padre,
            departamento_id
        `)
        .order('id');

    if (error) {
        console.error("Error obteniendo contactos:", error);
        return;
    }

    // 2. Obtener nombres de edificios para el join manual
    const { data: buildings } = await supabase.from('edificios').select('id, nombre');
    const buildingMap = new Map(buildings?.map(e => [e.id, e.nombre]) || []);

    console.log(`Analizando ${contacts.length} registros...`);

    for (const c of contacts) {
        const edificioNombre = c.tipo_padre === 'edificio' ? buildingMap.get(c.id_padre) : "";
        const depto = c.departamento || "";
        const relacion = c.relacion || "";
        let nombreReal = c["nombreReal"];

        // FASE 1: RESCATE (Si nombreReal es null o vacío)
        if (!nombreReal || nombreReal.trim() === "") {
            let baseName = c.nombre;
            const edSlug = slugify(edificioNombre);
            const depSlug = slugify(depto);
            
            // Si el slug actual contiene el depto o el edificio, intentar limpiarlo
            if (baseName.toLowerCase().includes(depSlug) && depSlug !== "") {
                baseName = baseName.toLowerCase().replace(depSlug, '').trim();
            }
            if (edSlug !== "" && baseName.toLowerCase().includes(edSlug)) {
                baseName = baseName.toLowerCase().replace(edSlug, '').trim();
            }
            
            // Limpiar remanentes de guiones y espacios
            nombreReal = baseName.replace(/^-+|-+$/g, '').replace(/-/g, ' ').trim();
            
            // Si después de limpiar quedó vacío (ej: era solo "6A - Inquilino"), usar la relación como nombre o "Sin Nombre"
            if (!nombreReal) {
               if (relacion) nombreReal = relacion;
               else nombreReal = "Sin Nombre";
            }
        }

        // FASE 2: PROTOCOLIZACIÓN (Regenerar slug)
        const parts = [];
        if (edificioNombre) parts.push(slugify(edificioNombre));
        if (depto) parts.push(slugify(depto));
        if (nombreReal) parts.push(slugify(nombreReal));
        if (relacion) parts.push(slugify(relacion));

        const nuevoSlug = parts.join('-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');

        // FASE 3: GRABACIÓN
        if (nuevoSlug !== c.nombre || nombreReal !== c["nombreReal"]) {
            console.log(`ID ${c.id}: [${c.nombre}] -> [${nuevoSlug}] (Real: ${nombreReal})`);
            
            const { error: uError } = await supabase
                .from('contactos')
                .update({
                    nombre: nuevoSlug,
                    "nombreReal": nombreReal
                })
                .eq('id', c.id);

            if (uError) {
                console.error(`Error en ID ${c.id}:`, uError.message);
            }
        }
    }

    console.log("\nProceso finalizado.");
}

restoreIdentities();
