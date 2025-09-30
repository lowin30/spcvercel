/**
 * VALIDACIONES INTELIGENTES PARA FLUJO DE TRABAJO
 * Previene acciones fuera de secuencia
 */

import { createSsrServerClient } from './ssr-server'

/**
 * Valida que todas las facturas estén pagadas antes de generar liquidación
 */
export async function validarGenerarLiquidacion(idTarea: number) {
  const supabase = await createSsrServerClient()
  
  // 1. Verificar que existan facturas
  const { data: facturas, error } = await supabase
    .from('facturas')
    .select('pagada, presupuestos_finales!inner(id_tarea)')
    .eq('presupuestos_finales.id_tarea', idTarea)
  
  if (error || !facturas || facturas.length === 0) {
    return {
      valido: false,
      mensaje: '⚠️ No hay facturas creadas para esta tarea'
    }
  }
  
  // 2. Verificar que TODAS estén pagadas
  const todasPagadas = facturas.every(f => f.pagada === true)
  
  if (!todasPagadas) {
    const pendientes = facturas.filter(f => !f.pagada).length
    return {
      valido: false,
      mensaje: `⚠️ Quedan ${pendientes} factura(s) sin pagar`
    }
  }
  
  return { valido: true }
}

/**
 * Valida que el presupuesto final esté aprobado antes de marcar facturas como pagadas
 */
export async function validarMarcarFacturaPagada(idFactura: number) {
  const supabase = await createSsrServerClient()
  
  // Obtener factura con presupuesto final
  const { data: factura, error } = await supabase
    .from('facturas')
    .select('id_presupuesto_final, presupuestos_finales(aprobado)')
    .eq('id', idFactura)
    .single()
  
  if (error || !factura) {
    return {
      valido: false,
      mensaje: '⚠️ Factura no encontrada'
    }
  }
  
  // @ts-ignore - Supabase typing issue with nested relations
  const presupuestoAprobado = factura.presupuestos_finales?.aprobado
  
  if (!presupuestoAprobado) {
    return {
      valido: false,
      mensaje: '⚠️ El presupuesto final debe estar aprobado antes de marcar la factura como pagada'
    }
  }
  
  return { valido: true }
}
