export type PdfTipo =
  | 'liquidacion_trabajador'
  | 'liquidacion_supervisor'
  | 'facturas_listado'
  | 'presupuesto'
  | 'gastos_tarea'

// Normaliza acentos conservando la letra ñ/Ñ y transformando ü/Ü → u/U
function normalizeAccentsKeepEnye(value: string): string {
  if (!value) return ''
  let s = value.normalize('NFC')
  // Vocales con tilde/diacríticos → base sin tilde
  s = s
    .replace(/[ÁÀÂÄÃÅ]/g, 'A')
    .replace(/[áàâäãå]/g, 'a')
    .replace(/[ÉÈÊË]/g, 'E')
    .replace(/[éèêë]/g, 'e')
    .replace(/[ÍÌÎÏ]/g, 'I')
    .replace(/[íìîï]/g, 'i')
    .replace(/[ÓÒÔÖÕ]/g, 'O')
    .replace(/[óòôöõ]/g, 'o')
    // ü/Ü explícitamente a u/U
    .replace(/[ÚÙÛÜ]/g, 'U')
    .replace(/[úùûü]/g, 'u')
  return s
}

export function sanitizeFilename(value: string): string {
  if (!value) return 'archivo'
  // 1) Normalizar acentos manteniendo ñ/Ñ y mapeando ü→u
  let s = normalizeAccentsKeepEnye(value)
  // 2) Permitir solo caracteres seguros, conservando ñ/Ñ; otros se reemplazan por espacio
  s = s.replace(/[^0-9A-Za-z_.\- ñÑ]/g, ' ')
  // 3) Espacios → guion, colapsar guiones y recortar guiones/puntos al borde
  s = s
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^(?:[.\-])+/, '')
    .replace(/(?:[.\-])+$/, '')
  // 4) Fallback si quedó vacío
  if (!s) s = 'archivo'
  // 5) Limitar longitud
  return s.slice(0, 120)
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
