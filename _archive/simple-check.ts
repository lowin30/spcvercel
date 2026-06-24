import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configurar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkFacturas() {
  try {
    // 1. Verificar la estructura de la factura problemática
    console.log('Consultando la factura 43...');
    const { data: factura43, error: factura43Error } = await supabase
      .from('facturas')
      .select('*')
      .eq('id', 43)
      .single();

    if (factura43Error) {
      console.error('Error al consultar factura 43:', factura43Error);
      return;
    }

    console.log('Factura 43:', factura43);

    // 2. Verificar si ya existen pagos para esta factura
    const { data: pagosExistentes, error: pagosError } = await supabase
      .from('pagos_facturas')
      .select('*')
      .eq('id_factura', 43);

    if (pagosError) {
      console.error('Error al verificar pagos existentes:', pagosError);
    } else {
      console.log('Pagos existentes para factura 43:', pagosExistentes?.length || 0);
    }

    // 3. Verificar estructura de tabla pagos_facturas
    console.log('\nVerificando estructura de tabla pagos_facturas...');
    const { data: primerPago, error: primerPagoError } = await supabase
      .from('pagos_facturas')
      .select('*')
      .limit(1)
      .single();

    if (primerPagoError) {
      console.error('Error al consultar primer pago:', primerPagoError);
    } else {
      console.log('Estructura de pagos_facturas:', Object.keys(primerPago));
    }

  } catch (error) {
    console.error('Error general:', error);
  }
}

// Ejecutar la verificación
checkFacturas()
  .then(() => console.log('Verificación completa'))
  .catch(error => console.error('Error en verificación:', error));
