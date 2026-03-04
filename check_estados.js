const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    // 1. Ver todos los estados
    const { data: estados } = await supabase.from('estados_tareas').select('id, nombre, codigo').order('id');
    console.log("ESTADOS DE TAREA:");
    estados.forEach(e => console.log(`  ID ${e.id}: ${e.nombre} (${e.codigo})`));

    // 2. Ver las 3 tareas del supervisor con su id_estado_nuevo
    const ids = [197, 222, 265];
    const { data: tareas } = await supabase.from('vista_tareas_supervisor')
        .select('id, titulo, id_estado_nuevo, estado_codigo, estado_nombre, finalizada, tiene_presupuesto_base')
        .in('id', ids);
    console.log("\nTAREAS DEL SUPERVISOR:");
    tareas.forEach(t => console.log(`  Tarea ${t.id}: "${t.titulo}" -> estado_id=${t.id_estado_nuevo}, codigo=${t.estado_codigo}, nombre=${t.estado_nombre}, finalizada=${t.finalizada}, tiene_pb=${t.tiene_presupuesto_base}`));

    // 3. Aplicar filtro ACTIVAS: finalizada=false AND id_estado_nuevo NOT IN (4,7,9,11)
    const activas = tareas.filter(t => !t.finalizada && ![4, 7, 9, 11].includes(t.id_estado_nuevo));
    console.log("\nTAREAS QUE SON 'ACTIVAS':");
    activas.forEach(t => console.log(`  Tarea ${t.id}: "${t.titulo}" estado=${t.estado_nombre}`));

    const noActivas = tareas.filter(t => t.finalizada || [4, 7, 9, 11].includes(t.id_estado_nuevo));
    console.log("\nTAREAS QUE NO SON 'ACTIVAS' (excluidas del dashboard):");
    noActivas.forEach(t => console.log(`  Tarea ${t.id}: "${t.titulo}" estado=${t.estado_nombre} finalizada=${t.finalizada}`));
}

run();
