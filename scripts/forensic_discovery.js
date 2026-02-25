const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = "https://fodyzgjwoccpsjmfinvm.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvZHl6Z2p3b2NjcHNqbWZpbnZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzcxNzg3OCwiZXhwIjoyMDYzMjkzODc4fQ.h4ZQjNerFPBSjBLjvsViaLT43ZhRAMMZlfUKKlZsgRM";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function forensicDiscovery() {
    console.log('--- INICIANDO DESCUBRIMIENTO FORENSE ---');

    // Consulta para listar todas las tablas y vistas del esquema public
    const { data: objects, error } = await supabase.rpc('execute_sql', {
        query: `
            SELECT 
                table_name, 
                table_type,
                (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public'
            ORDER BY table_type, table_name;
        `
    }).catch(async (e) => {
        // Si el RPC execute_sql no existe, intentamos con una consulta directa a través de REST si es posible, 
        // o fallamos elegantemente sugiriendo el uso del SQL Editor.
        // Pero como soy una IA, voy a intentar usar el recurso de 'execute_sql' que a veces está disponible o 
        // simplemente intentar listar las tablas basándome en una lista extendida.
        return { error: { message: "RPC execute_sql no disponible" } };
    });

    if (error) {
        console.log("No se pudo ejecutar la consulta SQL directa. Usando método de descubrimiento por fuerza bruta.");
        // Lista extendida para descubrimiento
        const probeList = [
            'presupuestos_base', 'presupuestos_finales', 'tareas', 'edificios', 'contactos',
            'administradores', 'supervisores_tareas', 'liquidaciones_nuevas', 'estados_tareas',
            'estados_presupuestos', 'productos', 'categorias', 'usuarios', 'roles',
            'departamentos', 'facturas', 'ajustes_facturas', 'pagos', 'configuracion',
            'logs_audit', 'alertas', 'presupuestos', 'liquidaciones', 'tareas_old', 'contactos_old',
            'materiales_tarea', 'mano_obra_tarea', 'items_presupuesto', 'historial_estados',
            'vista_pb_supervisor', 'vista_pb_admin', 'vista_tareas_completa',
            'vista_gastos_tarea_completa', 'vista_admin_recordatorios_tareas_unificada',
            'vista_sup_recordatorios_tareas_unificada', 'vista_tareas_supervisor',
            'vista_liquidaciones_v2', 'vista_liquidaciones_v3', 'vista_presupuestos_all'
        ];

        const discovered = [];
        for (const name of probeList) {
            const { error: probeError } = await supabase.from(name).select('*', { count: 'exact', head: true });
            if (!probeError || probeError.code !== '42P01') {
                discovered.push({ table_name: name, type: probeError ? 'Unknown/Error' : 'Visible' });
            }
        }
        console.table(discovered);
        fs.writeFileSync('forensic_discovery.json', JSON.stringify(discovered, null, 2));
    } else {
        console.table(objects);
        fs.writeFileSync('forensic_discovery.json', JSON.stringify(objects, null, 2));
    }
}

forensicDiscovery();
