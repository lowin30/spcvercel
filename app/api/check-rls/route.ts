import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();

    // 1. Verificar la sesión del usuario
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({
        error: 'No hay sesión activa. Inicie sesión primero.',
      }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Obtener políticas RLS activas para pagos_facturas
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies_for_table', { table_name: 'pagos_facturas' });

    if (policiesError) {
      return NextResponse.json({
        error: 'Error al consultar políticas',
        details: policiesError
      }, { status: 500 });
    }

    // 3. Verificar permisos del usuario en facturas problemáticas
    const facturasProblematicas = [43, 48, 51];
    const resultados = [];

    for (const facturaId of facturasProblematicas) {
      // Verificar si el usuario tiene permisos para la factura
      const { data: factura, error: facturaError } = await supabase
        .from('facturas')
        .select('*')
        .eq('id', facturaId)
        .single();

      // Verificar si puede leer la factura
      const puedeVer = !facturaError && factura;

      // Intentar una inserción de prueba para verificar permisos de escritura
      const datosPrueba = {
        id_factura: facturaId,
        monto_pagado: 1,
        fecha_pago: new Date().toISOString().split('T')[0],
        modalidad_pago: 'ajustable',
        id_administrador: puedeVer ? factura.id_administrador : null,
        created_by: userId
      };

      const { error: insertError } = await supabase
        .from('pagos_facturas')
        .insert(datosPrueba);

      resultados.push({
        facturaId,
        puedeVer,
        puedeInsertar: !insertError,
        errorInsercion: insertError ? {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details
        } : null,
        datosPrueba
      });
    }

    return NextResponse.json({
      userId,
      policies,
      resultados
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Error general',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
