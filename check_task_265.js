const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTask() {
  console.log("Comprobando asignaciones de supervisores en tarea 265...");
  
  // 1. Obtener supervisores asignados a la tarea 265
  const { data: assignments, error: errA } = await supabase
    .from('supervisores_tareas')
    .select('*, usuarios(email)')
    .eq('id_tarea', 265);
    
  if (errA) console.error("Error supervisores_tareas:", errA.message);
  else console.log("Supervisores asignados:", JSON.stringify(assignments, null, 2));

  // 2. Intentar consultar vista_tareas_supervisor con el rol "anon" no servirá sin jwt.
  // We can't easily impersonate the user in JS without their JWT token, but we can check the RLS policies via SQL
  // or just see if the view has `security_invoker = true`.
}

checkTask();
