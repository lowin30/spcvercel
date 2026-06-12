const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
let SUPABASE_URL, SUPABASE_KEY;

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
            if (key === 'NEXT_PUBLIC_SUPABASE_URL') SUPABASE_URL = value;
            if (key === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_KEY = value;
        }
    });
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Credentials not found in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log("=== DIAGNOSTICO TAREA 379 ===");
    const { data: tarea, error: tErr } = await supabase.from('tareas').select('*').eq('id', 379).single();
    if (tErr) console.error("Error tarea 379:", tErr);
    else console.log("Tarea 379:", {
        id: tarea.id,
        titulo: tarea.titulo,
        id_estado_nuevo: tarea.id_estado_nuevo,
        finalizada: tarea.finalizada
    });

    console.log("\n=== DIAGNOSTICO PRESUPUESTO BASE TAREA 379 ===");
    const { data: pb, error: pbErr } = await supabase.from('presupuestos_base').select('*').eq('id_tarea', 379);
    if (pbErr) console.error("Error PB:", pbErr);
    else console.log("PB Tarea 379:", pb.map(p => ({ id: p.id, code: p.code, aprobado: p.aprobado, rechazado: p.rechazado })));

    console.log("\n=== DIAGNOSTICO PRESUPUESTO FINAL TAREA 379 ===");
    const { data: pf, error: pfErr } = await supabase.from('presupuestos_finales').select('*').eq('id_tarea', 379);
    if (pfErr) console.error("Error PF:", pfErr);
    else console.log("PF Tarea 379:", pf.map(p => ({ id: p.id, code: p.code, aprobado: p.aprobado, rechazado: p.rechazado, id_estado_nuevo: p.id_estado_nuevo, id_estado: p.id_estado })));

    console.log("\n=== DIAGNOSTICO PRESUPUESTO FINAL 313 ===");
    const { data: pf313, error: pf313Err } = await supabase.from('presupuestos_finales').select('*').eq('id', 313).single();
    if (pf313Err) console.error("Error PF 313:", pf313Err);
    else console.log("PF 313:", { id: pf313.id, code: pf313.code, aprobado: pf313.aprobado, rechazado: pf313.rechazado, id_estado_nuevo: pf313.id_estado_nuevo, id_estado: pf313.id_estado, id_tarea: pf313.id_tarea });

    console.log("\n=== DIAGNOSTICO FACTURAS TAREA 379 Y PF 313 ===");
    const pfIds = [...pf.map(p => p.id), 313];
    const { data: facturas, error: fErr } = await supabase.from('facturas').select('*').in('id_presupuesto_final', pfIds);
    if (fErr) console.error("Error facturas:", fErr);
    else console.log("Facturas:", facturas.map(f => ({ id: f.id, id_presupuesto_final: f.id_presupuesto_final, nombre: f.name || f.nombre, total: f.total, pagada: f.pagada })));

    console.log("\n=== DIAGNOSTICO ESTADOS PRESUPUESTOS ===");
    const { data: estPres, error: epErr } = await supabase.from('estados_presupuestos').select('*').order('id');
    if (epErr) console.error("Error estados presupuestos:", epErr);
    else console.log("Estados Presupuestos:", estPres.map(e => ({ id: e.id, nombre: e.nombre, codigo: e.codigo })));

    console.log("\n=== DIAGNOSTICO ESTADOS TAREAS ===");
    const { data: estTar, error: etErr } = await supabase.from('estados_tareas').select('*').order('id');
    if (etErr) console.error("Error estados tareas:", etErr);
    else console.log("Estados Tareas:", estTar.map(e => ({ id: e.id, nombre: e.nombre, orden: e.orden })));
}

run();
