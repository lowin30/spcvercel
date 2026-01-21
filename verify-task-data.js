require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyData() {
    console.log('🔍 Checking DB Data...');

    // 1. Obtener usuario 'traba1' o similar (buscando por rol trabajador)
    const { data: users, error: userError } = await supabase
        .from('usuarios')
        .select('id, email, rol, nombre')
        .limit(20);

    if (userError) {
        console.error('❌ Error fetching users:', userError);
        return;
    }

    console.log(`👤 Found ${users.length} workers:`);
    users.forEach(u => console.log(`   - ID: ${u.id}, Email: ${u.email}, Name: ${u.nombre}`));

    if (users.length === 0) return;

    const targetUser = users[0]; // Usamos el primero para probar
    console.log(`\n🎯 Testing finding tasks for: ${targetUser.email} (${targetUser.id})`);

    // 2. Buscar asignaciones en trabajadores_tareas
    const { data: assigns, error: assignError } = await supabase
        .from('trabajadores_tareas')
        .select('*')
        .eq('id_trabajador', targetUser.id);

    if (assignError) {
        console.error('❌ Error fetching assignments:', assignError);
    } else {
        console.log(`📋 Found ${assigns.length} assignments in 'trabajadores_tareas':`, assigns);

        if (assigns.length > 0) {
            const taskIds = assigns.map(a => a.id_tarea);

            // 3. Buscar detalles de esas tareas
            const { data: tasks, error: taskError } = await supabase
                .from('tareas')
                .select('id, titulo, estado_tarea')
                .in('id', taskIds);

            if (taskError) console.error('❌ Error fetching tasks:', taskError);
            else {
                console.log(`🏗️  Task Details:`);
                tasks.forEach(t => console.log(`   - ID: ${t.id}, Titulo: "${t.titulo}", Estado: "${t.estado_tarea}"`));
            }
        } else {
            console.log('⚠️  User has NO assignments in workers table.');

            // Debug: Buscar asignaciones en supervisores por si acaso
            const { data: sups } = await supabase.from('supervisores_tareas').select('*').eq('id_supervisor', targetUser.id);
            console.log(`   (Checked supervisors table just in case: found ${sups?.length})`);
        }
    }
}

verifyData();
