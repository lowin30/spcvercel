const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('vista_tareas_completa')
    .select('*')
    .eq('id', 257)
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(Object.keys(data));
    console.log('finanzas_json:', JSON.stringify(data.finanzas_json, null, 2));
    console.log('gastos_json:', JSON.stringify(data.gastos_json, null, 2));
    console.log('presupuestos_base_json:', JSON.stringify(data.presupuestos_base_json, null, 2));
  }
}

test();
