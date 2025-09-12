import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const supabase = createServerComponentClient({ cookies });

    // Diagnóstico: obtener estructura de factura 43
    const { data: factura43, error: factura43Error } = await supabase
      .from('facturas')
      .select('*')
      .eq('id', 43)
      .single();

    if (factura43Error) {
      return NextResponse.json({
        error: 'Error al consultar factura 43',
        details: factura43Error
      }, { status: 500 });
    }

    // Diagnóstico: verificar si ya hay pagos para factura 43
    const { data: pagosExistentes, error: pagosError } = await supabase
      .from('pagos_facturas')
      .select('*')
      .eq('id_factura', 43);

    // Diagnóstico: estructura de tabla pagos_facturas
    const { data: tablaPagos, error: tablaPagosError } = await supabase
      .from('pagos_facturas')
      .select('*')
      .limit(1)
      .single();

    let estructuraPagos = null;
    if (!tablaPagosError && tablaPagos) {
      estructuraPagos = Object.keys(tablaPagos);
    }

    // Diagnóstico: intentar un insert de prueba
    const datosPrueba = {
      id_factura: 43,
      monto_pagado: 1,
      fecha_pago: new Date().toISOString().split('T')[0],
      modalidad_pago: 'ajustable',
      id_administrador: factura43.id_administrador,
      created_by: '1bcb4141-56ed-491a-9cd9-5b8aea700d56'
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('pagos_facturas')
      .insert(datosPrueba)
      .select();

    // Retornar todos los resultados
    return NextResponse.json({
      factura43,
      pagosExistentes: {
        count: pagosExistentes?.length || 0,
        data: pagosExistentes,
        error: pagosError
      },
      estructuraPagos,
      tablaPagosError,
      insertPrueba: {
        datosPrueba,
        resultado: insertResult,
        error: insertError
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Error general en diagnóstico',
      details: error
    }, { status: 500 });
  }
}
