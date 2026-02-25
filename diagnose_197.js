const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
        env[key] = value;
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function diagnoseTask197() {
    console.log('--- DIAGNÓSTICO TAREA 197 ---');

    // 1. Presupuesto Base
    const { data: pb, error: pbErr } = await supabase
        .from('presupuestos_base')
        .select('*')
        .eq('id_tarea', 197);
    console.log('Presupuesto Base:', JSON.stringify(pb, null, 2));
    if (pbErr) console.error('Error PB:', pbErr);

    // 2. Presupuesto Final
    const { data: pf, error: pfErr } = await supabase
        .from('presupuestos_finales')
        .select('*, estados_presupuestos(codigo)')
        .eq('id_tarea', 197);
    console.log('Presupuesto Final:', JSON.stringify(pf, null, 2));
    if (pfErr) console.error('Error PF:', pfErr);

    // 3. Liquidaciones
    const { data: liq, error: liqErr } = await supabase
        .from('liquidaciones_nuevas')
        .select('*')
        .eq('id_tarea', 197);
    console.log('Liquidaciones:', JSON.stringify(liq, null, 2));
    if (liqErr) console.error('Error Liq:', liqErr);

    // 4. Asignación Supervisor
    const { data: sup, error: supErr } = await supabase
        .from('supervisores_tareas')
        .select('*')
        .eq('id_tarea', 197);
    console.log('Supervisores Asignados:', JSON.stringify(sup, null, 2));
    if (supErr) console.error('Error Sup:', supErr);

    // 5. Usuario Actual (Simulado por correo si es posible)
    const { data: userCurrent, error: userErr } = await supabase
        .from('usuarios')
        .select('id, email, rol')
        .eq('email', 'miretendencia@gmail.com')
        .single();
    console.log('Usuario Supervisor (miretendencia):', JSON.stringify(userCurrent, null, 2));
    if (userErr) console.error('Error User:', userErr);
}

diagnoseTask197();
