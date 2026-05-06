"use server"

import { createServerClient } from '@/lib/supabase-server'
import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { revalidatePath } from 'next/cache'

/**
 * Convierte un presupuesto final en factura(s).
 * Lee `requiere_dos_facturas` del administrador para decidir si crea 1 o 2 facturas.
 * Distribuye `descuento_monto` del PF proporcionalmente en el total de cada factura.
 */
export async function convertirPresupuestoADosFacturas(presupuestoId: number) {
  try {
    const supabase = await createServerClient()
    await validateSessionAndGetUser()

    // 1. Obtener presupuesto completo
    const { data: presupuesto, error: pfError } = await supabase
      .from('presupuestos_finales')
      .select('*, items(*), tareas(titulo)')
      .eq('id', presupuestoId)
      .single()

    if (pfError || !presupuesto) throw new Error("Presupuesto no encontrado")

    // 2. Verificar si ya está facturado
    const { data: existente } = await supabase.from('facturas').select('id').eq('id_presupuesto_final', presupuestoId).maybeSingle()
    if (existente) return { success: false, message: "Este presupuesto ya tiene una factura asociada" }

    // 3. Separar los items en Materiales y Mano de Obra
    const itemsMateriales = presupuesto.items?.filter((i: any) => i.es_material === true) || []
    const itemsManoObra = presupuesto.items?.filter((i: any) => i.es_material !== true) || []

    if (itemsMateriales.length === 0 && itemsManoObra.length === 0) {
      throw new Error("El presupuesto no tiene items para facturar.")
    }

    // nombre base: solo titulo de la tarea, en minusculas (gold standard v81.0)
    const nombreBase = ((presupuesto.tareas as any)?.titulo || 'sin titulo').toLowerCase()

    // descuento del presupuesto final (nuevo campo, default 0)
    const descuentoTotal = Math.round(presupuesto.descuento_monto || 0)

    // totales brutos por tipo (sin descuento) para calcular proporciones
    const totalBrutoMateriales = itemsMateriales.reduce((acc: number, i: any) => acc + ((i.cantidad || 0) * (i.precio || 0)), 0)
    const totalBrutoManoObra = itemsManoObra.reduce((acc: number, i: any) => acc + ((i.cantidad || 0) * (i.precio || 0)), 0)
    const totalBruto = totalBrutoMateriales + totalBrutoManoObra

    // 4. Leer configuracion del administrador: requiere_dos_facturas (default true = comportamiento actual)
    let requiereDosFacturas = true
    if (presupuesto.id_administrador) {
      const { data: adminData } = await supabase
        .from('administradores')
        .select('requiere_dos_facturas')
        .eq('id', presupuesto.id_administrador)
        .single()
      if (adminData && adminData.requiere_dos_facturas === false) {
        requiereDosFacturas = false
      }
    }

    const createdFacturas: number[] = []

    // 5. Helper: crea la factura con el total ya descontado y clona sus items
    const crearFacturaYClonarItems = async (items: any[], tipoDesc: string, totalConDescuento: number) => {
      const fechaVencimiento = new Date()
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30)

      // validacion: total no puede ser negativo (CHECK constraint en facturas)
      const totalFinal = Math.max(0, Math.round(totalConDescuento))

      const { data: factura, error: fError } = await supabase
        .from('facturas')
        .insert({
          id_presupuesto_final: presupuestoId,
          id_presupuesto: presupuesto.id_presupuesto_base || null,
          id_administrador: presupuesto.id_administrador,
          nombre: tipoDesc === "Materiales" ? `${nombreBase} materiales` : nombreBase,
          total: totalFinal,
          saldo_pendiente: totalFinal,
          total_pagado: 0,
          id_estado_nuevo: 1,
          fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (fError || !factura) throw fError

      const itemsFactura = items.map((item: any) => ({
        id_factura: factura.id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        subtotal_item: (item.cantidad || 0) * (item.precio || 0),
        es_material: item.es_material || false
      }))

      const { error: iError } = await supabase.from('items_factura').insert(itemsFactura)
      if (iError) console.error(`Error clonando items de ${tipoDesc}:`, iError)

      createdFacturas.push(factura.id)
    }

    if (!requiereDosFacturas) {
      // MODO 1 FACTURA: todos los items en una sola factura, descuento total aplicado
      const todosLosItems = [...itemsMateriales, ...itemsManoObra]
      await crearFacturaYClonarItems(todosLosItems, "Mano de Obra", totalBruto - descuentoTotal)
    } else {
      // MODO 2 FACTURAS: el descuento se aplica 100% a la mano de obra (platinum rule v2.5)
      if (itemsMateriales.length > 0) {
        // Factura de materiales: siempre bruta (sin descuento)
        await crearFacturaYClonarItems(itemsMateriales, "Materiales", totalBrutoMateriales)
      }
      if (itemsManoObra.length > 0) {
        // Factura de mano de obra: absorbe la totalidad del descuento del presupuesto
        await crearFacturaYClonarItems(itemsManoObra, "Mano de Obra", totalBrutoManoObra - descuentoTotal)
      }
    }

    // 6. Actualizar estado del presupuesto a 'facturado'
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
