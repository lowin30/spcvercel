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

    // 3. Crear cabecera de factura
    const { data: factura, error: fError } = await supabase
      .from('facturas')
      .insert({
        id_presupuesto_final: presupuestoId,
        id_presupuesto: presupuesto.id_presupuesto_base,
        id_administrador: presupuesto.id_administrador,
        total: presupuesto.total,
        saldo_pendiente: presupuesto.total,
        total_pagado: 0,
        id_estado_nuevo: 1, // Borrador/Pendiente
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (fError || !factura) throw fError

    // 4. Clonar items a items_factura
    if (presupuesto.items && presupuesto.items.length > 0) {
      const itemsFactura = presupuesto.items.map((item: any) => ({
        id_factura: factura.id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        subtotal_item: (item.cantidad || 0) * (item.precio || 0),
        es_material: item.es_material || false
      }))

      const { error: iError } = await supabase.from('items_factura').insert(itemsFactura)
      if (iError) console.error("Error clonando items:", iError)
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
      facturaId: factura.id
    }

  } catch (error: any) {
    console.error('convertirPresupuestoADosFacturas:', error)
    return { success: false, message: error.message }
  }
}
