import React from 'react'
import { createClient } from '@/lib/supabase-client'
import { generarLiquidacionTrabajadorPDF } from './pdf-liquidacion-trabajador-generator'

function sanitizeFilename(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_\. ]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 120)
}

function formatDateISO(dateStr: string | null | undefined): string {
  if (!dateStr) return 'fecha'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'fecha'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export async function descargarLiquidacionTrabajadorPDF(liquidacionId: number): Promise<void> {
  const supabase = createClient()

  // 1) Cabecera de liquidación del trabajador
  const { data: liq, error: liqError } = await supabase
    .from('liquidaciones_trabajadores')
    .select('*')
    .eq('id', liquidacionId)
    .single()

  if (liqError || !liq) throw new Error(liqError?.message || 'Liquidación no encontrada')

  const fechaInicio = liq.semana_inicio || liq.fecha_inicio
  const fechaFin = liq.semana_fin || liq.fecha_fin

  // 2) Datos del trabajador (consulta separada para evitar 400 Bad Request)
  const { data: trabajadorRow } = await supabase
    .from('usuarios')
    .select('id, nombre, email')
    .eq('id', liq.id_trabajador)
    .maybeSingle()

  // 3) Partes de trabajo del período
  const { data: partes, error: partesError } = await supabase
    .from('vista_partes_trabajo_completa')
    .select('fecha, titulo_tarea, tipo_jornada')
    .eq('id_trabajador', liq.id_trabajador)
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)

  if (partesError) throw new Error(partesError.message)

  // 4) Gastos del período (reembolsados)
  const { data: gastos, error: gastosError } = await supabase
    .from('vista_gastos_tarea_completa')
    .select('fecha_gasto, tipo_gasto, descripcion, titulo_tarea, monto')
    .eq('id_usuario', liq.id_trabajador)
    .gte('fecha_gasto', fechaInicio)
    .lte('fecha_gasto', fechaFin)

  if (gastosError) throw new Error(gastosError.message)

  // 5) Generar PDF
  const trabajadorObj: any = trabajadorRow || { nombre: 'Trabajador' }

  const blob = await generarLiquidacionTrabajadorPDF({
    liquidacionId,
    trabajadorNombre: trabajadorObj?.nombre || 'Trabajador',
    trabajadorEmail: trabajadorObj?.email || undefined,
    periodoInicio: new Date(fechaInicio),
    periodoFin: new Date(fechaFin),
    totalDias: liq.total_dias || 0,
    salarioBase: liq.salario_base || 0,
    plusManual: liq.plus_manual || 0,
    gastosReembolsados: liq.gastos_reembolsados || 0,
    totalPagar: liq.total_pagar || 0,
    partesTrabajo: (partes || []).map(p => ({
      fecha: p.fecha as any,
      titulo_tarea: (p as any).titulo_tarea,
      tipo_jornada: (p as any).tipo_jornada,
    })),
    gastos: (gastos || []).map(g => ({
      fecha: (g as any).fecha_gasto,
      tipo_o_descripcion: (g as any).tipo_gasto || (g as any).descripcion || '-',
      titulo_tarea: (g as any).titulo_tarea,
      monto: Number((g as any).monto || 0),
    })),
  })

  // 6) Descargar PDF con nombre: <Trabajador>_<YYYY-MM-DD>_<Monto>
  const trabajador = sanitizeFilename(trabajadorObj?.nombre || 'Trabajador')
  const fecha = formatDateISO(fechaFin)
  const monto = Math.round(liq.total_pagar || 0)
  const filename = `${trabajador}_${fecha}_${monto}.pdf`

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function useDescargarLiquidacionTrabajadorPDF() {
  const [isDownloading, setIsDownloading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const descargar = async (liquidacionId: number) => {
    setIsDownloading(true)
    setError(null)
    try {
      await descargarLiquidacionTrabajadorPDF(liquidacionId)
    } catch (e: any) {
      setError(e?.message || 'Error al generar PDF')
      throw e
    } finally {
      setIsDownloading(false)
    }
  }

  return { descargar, isDownloading, error }
}
