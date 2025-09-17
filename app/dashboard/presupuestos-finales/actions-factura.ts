"use server"

import { createSsrServerClient } from '@/lib/ssr-server'
import { revalidatePath } from 'next/cache'

/**
 * Convierte un presupuesto final en dos facturas: una para ítems regulares y otra para ítems de materiales
 * @param presupuestoId ID del presupuesto final a convertir
 * @returns Objeto con el resultado de la operación
 */
export async function convertirPresupuestoADosFacturas(presupuestoId: number) {
  if (!presupuestoId) {
    return { 
      success: false, 
      message: 'ID de presupuesto no proporcionado.' 
    }
  }

  const supabase = await createSsrServerClient()

  try {
    // 1. Verificar si el presupuesto ya está facturado
    const { data: facturas, error: facturasError } = await supabase
      .from('facturas')
      .select('id')
      .eq('id_presupuesto_final', presupuestoId)
      .limit(1)

    if (facturasError) {
      console.error('Error al verificar facturas asociadas:', facturasError)
      return { 
        success: false, 
        message: 'Error al verificar las facturas asociadas.' 
      }
    }

    if (facturas && facturas.length > 0) {
      return { 
        success: false, 
        message: 'Este presupuesto ya ha sido convertido en factura anteriormente.' 
      }
    }

    // 2. Obtener datos del presupuesto con información de tarea y edificio
    const { data: presupuesto, error: presupuestoError } = await supabase
      .from('presupuestos_finales')
      .select(`
        *,
        id_tarea,
        tareas:id_tarea (
          id,
          titulo,
          edificios:id_edificio (
            id,
            nombre
          )
        )
      `)
      .eq('id', presupuestoId)
      .single()

    if (presupuestoError || !presupuesto) {
      console.error('Error al obtener el presupuesto:', presupuestoError)
      return { 
        success: false, 
        message: `Error al obtener los datos del presupuesto: ${presupuestoError?.message || 'Presupuesto no encontrado'}` 
      }
    }

    // 3. Obtener items del presupuesto
    const { data: itemsPresupuesto, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('id_presupuesto', presupuestoId)

    if (itemsError) {
      console.error('Error al obtener los ítems del presupuesto:', itemsError)
      return { 
        success: false, 
        message: 'Error al obtener los ítems del presupuesto.' 
      }
    }

    if (!itemsPresupuesto || itemsPresupuesto.length === 0) {
      return { 
        success: false, 
        message: 'El presupuesto no tiene ítems para facturar.' 
      }
    }

    // 3.5. Obtener datos de la tarea para el administrador
    let idAdministrador;
    if (presupuesto.id_tarea) {
      const { data: tareaData, error: tareaError } = await supabase
        .from('vista_tareas_completa')
        .select('id_administrador')
        .eq('id', presupuesto.id_tarea)
        .single();

      if (tareaError || !tareaData) {
        console.error('Error al obtener datos de la tarea:', tareaError);
        return { success: false, message: 'No se pudo encontrar la tarea asociada para obtener el administrador.' };
      }
      idAdministrador = tareaData.id_administrador;
    } else {
        return { success: false, message: 'El presupuesto no está asociado a ninguna tarea, no se puede determinar el administrador.' };
    }

    // 4. Separar los ítems en regulares y materiales
    const itemsRegulares = itemsPresupuesto.filter(item => !item.es_material);
    const itemsMateriales = itemsPresupuesto.filter(item => item.es_material === true);

    // Calcular totales para cada tipo de factura
    const totalRegular = itemsRegulares.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
    const totalMaterial = itemsMateriales.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);

    // Verificar si ambos grupos tienen ítems
    const crearFacturaRegular = itemsRegulares.length > 0;
    const crearFacturaMaterial = itemsMateriales.length > 0;

    if (!crearFacturaRegular && !crearFacturaMaterial) {
      return {
        success: false,
        message: 'No hay ítems válidos para crear facturas.'
      }
    }

    // 5. Generar nombres para las facturas
    const nombreBase = presupuesto.tareas?.titulo || 
                      (presupuesto.tareas?.edificios?.nombre ? `Trabajo en ${presupuesto.tareas.edificios.nombre}` : 
                      `Presupuesto ${presupuesto.code}`);
    
    const nombreFacturaRegular = nombreBase;
    const nombreFacturaMaterial = `${nombreBase} material`;

    // 6. Generar códigos para las facturas
    const fechaActual = new Date();
    const año = fechaActual.getFullYear().toString().slice(-2);
    const mes = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
    const base = presupuesto.code.split('-').pop() || Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // Crear dos códigos de factura distintos
    const codigoBase = `${año}${mes}-${base}`;
    const codigoFacturaRegular = `FAC-${codigoBase}`;
    const codigoFacturaMaterial = `FAC-M-${codigoBase}`;

    // 7. Crear las facturas
    let facturaRegular = null;
    let facturaMaterial = null;

    // Datos comunes para ambas facturas
    const datosComunes = {
      id_presupuesto_final: presupuesto.id,
      id_presupuesto: presupuesto.id_presupuesto_base,
      fecha_vencimiento: new Date(fechaActual.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días
      id_administrador: idAdministrador,
      tiene_ajustes: false,
      ajustes_aprobados: false,
      created_at: new Date().toISOString(),
      id_estado_nuevo: 1 // estado inicial
    };

    // Crear factura regular si hay ítems
    if (crearFacturaRegular) {
      const { data: facturaR, error: facturaRError } = await supabase
        .from('facturas')
        .insert({
          ...datosComunes,
          total: Math.round(totalRegular),
          saldo_pendiente: totalRegular,
          total_pagado: 0,
          nombre: nombreFacturaRegular
          // Eliminamos code ya que es generado automáticamente
        })
        .select()
        .single();

      if (facturaRError) {
        console.error('Error al crear la factura regular:', facturaRError);
        return { 
          success: false, 
          message: `Error al crear la factura regular: ${facturaRError.message}` 
        };
      }
      facturaRegular = facturaR;

      // Crear los ítems para la factura regular
      for (const item of itemsRegulares) {
        const { error: itemFacturaError } = await supabase
          .from('items_factura')
          .insert({
            id_factura: facturaRegular.id,
            cantidad: item.cantidad || 1,
            precio_unitario: item.precio || 0,
            subtotal_item: (item.cantidad || 1) * (item.precio || 0),
            descripcion: item.descripcion || 'Sin descripción',
            producto_id: item.producto_id || null,
            es_producto: item.es_producto || false,
            es_material: false, // Confirmamos que no es material
            created_at: new Date().toISOString(),
            code: item.code || null
          });

        if (itemFacturaError) {
          console.error('Error al crear un ítem de factura regular:', itemFacturaError);
        }
      }
    }

    // Crear factura de materiales si hay ítems
    if (crearFacturaMaterial) {
      const { data: facturaM, error: facturaMError } = await supabase
        .from('facturas')
        .insert({
          ...datosComunes,
          total: Math.round(totalMaterial),
          saldo_pendiente: totalMaterial,
          total_pagado: 0,
          nombre: nombreFacturaMaterial
          // Eliminamos code ya que es generado automáticamente
        })
        .select()
        .single();

      if (facturaMError) {
        console.error('Error al crear la factura de materiales:', facturaMError);
        return { 
          success: false, 
          message: `Error al crear la factura de materiales: ${facturaMError.message}` 
        };
      }
      facturaMaterial = facturaM;

      // Crear los ítems para la factura de materiales
      for (const item of itemsMateriales) {
        const { error: itemFacturaError } = await supabase
          .from('items_factura')
          .insert({
            id_factura: facturaMaterial.id,
            cantidad: item.cantidad || 1,
            precio_unitario: item.precio || 0,
            subtotal_item: (item.cantidad || 1) * (item.precio || 0),
            descripcion: item.descripcion || 'Sin descripción',
            producto_id: item.producto_id || null,
            es_producto: item.es_producto || false,
            es_material: true, // Confirmamos que es material
            created_at: new Date().toISOString(),
            code: item.code || null
          });

        if (itemFacturaError) {
          console.error('Error al crear un ítem de factura de materiales:', itemFacturaError);
        }
      }
    }

    // 8. Actualizar el estado del presupuesto a "facturado"
    const { data: estadoUpdate, error: estadoError } = await supabase
      .from('presupuestos_finales')
      .update({ 
        id_estado: 4, // ID 4 corresponde al estado "facturado"
        aprobado: true
      })
      .eq('id', presupuestoId)
      .select();
      
    if (estadoError) {
      console.error('Error al actualizar el estado del presupuesto a facturado:', estadoError);
      // Continuamos con el proceso aunque haya error, ya que las facturas sí se crearon
    }

    // 9. Revalidar la página para actualizar la UI
    revalidatePath('/dashboard/presupuestos');
    revalidatePath('/dashboard/presupuestos-finales/editar/[id]');
    revalidatePath('/dashboard/facturas');

    // 10. Devolver respuesta de éxito con información sobre las facturas creadas
    let mensaje = '';
    if (facturaRegular && facturaMaterial) {
      mensaje = 'Se han creado dos facturas: una regular y una de materiales.';
    } else if (facturaRegular) {
      mensaje = 'Se ha creado una factura regular.';
    } else if (facturaMaterial) {
      mensaje = 'Se ha creado una factura de materiales.';
    }

    return {
      success: true,
      message: mensaje,
      data: {
        facturaRegular,
        facturaMaterial
      }
    };

  } catch (error: any) {
    console.error('Error inesperado al crear facturas:', error);
    return { 
      success: false, 
      message: `Error inesperado: ${error.message || 'Error desconocido'}` 
    };
  }
}
