const fs = require('fs');
const path = require('path');

// --- 1. Load Data ---
const CONTACTS_FILE = path.join(__dirname, '../contacts_dump_2026.csv');
const REPORT_FILE = path.join(__dirname, '../contacts_analysis_report.md');

// Existing Buildings (Snapshot from DB)
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
    { "id": 53, "nombre": "Lecker" },
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
    { "id": 28, "nombre": "Uriburu 75" },
    { "id": 42, "nombre": "Uruguay 1017" },
    { "id": 83, "nombre": "Yrigoyen 1983" }
];

// --- 2. CSV Parser ---
// Simple regex based CSV line parser to handle quotes
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    return values;
}

// --- 3. Analysis Logic ---
function analyze() {
    console.log('Reading CSV...');
    if (!fs.existsSync(CONTACTS_FILE)) {
        console.error('File not found:', CONTACTS_FILE);
        return;
    }

    const rawData = fs.readFileSync(CONTACTS_FILE, 'utf-8');
    const lines = rawData.split('\n').filter(l => l.trim().length > 0);

    // Header: First Name,Middle Name,Last Name,Phone 1 - Value,Phone 2 - Value
    // Index: 0, 1, 2, 3, 4

    const results = {
        total: 0,
        tenants: [],
        suppliers: [],
        family: [],
        junk: [],
        unknown: []
    };

    // Prepare Building Regexes
    const buildingMatchers = EDIFICIOS.map(ed => {
        // "Aguero 1623" -> /aguero.*1623/i
        const parts = ed.nombre.toLowerCase().split(' ');
        // Filter out short words (de, la, el) to reduce noise? Maybe better not to.
        // Try strict matching first: All parts must appear
        return {
            id: ed.id,
            name: ed.nombre,
            regex: new RegExp(parts.join('.*'), 'i')
        };
    });

    // Keywords
    const SUPPLIER_KEYWORDS = [
        'plomero', 'gasista', 'electricista', 'pintor', 'albañil', 'cerrajero', 'flete',
        'tecnico', 'service', 'reparacion', 'destapacion', 'matriculado', 'limpieza',
        'musico', 'cantante', 'show', 'banda', 'payaso', 'animador', 'dj', 'sonido'
    ];

    const FAMILY_KEYWORDS = [
        'mama', 'papa', 'tio', 'tia', 'primo', 'prima', 'abuela', 'abuelo', 'hermano', 'hermana', 'sobrino', 'sobrina', 'cuñada', 'cuñado', 'suegra', 'suegro', 'familia'
    ];

    const JUNK_KEYWORDS = [
        'cliente', 'consulta', 'llamada', 'spam', 'delivery', 'pedido', 'uber', 'taxi', 'remis'
    ];

    lines.forEach((line, idx) => {
        if (idx === 0 && line.includes('First Name')) return; // Skip Header

        const cols = parseCSVLine(line);
        const firstName = cols[0] || '';
        const middleName = cols[1] || '';
        const lastName = cols[2] || '';
        const phone1 = cols[3] || '';
        const phone2 = cols[4] || ''; // Sometimes cols[4] is phone 2

        const fullName = `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, ' ').trim();
        const fullString = fullName.toLowerCase();

        if (!fullName || (!phone1 && !phone2)) {
            // Skip empty contacts or without phones?
            // Actually, keep them but mark as junk/unknown?
            // User might want to import addresses even without phones? Unlikely for "Contacts".
            // Let's skip empty names.
            if (!fullName) return;
        }

        results.total++;

        // 1. Check Suppliers (High priority if "Plomero" is in name)
        if (SUPPLIER_KEYWORDS.some(k => fullString.includes(k))) {
            results.suppliers.push({ name: fullName, phone: phone1 || phone2, match: 'Keyword' });
            return;
        }

        // 2. Check Family
        if (FAMILY_KEYWORDS.some(k => fullString.includes(k))) {
            results.family.push({ name: fullName, phone: phone1 || phone2 });
            return;
        }

        // 3. Check Buildings (Tenants)
        let buildingMatch = null;
        for (const b of buildingMatchers) {
            if (b.regex.test(fullString)) {
                // Found a building match!
                // Try to extract Dept? e.g. "4b", "PB A", "7 C"
                const deptRegex = /(\d{1,2})\s?([a-z])|pb\s?([a-z])?/i;
                const deptMatch = fullString.match(deptRegex);
                const dept = deptMatch ? deptMatch[0].toUpperCase() : '??';

                buildingMatch = {
                    building: b.name,
                    id: b.id,
                    dept: dept,
                    name: fullName,
                    phone: phone1 || phone2
                };
                break; // Take first match
            }
        }

        if (buildingMatch) {
            results.tenants.push(buildingMatch);
            return;
        }

        // 4. Check Junk
        if (JUNK_KEYWORDS.some(k => fullString.includes(k)) || fullString.startsWith('cliente')) {
            results.junk.push({ name: fullName });
            return;
        }

        // 5. Unknown
        results.unknown.push({ name: fullName, phone: phone1 || phone2 });
    });

    // --- Generate Report ---
    let report = `# Reporte de Análisis de Contactos (CSV Import)

Total Analizados: ${results.total}

## 🏢 Inquilinos/Propietarios Detectados: ${results.tenants.length}
*Alta Confianza - Se recomienda importar y vincular*

| Nombre en CSV | Edificio Detectado | Depto (Est) | Teléfono |
|---|---|---|---|
${results.tenants.slice(0, 50).map(t => `| ${t.name} | ${t.building} | ${t.dept} | ${t.phone} |`).join('\n')}
${results.tenants.length > 50 ? `... y ${results.tenants.length - 50} más.` : ''}

## 🛠️ Proveedores / Oficios: ${results.suppliers.length}
*Detectados por palabras clave (Plomero, Gasista, Musico...)*

| Nombre | Teléfono |
|---|---|
${results.suppliers.slice(0, 20).map(s => `| ${s.name} | ${s.phone} |`).join('\n')}

## 🏠 Familia / Personal: ${results.family.length}
*Primos, Tíos, Mamá...* (Probablemente No Importar)

## 🗑️ Junk / Clientes Genéricos: ${results.junk.length}
*Cliente1, Cliente2...* (Se recomienda ignorar)

## ❓ Sin Clasificar: ${results.unknown.length}
*No se encontró edificio ni palabra clave*

Ejemplos:
${results.unknown.slice(0, 20).map(u => `- ${u.name} (${u.phone})`).join('\n')}

---
**Acciones Sugeridas:**
1. Crear tabla temporal \`import_candidates\`?
2. Decidir si los "Musicos" se importan como proveedores (Rubro: Entretenimiento?).
3. Ajustar regex de edificios si faltan detecciones.
`;

    fs.writeFileSync(REPORT_FILE, report, 'utf-8');
    console.log(`Report generated at ${REPORT_FILE}`);
}

analyze();
