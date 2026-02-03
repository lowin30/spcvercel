const fs = require('fs');
const path = require('path');

// --- 1. Load Data ---
const CONTACTS_FILE = path.join(__dirname, '../contacts_dump_2026.csv');
const PREVIEW_FILE = path.join(__dirname, '../import_preview.md');

// Existing Buildings (Same as before)
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
    //    { "id": 53, "nombre": "Lecker" }, // EXCLUDED
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
    //    { "id": 28, "nombre": "Uriburu 75" }, // EXCLUDED
    { "id": 42, "nombre": "Uruguay 1017" },
    { "id": 83, "nombre": "Yrigoyen 1983" }
];

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

function cleanPhone(phone) {
    if (!phone) return '';
    let p = phone.split(':::')[0].trim();
    let digits = p.replace(/\D/g, '');
    if (!digits) return '';

    if (digits.startsWith('54')) {
        if (digits.startsWith('5411')) {
            digits = '54911' + digits.substring(4);
        }
    } else if (digits.startsWith('11') || digits.startsWith('15')) {
        if (digits.startsWith('15')) {
            digits = '54911' + digits.substring(2);
        } else {
            digits = '549' + digits;
        }
    } else {
        if (digits.length === 10) {
            digits = '549' + digits;
        }
    }
    return digits;
}

function generatePreview() {
    const rawData = fs.readFileSync(CONTACTS_FILE, 'utf-8');
    const lines = rawData.split('\n').filter(l => l.trim().length > 0);

    const buildingMatchers = EDIFICIOS.map(ed => {
        const parts = ed.nombre.toLowerCase().split(' ');
        return {
            id: ed.id,
            name: ed.nombre,
            regex: new RegExp(parts.join('.*'), 'i')
        };
    });

    let previewRows = [];

    lines.forEach((line, idx) => {
        if (idx === 0) return;

        const cols = parseCSVLine(line);
        const firstName = cols[0] || '';
        const middleName = cols[1] || '';
        const lastName = cols[2] || '';
        const rawPhone = cols[3] || cols[4] || '';

        const fullName = `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, ' ').trim();
        const fullString = fullName.toLowerCase();

        if (!fullName) return;
        if (fullString.includes('lecker') || fullString.includes('uriburu 75')) return;

        for (const b of buildingMatchers) {
            if (b.regex.test(fullString)) {

                // --- CLEANING NAME ---
                let cleanName = fullName.replace(/\bcontacto\b/gi, '')
                    .replace(/\bpba\b/gi, '') // Remove dept noise from name
                    .replace(/\bpbb\b/gi, '')
                    .replace(/\bpbc\b/gi, '')
                    .replace(/\bpbd\b/gi, '')
                    .replace(/\bpbe\b/gi, '')
                    .replace(/\bpb\b/gi, '');

                // Remove building parts from name (aggressive)
                // e.g. "Rivadavia 1376 3b..." -> remove "Rivadavia", "1376"
                const buildingParts = b.name.split(' ');
                buildingParts.forEach(part => {
                    // Regex to remove word boundary part
                    if (part.length > 2) { // Only remove significant words
                        const re = new RegExp(`\\b${part}\\b`, 'gi');
                        cleanName = cleanName.replace(re, '');
                    }
                });

                // Also remove slug-like repetitions "rivadavia-1376-3b"
                cleanName = cleanName.replace(/[a-z]+-\d+-[a-z0-9]+/gi, '');

                cleanName = cleanName.replace(/\s+/g, ' ').trim();
                if (cleanName === '' || cleanName === '-') cleanName = "Sin Nombre";
                // Wait, user used to have "Sin Nombre" removed. Maybe just leave empty or use Dept?
                // Let's use "Inquilino [Dept]" or just keep it simple.

                let dept = '??';
                let type = 'Inquilino';

                // 1. Check ENC 
                if (/\benc\b/i.test(fullString) || /\bencargado\b/i.test(fullString)) {
                    dept = 'ENC';
                    type = 'Encargado';
                }
                // 2. Check PB
                else if (/\bpb\s?([a-z0-9]?)/i.test(fullString)) {
                    const match = fullString.match(/\bpb\s?([a-z0-9]?)/i);
                    dept = 'PB' + (match[1] ? match[1].toUpperCase() : '');
                }
                // 3. Piso/Pio
                else if (/\bpiso\s?(\d+)/i.test(fullString) || /\bpio\s?(\d+)/i.test(fullString)) {
                    // Handle 'pio' typo
                    const match = fullString.match(/\b(piso|pio)\s?(\d+)/i);
                    dept = match[2];
                }
                // 4. Numeric Depts (202, 307...)
                else if (/\b(\d{3})\b/.test(fullString)) {
                    const match = fullString.match(/\b(\d{3})\b/);
                    dept = match[1];
                }
                // 5. Standard 4B, 7A
                else {
                    const deptRegex = /(\d{1,2})\s?([a-z])\b/i;
                    const deptMatch = fullString.match(deptRegex);
                    if (deptMatch) {
                        dept = deptMatch[1] + deptMatch[2].toUpperCase();
                    }
                }

                if (type !== 'Encargado') {
                    if (fullString.includes('dueñ') || fullString.includes('propietar')) {
                        type = 'Propietario';
                    } else if (fullString.includes('inquilin')) {
                        type = 'Inquilino';
                    } else if (fullString.includes('consejo')) {
                        type = 'Consejo';
                    }
                }

                // If Name is mostly gone, maybe it was just the address?
                // "Rivadavia 1376 3b" -> "3b" -> Empty Name
                // If cleanName is very short or just digits/letters, maybe leave it empty.

                previewRows.push({
                    original_name: cleanName,
                    target_building: b.name,
                    target_dept: dept,
                    target_type: type,
                    phone: cleanPhone(rawPhone)
                });
                break;
            }
        }
    });

    // Sort
    previewRows.sort((a, b) => {
        if (a.target_building < b.target_building) return -1;
        if (a.target_building > b.target_building) return 1;
        return a.target_dept.localeCompare(b.target_dept);
    });

    let markdown = `# Vista Previa de Importación (Limpieza de Nombres)

**Mejoras:**
- **Nombres Limpios:** Eliminadas direcciones repetidas en el nombre.
- **Correcciones:** 'pio 4' -> 4.

| # | Edificio | Depto | Nombre Limpio | Tipo | Teléfono |
|---|---|---|---|---|---|
`;

    previewRows.forEach((row, i) => {
        markdown += `| ${i + 1} | ${row.target_building} | ${row.target_dept} | ${row.original_name} | ${row.target_type} | ${row.phone} |\n`;
    });

    fs.writeFileSync(PREVIEW_FILE, markdown, 'utf-8');
    console.log(`Preview generated at ${PREVIEW_FILE}`);
}

generatePreview();
