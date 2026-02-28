const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testViews() {
  console.log("--- vista_tareas_admin ---");
  const adminRes = await supabase.from('vista_tareas_admin').select('*').limit(1);
  if (adminRes.data && adminRes.data.length > 0) {
    console.log(Object.keys(adminRes.data[0]).filter(k => k.includes('json')));
  } else { console.error(adminRes.error || 'Empty'); }

  console.log("--- vista_tareas_supervisor ---");
  const supRes = await supabase.from('vista_tareas_supervisor').select('*').limit(1);
  if (supRes.data && supRes.data.length > 0) {
    console.log(Object.keys(supRes.data[0]).filter(k => k.includes('json')));
  } else { console.error(supRes.error || 'Empty'); }
  
  console.log("--- vista_tareas_completa ---");
  const compRes = await supabase.from('vista_tareas_completa').select('*').limit(1);
  if (compRes.data && compRes.data.length > 0) {
    console.log(Object.keys(compRes.data[0]).filter(k => k.includes('json')));
  } else { console.error(compRes.error || 'Empty'); }
}

testViews();
