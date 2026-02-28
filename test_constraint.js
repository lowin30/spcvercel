const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMore() {
  const testValues = ['Total', 'Parcial', 'TOTAL', 'PARCIAL', 'total', 'parcial', ''];
  for (const val of testValues) {
    const { error } = await supabase.from('pagos_facturas').insert({
        id_factura: 1, 
        monto_pagado: 1,
        fecha_pago: '2026-02-28',
        modalidad_pago: val,
        created_by: '00000000-0000-0000-0000-000000000000'
    });
    console.log(`Value: "${val}" -> ${error?.message || 'ACCEPTED (no error)'}`);
  }
}

checkMore();
