const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://fodyzgjwoccpsjmfinvm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvZHl6Z2p3b2NjcHNqbWZpbnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MTc4NzgsImV4cCI6MjA2MzI5Mzg3OH0.kpthf8iRunvBCcbk73Csvi2zmK_kMFPjS3wmnM79GNQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listTables() {
    console.log('--- AUDITORÍA DE TABLAS ---');

    // Lista de tablas comunes en el sistema SPC según lo visto en logs y archivos SQL
    const commonTables = [
        'presupuestos_base',
        'presupuestos_finales',
        'tareas',
        'edificios',
        'contactos',
        'administradores',
        'supervisores_tareas',
        'liquidaciones_nuevas',
        'estados_tareas',
        'estados_presupuestos',
        'productos',
        'categorias',
        'usuarios',
        'roles',
        'departamentos',
        'facturas',
        'ajustes_facturas',
        'pagos',
        'configuracion',
        'logs_audit',
        'alertas',
        'presupuestos', // Posible obsoleta
        'liquidaciones', // Posible obsoleta
        'tareas_old', // Posible obsoleta
        'contactos_old' // Posible obsoleta
    ];

    const results = [];

    for (const table of commonTables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            results.push({ tabla: table, estado: 'Error/No existe', registros: '-' });
        } else {
            results.push({ tabla: table, estado: 'Activa', registros: count });
        }
    }

    console.table(results);
}

listTables();
