import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verificarRestricciones() {
  console.log('==== VERIFICANDO RESTRICCIONES DE BASE DE DATOS ====');
  
  // 1. Verificar estructura de la tabla facturas
  console.log('\n--- ESTRUCTURA DE TABLA: facturas ---');
  const { data: facturasInfo, error: facturasInfoError } = await supabase
    .from('facturas')
    .select('*')
    .limit(1);
  
  if (facturasInfoError) {
    console.error('Error al consultar facturas:', facturasInfoError);
  } else if (facturasInfo && facturasInfo.length > 0) {
    console.log('Columnas en facturas:', Object.keys(facturasInfo[0]));
  }
  
  // 2. Verificar estructura de la tabla pagos_facturas
  console.log('\n--- ESTRUCTURA DE TABLA: pagos_facturas ---');
  const { data: pagosInfo, error: pagosInfoError } = await supabase
    .from('pagos_facturas')
    .select('*')
    .limit(1);
  
  if (pagosInfoError) {
    console.error('Error al consultar pagos_facturas:', pagosInfoError);
  } else if (pagosInfo && pagosInfo.length > 0) {
    console.log('Columnas en pagos_facturas:', Object.keys(pagosInfo[0]));
  } else {
    console.log('No hay registros en pagos_facturas para extraer estructura');
  }
  
  // 3. Verificar facturas específicas con ID 43, 48, 51
  const facturasProblematicas = [43, 48, 51];
  
  console.log('\n--- ANÁLISIS DETALLADO DE FACTURAS PROBLEMÁTICAS ---');
  for (const id of facturasProblematicas) {
    console.log(`\nFactura ID: ${id}`);
    
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .select(`
        *,
        administradores:id_administrador (id, nombre, email),
        estados:id_estado_nuevo (id, nombre)
      `)
      .eq('id', id)
      .single();
    
    if (facturaError) {
      console.error(`Error al consultar factura ${id}:`, facturaError);
    } else {
      console.log('Datos completos:', factura);
      
      // Verificación de claves foráneas
      if (!factura.id_administrador) {
        console.error(`⚠️ PROBLEMA: Factura ${id} no tiene id_administrador`);
      }
      if (!factura.id_estado_nuevo) {
        console.error(`⚠️ PROBLEMA: Factura ${id} no tiene id_estado_nuevo`);
      }
      
      // Verificar si el administrador existe
      if (factura.id_administrador && (!factura.administradores || !factura.administradores.id)) {
        console.error(`⚠️ PROBLEMA: Administrador con ID ${factura.id_administrador} no existe`);
      }
    }
  }
  
  // 4. Verificar relaciones entre tablas
  console.log('\n--- VERIFICANDO RELACIONES ENTRE TABLAS ---');
  
  // Ejecutar una consulta de unión para verificar integridad referencial
  const { data: relacionesFacturas, error: relacionesError } = await supabase
    .from('facturas')
    .select(`
      id, 
      pagos:pagos_facturas(id, id_factura)
    `)
    .in('id', facturasProblematicas);
  
  if (relacionesError) {
    console.error('Error al verificar relaciones:', relacionesError);
  } else {
    console.log('Relaciones entre facturas y pagos:', relacionesFacturas);
  }
}

verificarRestricciones()
  .then(() => {
    console.log('\n==== VERIFICACIÓN COMPLETA ====');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error en verificación:', err);
    process.exit(1);
  });
