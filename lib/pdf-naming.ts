export type PdfTipo =
  | 'liquidacion_trabajador'
  | 'liquidacion_supervisor'
  | 'facturas_listado'
  | 'presupuesto'
  | 'gastos_tarea'

export function sanitizeFilename(value: string): string {
  if (!value) return 'archivo'
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_. ]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 120)
}

export function dateToISO(date: Date | string | null | undefined): string {
  if (!date) return 'fecha'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return 'fecha'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function getPdfFilename(tipo: PdfTipo, datos: any): string {
  switch (tipo) {
    case 'liquidacion_trabajador': {
      const nom = sanitizeFilename(datos.trabajador || 'Trabajador')
      const fecha = datos.fecha || 'fecha'
      const monto = Math.round(Number(datos.monto || 0))
      return `${nom}_${fecha}_${monto}.pdf`
    }
    case 'liquidacion_supervisor': {
      const tarea = sanitizeFilename(datos.tarea || datos.nombre_tarea || 'Tarea')
      const fecha = datos.fecha || 'fecha'
      const total = Math.round(Number(datos.total || 0))
      return `${tarea}_${fecha}_${total}.pdf`
    }
    case 'facturas_listado': {
      const admin = sanitizeFilename(datos.admin || 'Todas')
      const fecha = datos.fecha || 'fecha'
      return `Facturas_${admin}_${fecha}.pdf`
    }
    case 'presupuesto': {
      const codigo = sanitizeFilename(datos.codigo || 'Presupuesto')
      const cliente = sanitizeFilename(datos.cliente || 'Cliente')
      return `Presupuesto_${codigo}_${cliente}.pdf`
    }
    case 'gastos_tarea': {
      const codigo = sanitizeFilename(datos.codigo_tarea || 'Tarea')
      const fecha = datos.fecha || 'fecha'
      return `Gastos_${codigo}_${fecha}.pdf`
    }
    default:
      return 'archivo.pdf'
  }
}
