"use server"

import { createServerClient } from '@/lib/supabase-server'
import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { revalidatePath } from 'next/cache'

/**
 * Convierte un presupuesto final en factura(s).
 * Optimizamos para crear items de factura automáticamente.
 */
export async function convertirPresupuestoADosFacturas(presupuestoId: number) {
  try {
    const supabase = await createServerClient()
    const { id: userId } = await validateSessionAndGetUser()

    // 1. Obtener presupuesto completo
    const { data: presupuesto, error: pfError } = await supabase
      .from('presupuestos_finales')
      .select('*, items(*)')
      .eq('id', presupuestoId)
      .single()

    if (pfError || !presupuesto) throw new Error("Presupuesto no encontrado")

    // 2. Verificar si ya está facturado
    const { data: existente } = await supabase.from('facturas').select('id').eq('id_presupuesto_final', presupuestoId).maybeSingle()
    if (existente) return { success: false, message: "Este presupuesto ya tiene una factura asociada" }

    // 3. Separar los items en Materiales y Mano de Obra
    const itemsMateriales = presupuesto.items?.filter((i: any) => i.es_material === true) || [];
    const itemsManoObra = presupuesto.items?.filter((i: any) => i.es_material !== true) || [];

    if (itemsMateriales.length === 0 && itemsManoObra.length === 0) {
      throw new Error("El presupuesto no tiene items para facturar.");
    }

    const createdFacturas: number[] = [];

    // 4. Función helper para crear la factura y sus items
    const crearFacturaYClonarItems = async (items: any[], tipoDesc: string) => {
      const totalFactura = items.reduce((acc, item) => acc + ((item.cantidad || 0) * (item.precio || 0)), 0);

      const { data: factura, error: fError } = await supabase
        .from('facturas')
        .insert({
          id_presupuesto_final: presupuestoId,
          id_presupuesto: presupuesto.id_presupuesto_base || null,
          id_administrador: presupuesto.id_administrador,
          total: totalFactura,
          saldo_pendiente: totalFactura,
          total_pagado: 0,
          id_estado_nuevo: 1, // Borrador/Pendiente
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (fError || !factura) throw fError;

      const itemsFactura = items.map((item: any) => ({
        id_factura: factura.id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio, // Es 'precio' en el presupuesto, 'precio_unitario' en la factura
        subtotal_item: (item.cantidad || 0) * (item.precio || 0),
        es_material: item.es_material || false
      }));

      const { error: iError } = await supabase.from('items_factura').insert(itemsFactura);
      if (iError) console.error(`Error clonando items de ${tipoDesc}:`, iError);

      createdFacturas.push(factura.id);
    };

    // 5. Crear la factura de Materiales si aplica
    if (itemsMateriales.length > 0) {
      await crearFacturaYClonarItems(itemsMateriales, "Materiales");
    }

    // 6. Crear la factura de Mano de Obra si aplica
    if (itemsManoObra.length > 0) {
      await crearFacturaYClonarItems(itemsManoObra, "Mano de Obra");
    }

    // 5. Actualizar estado del presupuesto a 'facturado' (ID 4 o 5 según tabla)
    const { data: estFacturado } = await supabase.from('estados_presupuestos').select('id').eq('codigo', 'facturado').single()
    if (estFacturado) {
      await supabase.from('presupuestos_finales').update({ id_estado_nuevo: estFacturado.id }).eq('id', presupuestoId)
    }

    revalidatePath('/dashboard/presupuestos-finales')
    revalidatePath('/dashboard/facturas')

    return {
      success: true,
      message: "Factura creada correctamente con todos sus ítems",
      facturaId: createdFacturas[0]
    }

  } catch (error: any) {
    console.error('convertirPresupuestoADosFacturas:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Desaprueba un presupuesto final, volviéndolo al estado 'presupuestado'.
 */
export async function desaprobarPresupuesto(presupuestoId: number) {
  try {
    const supabase = await createServerClient()
    const { rol } = await validateSessionAndGetUser()

    if (rol !== 'admin') {
      throw new Error("No tienes permisos para realizar esta acción")
    }

    // 1. Obtener ID del estado 'presupuestado'
    const { data: estPresupuestado } = await supabase
      .from('estados_presupuestos')
      .select('id')
      .eq('codigo', 'presupuestado')
      .single()

    if (!estPresupuestado) throw new Error("Estado 'presupuestado' no encontrado")

    // 2. Actualizar el presupuesto
    const { error } = await supabase
      .from('presupuestos_finales')
      .update({ id_estado_nuevo: estPresupuestado.id })
      .eq('id', presupuestoId)

    if (error) throw error

    revalidatePath('/dashboard/presupuestos-finales')

    return {
      success: true,
      message: "Presupuesto desaprobado correctamente"
    }

  } catch (error: any) {
    console.error('desaprobarPresupuesto:', error)
    return { success: false, message: error.message }
  }
}
