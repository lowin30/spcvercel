import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Crear cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnosticarProblema() {
  console.log('==== DIAGNÓSTICO DE PAGOS EN FACTURAS PROBLEMÁTICAS ====');

  const facturasProblematicas = [43, 48, 51];
  
  for (const facturaId of facturasProblematicas) {
    console.log(`\n----- ANALIZANDO FACTURA ID: ${facturaId} -----`);
    
    // 1. Obtener detalles completos de la factura
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .select('*')
      .eq('id', facturaId)
      .single();
    
    if (facturaError) {
      console.error(`Error al obtener factura ${facturaId}:`, facturaError.message);
      continue;
    }
    
    console.log('Detalles de la factura:', factura);
    
    // 2. Verificar id_administrador
    if (!factura.id_administrador) {
      console.error(`⚠️ PROBLEMA DETECTADO: Factura ${facturaId} no tiene id_administrador`);
    } else {
      // Verificar que el administrador existe
      const { data: admin, error: adminError } = await supabase
        .from('administradores')
        .select('*')
        .eq('id', factura.id_administrador)
        .single();
      
      if (adminError || !admin) {
        console.error(`⚠️ PROBLEMA DETECTADO: El administrador con ID ${factura.id_administrador} no existe o hay un error:`, adminError?.message);
      } else {
        console.log('Administrador asociado:', admin);
      }
    }
    
    // 3. Verificar si ya hay pagos para esta factura
    const { data: pagos, error: pagosError } = await supabase
      .from('pagos_facturas')
      .select('*')
      .eq('id_factura', facturaId);
    
    if (pagosError) {
      console.error(`Error al consultar pagos para factura ${facturaId}:`, pagosError.message);
    } else {
      console.log(`Pagos existentes para factura ${facturaId}:`, pagos?.length || 0);
      if (pagos && pagos.length > 0) {
        console.log('Último pago registrado:', pagos[pagos.length - 1]);
      }
    }
    
    // 4. Simular un intento de inserción con valores correctos para diagnóstico
    const datosPrueba = {
      id_factura: facturaId,
      monto_pagado: 1, // Un monto mínimo para prueba
      fecha_pago: new Date().toISOString().split('T')[0],
      modalidad_pago: 'ajustable',
      id_administrador: factura.id_administrador,
      created_by: '1bcb4141-56ed-491a-9cd9-5b8aea700d56' // ID hardcodeado que aparece en los logs
    };
    
    console.log('Intentando inserción de diagnóstico con:', datosPrueba);
    
    // Esta inserción está en modo "dry run" - no hace commit real
    const { data: insertResult, error: insertError } = await supabase
      .from('pagos_facturas')
      .insert(datosPrueba)
      .select()
      .limit(1);
    
    if (insertError) {
      console.error(`⚠️ PROBLEMA DETECTADO: Error al insertar pago para factura ${facturaId}:`, insertError);
      console.error('Código:', insertError.code);
      console.error('Detalles:', insertError.details);
      
      // 5. Verificar restricciones de clave foránea
      if (insertError.code === '23503') { // Violación de clave foránea
        console.error('⚠️ PROBLEMA DE CLAVE FORÁNEA DETECTADO');
        
        // Verificar estructura de la tabla pagos_facturas
        const { data: tableInfo } = await supabase
          .rpc('get_table_info', { table_name: 'pagos_facturas' });
        
        console.log('Estructura de pagos_facturas:', tableInfo);
      }
    } else {
      console.log('✅ Inserción de prueba exitosa:', insertResult);
    }
  }
}

// Ejecutar el diagnóstico
diagnosticarProblema()
  .then(() => {
    console.log('\n==== DIAGNÓSTICO COMPLETADO ====');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error en el diagnóstico:', err);
    process.exit(1);
  });
