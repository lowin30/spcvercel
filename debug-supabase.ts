// Script de diagnóstico para Supabase
// Ejecutar con: npx tsx debug-supabase.ts

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('==== DIAGNÓSTICO DE CONEXIÓN A SUPABASE ====');
console.log('URL de Supabase:', SUPABASE_URL);
console.log('Clave anónima disponible:', SUPABASE_KEY ? 'Sí (longitud: ' + SUPABASE_KEY.length + ')' : 'No');

async function testSupabase() {
  try {
    console.log('\n1. Intentando crear cliente Supabase...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    if (!supabase) {
      throw new Error('No se pudo crear el cliente Supabase');
    }
    console.log('✅ Cliente Supabase creado correctamente');
    
    console.log('\n2. Probando consulta a la tabla facturas...');
    const { data: facturas, error: facturasError } = await supabase
      .from('facturas')
      .select('id, code, total')
      .limit(5);
      
    if (facturasError) {
      throw new Error(`Error al consultar facturas: ${facturasError.message}`);
    }
    
    console.log(`✅ Consulta exitosa a la tabla facturas. Resultados: ${facturas?.length || 0}`);
    console.log('Primeras facturas:', facturas);
    
    // Probar con la factura 43 específicamente
    console.log('\n3. Probando consulta a la factura ID 43 como número...');
    const { data: factura43Num, error: error43Num } = await supabase
      .from('facturas')
      .select('id, code, total, id_administrador')
      .eq('id', 43)
      .maybeSingle();
      
    console.log(error43Num 
      ? `❌ Error al buscar factura 43 como número: ${error43Num.message}` 
      : `✅ Factura 43 encontrada como número: ${JSON.stringify(factura43Num)}`);
    
    console.log('\n4. Probando consulta a la factura ID 43 como string...');
    const { data: factura43Str, error: error43Str } = await supabase
      .from('facturas')
      .select('id, code, total, id_administrador')
      .eq('id', '43')
      .maybeSingle();
      
    console.log(error43Str 
      ? `❌ Error al buscar factura 43 como string: ${error43Str.message}` 
      : `✅ Factura 43 encontrada como string: ${JSON.stringify(factura43Str)}`);
    
    console.log('\n5. Probando consulta a vista_facturas_completa...');
    const { data: vFacturas, error: vFacturasError } = await supabase
      .from('vista_facturas_completa')
      .select('id, code, total, id_administrador, nombre_administrador')
      .limit(5);
      
    if (vFacturasError) {
      throw new Error(`Error al consultar vista_facturas_completa: ${vFacturasError.message}`);
    }
    
    console.log(`✅ Consulta exitosa a vista_facturas_completa. Resultados: ${vFacturas?.length || 0}`);
    console.log('Primeras facturas de la vista:', vFacturas);
    
    console.log('\n6. Probando consulta a la tabla pagos_facturas...');
    const { data: pagos, error: pagosError } = await supabase
      .from('pagos_facturas')
      .select('id, id_factura, monto_pagado, fecha_pago')
      .limit(5);
      
    console.log(pagosError
      ? `❌ Error al consultar pagos_facturas: ${pagosError.message}`
      : `✅ Consulta exitosa a pagos_facturas. Resultados: ${pagos?.length || 0}`);
      
    if (pagos && pagos.length > 0) {
      console.log('Últimos pagos:', pagos);
    }
    
    // Intentar operación de inserción simulada
    console.log('\n7. Probando operación de inserción simulada (dry-run)...');
    const pagoSimulado = {
      id_factura: 999999, // ID que no debería existir
      monto_pagado: 1,
      fecha_pago: new Date().toISOString(),
      modalidad_pago: 'test',
      created_by: 'test-script'
    };
    
    const { error: insertError } = await supabase
      .from('pagos_facturas')
      .insert([pagoSimulado])
      .select()
      .abortSignal(AbortSignal.timeout(100)); // Abortar rápidamente para no insertar realmente
    
    console.log('Resultado de inserción simulada:',
      insertError ? 
        `❌ Error esperado en inserción simulada: ${insertError.code}` :
        '⚠️ La inserción simulada no produjo error, verifica tus permisos RLS');

  } catch (err: any) {
    console.error('❌ ERROR:', err.message);
  }
}

testSupabase().then(() => {
  console.log('\n==== DIAGNÓSTICO COMPLETADO ====');
}).catch(err => {
  console.error('❌ ERROR FATAL:', err);
});
