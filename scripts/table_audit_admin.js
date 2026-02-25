const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://fodyzgjwoccpsjmfinvm.supabase.co";
// USANDO SERVICE ROLE KEY PARA BYPASSEAR RLS EN LA AUDITORIA
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvZHl6Z2p3b2NjcHNqbWZpbnZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzcxNzg3OCwiZXhwIjoyMDYzMjkzODc4fQ.h4ZQjNerFPBSjBLjvsViaLT43ZhRAMMZlfUKKlZsgRM";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function listTables() {
    console.log('--- AUDITORÍA DE TABLAS (MODO ADMIN) ---');

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
        'presupuestos',
        'liquidaciones',
        'tareas_old',
        'contactos_old'
    ];

    const results = [];

    for (const table of commonTables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (error) {
                // Si el error es que la tabla no existe, lo marcamos
                if (error.code === '42P01') {
                    results.push({ tabla: table, estado: 'Inexistente', registros: 0 });
                } else {
                    results.push({ tabla: table, estado: 'Error: ' + error.code, registros: '-' });
                }
            } else {
                results.push({ tabla: table, estado: 'Activa', registros: count || 0 });
            }
        } catch (e) {
            results.push({ tabla: table, estado: 'Exception', registros: '-' });
        }
    }

    // Ordenar por número de registros descendente
    results.sort((a, b) => (typeof b.registros === 'number' ? b.registros : -1) - (typeof a.registros === 'number' ? a.registros : -1));

    console.table(results);
}

listTables();
