/**
 * Utilidad para descargar PDFs de liquidación on-demand
 * NO guarda en Storage, genera y descarga directamente
 */

import React from 'react'
import { createClient } from '@/lib/supabase-client'
import { generarLiquidacionPDF } from './pdf-liquidacion-generator'
import { getPdfFilename, dateToISO } from '@/lib/pdf-naming'

interface DatosLiquidacion {
  id: number
  code: string
  created_at: string
  titulo_tarea: string
  code_presupuesto_base: string
  email_supervisor: string
  total_base: number
  gastos_reales: number
  ganancia_neta: number
  ganancia_supervisor: number
  ganancia_admin: number
  total_supervisor: number
  sobrecosto: boolean
  monto_sobrecosto: number
  id_tarea: number
}

/**
 * Descarga el PDF de una liquidación
 * Genera el PDF on-demand y lo descarga directamente al navegador
 * 
 * @param liquidacionId - ID de la liquidación
 * @returns Promise que se resuelve cuando el PDF se descarga
 */
export async function descargarLiquidacionPDF(liquidacionId: number): Promise<void> {
  const supabase = createClient()

  try {
    // 1. Obtener datos de la liquidación
    const { data: liquidacion, error: liquidacionError } = await supabase
      .from('vista_liquidaciones_completa')
      .select('*')
      .eq('id', liquidacionId)
      .single()

    if (liquidacionError || !liquidacion) {
      throw new Error(`Error al obtener liquidación: ${liquidacionError?.message || 'No encontrada'}`)
    }

    // 2. Obtener desglose de gastos inmutables (desde el snapshot JSON)
    const detalleSnapshot = (liquidacion.detalle_gastos_json || []) as { tipo: string, fecha: string, descripcion: string, monto: number }[]
    const materialesDetalle = detalleSnapshot.filter(d => d.tipo === 'material')
    const jornalesDetalle = detalleSnapshot.filter(d => d.tipo === 'jornal')
    
    // Adaptar al formato CategoriaGastos esperado por el generador PDF
    const desgloseData = [
      {
        categoria: 'materiales',
        cantidad_registros: materialesDetalle.length,
        monto_total: materialesDetalle.reduce((sum, item) => sum + (item.monto || 0), 0),
        detalle: materialesDetalle.map((m, i) => ({ id: i, ...m }))
      },
      {
        categoria: 'jornales',
        cantidad_registros: jornalesDetalle.length,
        monto_total: jornalesDetalle.reduce((sum, item) => sum + (item.monto || 0), 0),
        detalle: jornalesDetalle.map((j, i) => ({ id: i, ...j }))
      }
    ].filter(cat => cat.cantidad_registros > 0)


    // 3. Generar PDF
    const pdfBlob = await generarLiquidacionPDF({
      codigo: liquidacion.code,
      fecha: new Date(liquidacion.created_at),
      tarea: {
        titulo: liquidacion.titulo_tarea || 'Tarea sin título',
        codigo: liquidacion.code_presupuesto_base,
      },
      supervisor: {
        email: liquidacion.email_supervisor || 'Sin supervisor',
      },
      presupuestoBase: liquidacion.total_base,
      gastosReales: liquidacion.gastos_reales,
      gananciaNeta: liquidacion.ganancia_neta,
      gananciaSupervisor: liquidacion.ganancia_supervisor,
      gananciaAdmin: liquidacion.ganancia_admin,
      totalSupervisor: liquidacion.total_supervisor,
      sobrecosto: liquidacion.sobrecosto,
      montoSobrecosto: liquidacion.monto_sobrecosto,
      desglose: desgloseData || [],
    })

    // 4. Descargar PDF (centralizado)
    const filename = getPdfFilename('liquidacion_supervisor', {
      tarea: liquidacion.titulo_tarea || liquidacion.code_presupuesto_base || 'Tarea',
      fecha: dateToISO(liquidacion.created_at),
      total: liquidacion.total_supervisor || 0,
    })

    const url = URL.createObjectURL(pdfBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

  } catch (error) {
    console.error('Error al generar PDF:', error)
    throw error
  }
}

/**
 * Hook para usar en componentes React
 * Retorna una función para descargar PDFs con estado de loading
 */
export function useDescargarLiquidacionPDF() {
  const [isDownloading, setIsDownloading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const descargar = async (liquidacionId: number) => {
    setIsDownloading(true)
    setError(null)
    
    try {
      await descargarLiquidacionPDF(liquidacionId)
    } catch (err: any) {
      setError(err.message || 'Error al descargar PDF')
      throw err
    } finally {
      setIsDownloading(false)
    }
  }

  return { descargar, isDownloading, error }
}
