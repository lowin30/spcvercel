const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function compareViews() {
  // Fetch 1 row from each view to get the schema
  const [compRes, supRes, adminRes] = await Promise.all([
    supabase.from('vista_tareas_completa').select('*').limit(1),
    supabase.from('vista_tareas_supervisor').select('*').limit(1),
    supabase.from('vista_tareas_admin').select('*').limit(1)
  ]);

  if (compRes.error) console.error("Error completa:", compRes.error);
  if (supRes.error) console.error("Error supervisor:", supRes.error);
  if (adminRes.error) console.error("Error admin:", adminRes.error);

  const compKeys = Object.keys(compRes.data?.[0] || {}).sort();
  const supKeys = Object.keys(supRes.data?.[0] || {}).sort();
  const adminKeys = Object.keys(adminRes.data?.[0] || {}).sort();

  console.log("=== VISTA TAREAS COMPLETA (Base) ===");
  console.log("Total columnas:", compKeys.length);
  
  console.log("\n=== VISTA TAREAS SUPERVISOR ===");
  console.log("Total columnas:", supKeys.length);
  const supMissing = compKeys.filter(k => !supKeys.includes(k));
  const supExtra = supKeys.filter(k => !compKeys.includes(k));
  console.log("Le falta (respecto a completa):", supMissing.length ? supMissing : "Nada, está perfecta.");
  console.log("Tiene de extra (respecto a completa):", supExtra.length ? supExtra : "Nada.");

  console.log("\n=== VISTA TAREAS ADMIN ===");
  console.log("Total columnas:", adminKeys.length);
  const adminMissing = compKeys.filter(k => !adminKeys.includes(k));
  const adminExtra = adminKeys.filter(k => !compKeys.includes(k));
  console.log("Le falta (respecto a completa):", adminMissing.length ? adminMissing : "Nada, está perfecta.");
  console.log("Tiene de extra (respecto a completa):", adminExtra.length ? adminExtra : "Nada.");
  
  // Vamos a imprimir la definicion de vista_tareas_supervisor buscando en la db
  const { data: ddl, error: ddlErr } = await supabase.rpc('get_view_definition', { view_name: 'vista_tareas_supervisor' });
  if(!ddlErr && ddl) {
      console.log("\n=== DDL VISTA SUPERVISOR ===");
      console.log(ddl);
  }
}

compareViews();
