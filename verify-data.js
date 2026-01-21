
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan variables de entorno SUPABASE_URL o SUPABASE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyData() {
    console.log('--- VERIFICACIÓN DE DATOS REALES ---');
    console.log('Consultando "vista_tareas_completa" en Supabase...');

    // Usar la vista correcta con las columnas confirmadas
    const { data, error } = await supabase
        .from('vista_tareas_completa')
        .select('id, titulo, estado_tarea, fecha_visita')
        .limit(10);

    if (error) {
        console.error('Error al consultar:', error.message);
        return;
    }

    console.log(`\nEncontradas ${data.length} tareas (mostrando primeras 10):`);
    data.forEach(t => {
        console.log(`- [${t.id}] ${t.titulo} (${t.estado_tarea}) - Visita: ${t.fecha_visita || 'N/A'}`);
    });

    if (data.length === 0) {
        console.log('La consulta no devolvió filas. La tabla podría estar vacía o tener RLS estricto.');
    }

    console.log('\n--- FIN DE VERIFICACIÓN ---');
}

verifyData();
