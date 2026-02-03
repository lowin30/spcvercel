
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
let env = {};
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim().replace(/"/g, '');
            env[key] = val;
        }
    });
} catch (e) {
    console.warn("Could not read .env.local", e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanContacts() {
    console.log("--- Starting FINAL Cleaner (Removing 'Sin Nombre' text) ---");

    // 1. Fetch contacts with context
    const { data: contacts, error } = await supabase
        .from('contactos')
        .select(`
      id, 
      nombre, 
      "nombreReal", 
      departamento_id,
      relacion, 
      departamentos (
        codigo,
        edificios ( nombre )
      )
    `)
        .order('id');

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    console.log(`Checking ${contacts.length} contacts...`);

    let updatedCount = 0;

    for (const c of contacts) {
        if (!c.departamentos || !c.departamentos.edificios) continue;

        const oldRealName = c["nombreReal"] || ""; // Can be empty!
        const edName = c.departamentos.edificios.nombre || "";
        const depCode = c.departamentos.codigo || "";
        const relacion = c.relacion || "";

        // --- Cleaning Logic ---

        // 1. Remove "sin-nombre" variants from Real Name
        let cleanName = oldRealName;
        if (cleanName.toLowerCase() === "sin nombre" || cleanName.toLowerCase().includes("sin-nombre")) {
            cleanName = "";
        }

        // 2. Standard redundant token removal
        const tokensToRemove = [
            ...edName.split(' ').filter(t => t.length > 2),
            depCode
        ];
        tokensToRemove.forEach(token => {
            const safeToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${safeToken}\\b`, 'gi');
            cleanName = cleanName.replace(regex, '').trim();
        });
        cleanName = cleanName.replace(/\s+/g, ' ').replace(/^[-_]+|[-_]+$/g, '').trim();

        // 3. Slug Regeneration
        const normalize = (s) => s ? s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '';

        // Logic: Ignore "Contacto" relation
        // Logic: Ignore Relacion if present in Name
        let slugRelacion = normalize(relacion);
        if (slugRelacion === 'contacto' || (cleanName && cleanName.toLowerCase().includes(relacion.toLowerCase()))) {
            slugRelacion = '';
        }

        // Prevent empty slug if everything is empty
        if (!cleanName && !slugRelacion) {
            // Fallback: Use "ocupante" or just numeric suffix will handle it if base is Ed+Dept
        }

        const slugParts = [
            normalize(edName),
            normalize(depCode),
            normalize(cleanName),
            slugRelacion
        ].filter(p => p && p.length > 0);

        let newSlugBase = slugParts.join('-');
        if (!newSlugBase) newSlugBase = "contacto"; // Fallback of last resort

        // --- Check Update ---

        // We update IF:
        // 1. Name is "Sin Nombre" (we want empty)
        // 2. Slug contains "sin-nombre" text

        const isSinNombreText = (oldRealName === "Sin Nombre" || oldRealName.toLowerCase().includes("sin-nombre"));
        const slugHasSinNombre = c.nombre.includes("sin-nombre");

        // Also re-apply standard redundancy checks just in case
        const nameChanged = (cleanName !== oldRealName);

        if (isSinNombreText || slugHasSinNombre || nameChanged) {

            // Final Slug Calculation (Suffixes)
            let finalSlug = newSlugBase;

            const { data: existing } = await supabase
                .from('contactos')
                .select('id, nombre')
                .ilike('nombre', `${newSlugBase}%`)
                .neq('id', c.id);

            if (existing && existing.length > 0) {
                const exact = existing.find(e => e.nombre === newSlugBase);
                if (exact) {
                    const regex = new RegExp(`^${newSlugBase}-(\\d+)$`);
                    let max = 1;
                    existing.forEach(e => {
                        const m = e.nombre.match(regex);
                        if (m) {
                            const n = parseInt(m[1]);
                            if (n > max) max = n;
                        }
                    });
                    finalSlug = `${newSlugBase}-${max + 1}`;
                }
            }

            if (finalSlug !== c.nombre || cleanName !== oldRealName) {
                console.log(`\n[ID ${c.id}] Cleaning...`);
                console.log(`   Name: "${oldRealName}" -> "${cleanName}"`);
                console.log(`   Slug: ${c.nombre} -> ${finalSlug}`);

                const { error: updateError } = await supabase
                    .from('contactos')
                    .update({
                        nombre: finalSlug,
                        "nombreReal": cleanName,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', c.id);

                if (updateError) {
                    console.error("   FAILED:", updateError.message);
                } else {
                    updatedCount++;
                }
            }
        }
    }

    console.log(`\nFinal Cleanup Complete. Updated ${updatedCount} contacts.`);
}

cleanContacts();
