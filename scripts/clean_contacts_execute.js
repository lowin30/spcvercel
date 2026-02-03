
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
    console.log("--- Starting Contact Cleanup EXECUTION ---");

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

        const oldRealName = c["nombreReal"] || "";
        const edName = c.departamentos.edificios.nombre || "";
        const depCode = c.departamentos.codigo || "";
        const relacion = c.relacion || "";

        // Cleaning Logic
        let cleanName = oldRealName;

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

        // Re-Generate Slug logic
        const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        // Slug: building-dept-cleanName-relacion
        const slugParts = [
            normalize(edName),
            normalize(depCode),
            normalize(cleanName),
            normalize(relacion)
        ].filter(p => p && p.length > 0);

        const newSlug = slugParts.join('-');

        const needsUpdate = (cleanName.length > 0 && cleanName.length < oldRealName.length && cleanName.toLowerCase() !== oldRealName.toLowerCase());

        if (needsUpdate) {
            console.log(`\n[ID ${c.id}] Updating...`);
            console.log(`   Before: "${oldRealName}"`);
            console.log(`   After:  "${cleanName}"`);

            // Suffix check
            let finalSlug = newSlug;
            const { data: existing } = await supabase.from('contactos').select('id, nombre').ilike('nombre', `${newSlug}%`).neq('id', c.id);

            if (existing && existing.length > 0) {
                const exact = existing.find(e => e.nombre === newSlug);
                if (exact) {
                    const regex = new RegExp(`^${newSlug}-(\\d+)$`);
                    let max = 1;
                    existing.forEach(e => {
                        const m = e.nombre.match(regex);
                        if (m) {
                            const n = parseInt(m[1]);
                            if (n > max) max = n;
                        }
                    });
                    finalSlug = `${newSlug}-${max + 1}`;
                }
            }

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
                console.log("   SUCCESS.");
                updatedCount++;
            }
        }
    }

    console.log(`\nCleanup Complete. Updated ${updatedCount} contacts.`);
}

cleanContacts();
