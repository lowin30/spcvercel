"use server"

import { createServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

/**
 * Convierte un presupuesto final en una factura
 * @param presupuestoId ID del presupuesto final a convertir
 * @returns Objeto con el resultado de la operación
 */
export async function convertirPresupuestoAFactura(presupuestoId: number) {
  if (!presupuestoId) {
    return { 
      success: false, 
      message: 'ID de presupuesto no proporcionado.' 
    }
  }

  const supabase = await createServerClient()

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

    // 2. Obtener datos del presupuesto
    // Definimos una interfaz para tipar correctamente la respuesta
    interface PresupuestoFinal {
      id: number;
      code: string;
      materiales: number;
      mano_obra: number;
      total: number;
      id_tarea: number | null;
      id_estado_nuevo: number | null;
      // Hacemos tareas opcional ya que podría no existir la relación
      tareas?: {
        id: number;
        id_administrador: string | null; // id_administrador puede ser un UUID
      };
    }
    
    // Primera consulta simplificada sin relaciones para depuración
    const { data: presupuesto, error: presupuestoError } = await supabase
      .from('presupuestos_finales')
      .select('*')
      .eq('id', presupuestoId)
      .single()

    // Registrar los datos para depuración
    console.log('Datos del presupuesto:', presupuesto)
    console.log('Error al obtener presupuesto:', presupuestoError)

    if (presupuestoError || !presupuesto) {
      console.error('Error al obtener el presupuesto:', presupuestoError)
      return { 
        success: false, 
        message: `Error al obtener los datos del presupuesto: ${presupuestoError?.message || 'Presupuesto no encontrado'}` 
      }
    }

    // 3. Obtener items del presupuesto
    console.log('Obteniendo ítems del presupuesto:', presupuestoId)
    
    // Definimos una variable para almacenar los items del presupuesto
    let itemsPresupuesto: any[] = [];
    
    // Buscamos los items asociados directamente al presupuesto final
    try {
      console.log(`Obteniendo items del presupuesto final (ID: ${presupuestoId})...`)
      
      // Intentamos buscar con id_presupuesto_final primero
      const { data: itemsDelPresupuestoFinal, error: errorItemsFinal } = await supabase
        .from('items')
        .select('*')
        .eq('id_presupuesto_final', presupuestoId)
      
      if (errorItemsFinal) {
        console.log('Error al buscar con id_presupuesto_final:', errorItemsFinal);
        // Intentar con otra columna id_presupuesto
        console.log('Intentando buscar con id_presupuesto...');
        const { data: itemsConIdPresupuesto, error: errorItemsId } = await supabase
          .from('items')
          .select('*')
          .eq('id_presupuesto', presupuestoId)
        
        if (errorItemsId) {
          console.log('Error al buscar con id_presupuesto:', errorItemsId);
        } else if (itemsConIdPresupuesto && itemsConIdPresupuesto.length > 0) {
          console.log(`Se encontraron ${itemsConIdPresupuesto.length} ítems usando id_presupuesto`);
          itemsPresupuesto = itemsConIdPresupuesto;
        } else {
          console.log('No se encontraron ítems para este presupuesto final con id_presupuesto');
        }
      } else if (itemsDelPresupuestoFinal && itemsDelPresupuestoFinal.length > 0) {
        console.log(`Se encontraron ${itemsDelPresupuestoFinal.length} ítems con id_presupuesto_final`);
        itemsPresupuesto = itemsDelPresupuestoFinal;
      } else {
        console.log('No se encontraron ítems para este presupuesto final con id_presupuesto_final');
        
        // Intentamos con la columna id_presupuesto como último recurso
        console.log('Intentando buscar con id_presupuesto como último recurso...');
        const { data: itemsConIdPresupuesto, error: errorItemsId } = await supabase
          .from('items')
          .select('*')
          .eq('id_presupuesto', presupuestoId)
        
        if (errorItemsId) {
          console.log('Error al buscar con id_presupuesto:', errorItemsId);
        } else if (itemsConIdPresupuesto && itemsConIdPresupuesto.length > 0) {
          console.log(`Se encontraron ${itemsConIdPresupuesto.length} ítems usando id_presupuesto`);
          itemsPresupuesto = itemsConIdPresupuesto;
        } else {
          console.log('No se encontraron ítems para este presupuesto final');
        }
      }
    
      
      // Continuamos el flujo sin importar si hay items o no
      console.log('Items del presupuesto disponibles:', itemsPresupuesto?.length || 0)
    } catch (error) {
      console.error('Error inesperado al obtener items:', error)
      // Continuamos sin items en caso de error
      console.log('Continuando sin items debido a un error')
    }

    // Generar código único para la factura (misma lógica que se usa para presupuestos o similar)
    const fechaActual = new Date()
    const año = fechaActual.getFullYear().toString().slice(-2)
    const mes = (fechaActual.getMonth() + 1).toString().padStart(2, '0')
    const codigoFactura = `FAC-${año}${mes}-${presupuesto.code.split('-').pop() || Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
    
    // 4. Crear la factura
    // Creamos la factura usando los campos correctos según la estructura de la tabla
    const { data: facturaCreada, error: facturaError } = await supabase
      .from('facturas')
      .insert({
        id_presupuesto_final: presupuesto.id,
        // Añadimos id_presupuesto que hace referencia al presupuesto base
        id_presupuesto: presupuesto.id_presupuesto_base,
        // No incluimos el code porque es generado automáticamente
        total: presupuesto.total,
        saldo_pendiente: presupuesto.total,
        total_pagado: 0,
        fecha_vencimiento: new Date(fechaActual.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días
        id_administrador: presupuesto.id_administrador,
        tiene_ajustes: false,
        ajustes_aprobados: false,
        created_at: new Date().toISOString(),
        // Añadimos id_estado_nuevo = 1 (estado inicial)
        id_estado_nuevo: 1
      })
      .select()
      .single()

    if (facturaError || !facturaCreada) {
      console.error('Error al crear la factura:', facturaError)
      return { 
        success: false, 
        message: 'Error al crear la factura.' 
      }
    }

    // 6. Crear los items de factura (si hay items disponibles)
    if (itemsPresupuesto && itemsPresupuesto.length > 0) {
      try {
        console.log('Creando items de factura a partir de items del presupuesto')
        for (const item of itemsPresupuesto) {
          // Crear un nuevo item de factura adaptando los campos a la estructura de items_factura
          const { data: itemFacturaCreado, error: itemFacturaError } = await supabase
            .from('items_factura')
            .insert({
              id_factura: facturaCreada.id,
              cantidad: item.cantidad || 1,
              precio_unitario: item.precio || 0,
              subtotal_item: (item.cantidad || 1) * (item.precio || 0),
              descripcion: item.descripcion || 'Sin descripción',
              producto_id: item.producto_id || null,
              // Por defecto, es_material siempre será false inicialmente, como solicitó el usuario
              es_material: false,
              created_at: new Date().toISOString(),
              // No incluimos code porque podría ser generado automáticamente
            })
          
          if (itemFacturaError) {
            console.error('Error al crear item de factura:', itemFacturaError)
            // Continuamos con el siguiente item en caso de error
          } else {
            console.log('Item de factura creado correctamente')
          }
        }
        
        console.log('Items de factura creados exitosamente')
      } catch (error) {
        console.error('Error inesperado al crear items de factura:', error)
        // Eliminar la factura creada para evitar inconsistencias
        await supabase.from('facturas').delete().eq('id', facturaCreada.id)
        
        return { 
          success: false, 
          message: `Error inesperado al crear los ítems de la factura: ${error instanceof Error ? error.message : 'Error desconocido'}` 
        }
      }
    } else {
      console.log('No hay items para crear en la factura')
    }

    // 6. Actualizar estado del presupuesto a facturado (id 4 = facturado según componente cambiar-estado)
    const { error: actualizarError } = await supabase
      .from('presupuestos_finales')
      .update({ id_estado_nuevo: 4 }) // 4 = facturado
      .eq('id', presupuestoId)

    if (actualizarError) {
      console.error('Error al actualizar estado del presupuesto:', actualizarError)
      // Continuamos porque la factura ya fue creada correctamente
    }

    // Revalidar la ruta para actualizar la UI
    revalidatePath('/dashboard/presupuestos')
    revalidatePath('/dashboard/facturas')

    return { 
      success: true, 
      message: 'Factura creada exitosamente.',
      facturaId: facturaCreada.id 
    }
  } catch (error) {
    console.error('Error inesperado:', error)
    return { 
      success: false, 
      message: 'Ocurrió un error inesperado al convertir el presupuesto en factura.' 
    }
  }
}
