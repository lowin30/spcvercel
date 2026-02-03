
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

// Try to use Service Role Key for admin access, fallback to Anon
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanContacts() {
    console.log("--- Starting Contact Cleanup DRY RUN ---");

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

    let candidates = 0;

    for (const c of contacts) {
        if (!c.departamentos || !c.departamentos.edificios) continue;

        const oldRealName = c["nombreReal"] || "";
        const edName = c.departamentos.edificios.nombre || "";
        const depCode = c.departamentos.codigo || "";
        const relacion = c.relacion || "";

        // Cleaning Logic (Same as new implementation)
        let cleanName = oldRealName;

        // Tokens to remove (Case Insensitive)
        const tokensToRemove = [
            ...edName.split(' ').filter(t => t.length > 2), // Building parts (e.g. "Pareja", "3205")
            depCode // Dept code (e.g. "511")
        ];

        tokensToRemove.forEach(token => {
            // Escape regex special chars
            const safeToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${safeToken}\\b`, 'gi');
            cleanName = cleanName.replace(regex, '').trim();
        });

        // Cleanup extra spaces or punctuation
        cleanName = cleanName.replace(/\s+/g, ' ').replace(/^[-_]+|[-_]+$/g, '').trim();

        // Re-Generate Slug logic
        const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        // In the new logic, "cleanName" is used for slug.
        // slug = building-dept-cleanName-relacion
        const slugParts = [
            normalize(edName),
            normalize(depCode),
            normalize(cleanName),
            normalize(relacion)
        ].filter(p => p && p.length > 0);

        const newSlug = slugParts.join('-');

        // Detect if we should update
        const needsUpdate = (cleanName.length > 0 && cleanName.length < oldRealName.length && cleanName.toLowerCase() !== oldRealName.toLowerCase());

        if (needsUpdate) {
            console.log(`\n[ID ${c.id}] Needs Cleaning:`);
            console.log(`   Edificio: ${edName} | Depto: ${depCode}`);
            console.log(`   OLD Name: "${oldRealName}"`);
            console.log(`   NEW Name: "${cleanName}"`);
            console.log(`   OLD Slug: ${c.nombre}`);
            console.log(`   NEW Slug: ${newSlug} (Base)`);
            candidates++;
        }
    }

    console.log(`\nFound ${candidates} contacts to clean.`);
}

cleanContacts();
