const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = "https://fodyzgjwoccpsjmfinvm.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvZHl6Z2p3b2NjcHNqbWZpbnZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzcxNzg3OCwiZXhwIjoyMDYzMjkzODc4fQ.h4ZQjNerFPBSjBLjvsViaLT43ZhRAMMZlfUKKlZsgRM";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function forensicDiscovery() {
    console.log('--- INICIANDO DESCUBRIMIENTO FORENSE CORREGIDO ---');

    // Lista de sondeo extensa que incluye tablas, vistas y posibles backups
    const probeList = [
        // Tablas V3
        'presupuestos_base', 'presupuestos_finales', 'tareas', 'edificios', 'contactos',
        'administradores', 'supervisores_tareas', 'liquidaciones_nuevas', 'estados_tareas',
        'estados_presupuestos', 'productos', 'categorias', 'usuarios', 'roles',
        'departamentos', 'facturas', 'ajustes_facturas', 'pagos', 'configuracion',
        'logs_audit', 'alertas', 'comentarios', 'gastos_tarea', 'trabajadores_tareas',

        // Tablas Old / Candidatas a eliminación
        'presupuestos', 'liquidaciones', 'tareas_old', 'contactos_old',
        'materiales_tarea', 'mano_obra_tarea', 'items_presupuesto', 'historial_estados',
        'presupuestos_old', 'facturas_old', 'pagos_facturas',

        // Vistas
        'vista_pb_supervisor', 'vista_pb_admin', 'vista_tareas_completa',
        'vista_gastos_tarea_completa', 'vista_admin_recordatorios_tareas_unificada',
        'vista_sup_recordatorios_tareas_unificada', 'vista_tareas_supervisor',
        'vista_liquidaciones_v2', 'vista_liquidaciones_v3', 'vista_presupuestos_all',
        'vista_tareas_v2', 'vista_edificios_completa', 'vista_reporte_mensual',
        'vista_liquidacion_supervisor_detallada', 'vista_admin_recordatorios_tareas_unificada'
    ];

    const discovered = [];

    for (const name of probeList) {
        try {
            // Un simple select 1 para ver si el objeto existe
            const { data, error, count } = await supabase
                .from(name)
                .select('*', { count: 'exact', head: true });

            if (error) {
                if (error.code === '42P01') {
                    // El objeto no existe
                    continue;
                } else if (error.code === '42501') {
                    // Existe pero RLS lo bloquea (aunque estamos con service_role, esto no debería pasar mucho)
                    discovered.push({ nombre: name, estado: 'Bloqueado/Privado', registros: '-' });
                } else {
                    // Otro error (ej. es una vista con error interno)
                    discovered.push({ nombre: name, estado: 'Error: ' + error.code, registros: '-' });
                }
            } else {
                discovered.push({ nombre: name, estado: 'Existente', registros: count || 0 });
            }
        } catch (e) {
            // Ignorar excepciones de red o cliente
        }
    }

    discovered.sort((a, b) => b.registros !== '-' ? (a.registros === '-' ? 1 : b.registros - a.registros) : -1);

    console.table(discovered);
    fs.writeFileSync('forensic_discovery_v2.json', JSON.stringify(discovered, null, 2));
    console.log('--- DESCUBRIMIENTO COMPLETADO ---');
}

forensicDiscovery();
