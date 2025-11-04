import { jsPDF } from "jspdf"
import { default as autoTable } from "jspdf-autotable"

export interface ParteTrabajoPDF {
  fecha: string
  titulo_tarea?: string
  tipo_jornada: 'dia_completo' | 'medio_dia' | string
}

export interface GastoPDF {
  fecha: string
  tipo_o_descripcion: string
  titulo_tarea?: string
  monto: number
}

export interface DatosLiquidacionTrabajadorPDF {
  liquidacionId: number
  trabajadorNombre: string
  trabajadorEmail?: string
  periodoInicio: Date
  periodoFin: Date
  totalDias: number
  salarioBase?: number
  plusManual?: number
  gastosReembolsados?: number
  totalPagar?: number
  partesTrabajo: ParteTrabajoPDF[]
  gastos: GastoPDF[]
}

export async function generarLiquidacionTrabajadorPDF(datos: DatosLiquidacionTrabajadorPDF): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const margenIzquierdo = 15
  const margenDerecho = 15
  const margenSuperior = 15
  const anchoPagina = doc.internal.pageSize.width
  const anchoDisponible = anchoPagina - margenIzquierdo - margenDerecho
  let y = margenSuperior

  // Header
  try {
    const logoUrl = "/logo.png"
    const anchoLogo = 45
    const altoLogo = anchoLogo / (234/82)
    doc.addImage(logoUrl, "PNG", margenIzquierdo, y, anchoLogo, altoLogo)
  } catch {}

  doc.setFontSize(15)
  doc.setFont("helvetica", "bold")
  doc.text("LIQUIDACIÓN SEMANAL TRABAJADOR", anchoPagina - margenDerecho, y + 6, { align: "right" })
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Liquidación #${datos.liquidacionId}`, anchoPagina - margenDerecho, y + 12, { align: "right" })
  doc.text(`Período: ${formatoFecha(datos.periodoInicio)} al ${formatoFecha(datos.periodoFin)}`, anchoPagina - margenDerecho, y + 17, { align: "right" })

  y += 28

  // Información trabajador
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("DATOS DEL TRABAJADOR", margenIzquierdo, y)
  y += 6
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text(`Nombre: ${datos.trabajadorNombre}`, margenIzquierdo, y)
  y += 5
  if (datos.trabajadorEmail) {
    doc.text(`Email: ${datos.trabajadorEmail}`, margenIzquierdo, y)
    y += 5
  }

  y += 2
  // Resumen
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("RESUMEN", margenIzquierdo, y)
  y += 6

  const resumen = [
    ["Días trabajados", `${datos.totalDias ?? 0}`],
    ["Salario base", `$${(datos.salarioBase ?? 0).toLocaleString('es-AR')}`],
    ["Plus manual", `$${(datos.plusManual ?? 0).toLocaleString('es-AR')}`],
    ["Gastos reembolsados", `$${(datos.gastosReembolsados ?? 0).toLocaleString('es-AR')}`],
    ["TOTAL A PAGAR", `$${(datos.totalPagar ?? 0).toLocaleString('es-AR')}`],
  ]

  autoTable(doc, {
    body: resumen,
    startY: y,
    margin: { left: margenIzquierdo, right: margenDerecho },
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: anchoDisponible * 0.6, fontStyle: 'bold' }, 1: { cellWidth: anchoDisponible * 0.4, halign: 'right' } },
    didParseCell: (data: any) => {
      if (data.row.index === 4) {
        data.cell.styles.fillColor = [50, 100, 200]
        data.cell.styles.textColor = [255, 255, 255]
        data.cell.styles.fontStyle = 'bold'
      }
    },
    didDrawPage: (data: any) => { y = data.cursor.y + 6 },
  })

  // Partes de trabajo
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("PARTES DE TRABAJO", margenIzquierdo, y)
  y += 5

  autoTable(doc, {
    head: [["Fecha", "Tarea", "Jornada"]],
    body: datos.partesTrabajo.map(p => [
      formatoFecha(new Date(p.fecha)),
      p.titulo_tarea || '-',
      p.tipo_jornada === 'dia_completo' ? 'Día completo' : (p.tipo_jornada === 'medio_dia' ? 'Medio día' : '-')
    ]),
    startY: y,
    margin: { left: margenIzquierdo, right: margenDerecho },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
    didDrawPage: (data: any) => { y = data.cursor.y + 6 },
  })

  // Gastos
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("GASTOS REEMBOLSADOS", margenIzquierdo, y)
  y += 5

  autoTable(doc, {
    head: [["Fecha", "Tipo/Descripción", "Tarea", "Monto"]],
    body: datos.gastos.map(g => [
      formatoFecha(new Date(g.fecha)),
      g.tipo_o_descripcion,
      g.titulo_tarea || '-',
      `$${(g.monto || 0).toLocaleString('es-AR')}`,
    ]),
    startY: y,
    margin: { left: margenIzquierdo, right: margenDerecho },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: anchoDisponible * 0.45 }, 2: { cellWidth: anchoDisponible * 0.25 }, 3: { cellWidth: 25, halign: 'right' } },
    didDrawPage: (data: any) => { y = data.cursor.y + 6 },
  })

  // Footer páginas
  const totalPaginas = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    doc.text("SERVICIOS PARA CONSORCIO", margenIzquierdo, doc.internal.pageSize.height - 10)
    doc.text(`Página ${i} de ${totalPaginas}`, anchoPagina - margenDerecho, doc.internal.pageSize.height - 10, { align: 'right' })
    doc.setTextColor(0, 0, 0)
  }

  return doc.output('blob')
}

function formatoFecha(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '-'
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${dd}/${m}/${y}`
}
