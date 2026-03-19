import { jsPDF } from "jspdf"
import { default as autoTable } from "jspdf-autotable"

export async function generarPagoLiquidacionesPDF(args: {
  liquidaciones: Array<{
    titulo_tarea: string
    total_base: number
    gastos_reales: number
    ganancia_neta: number
    ganancia_supervisor: number
    total_supervisor: number
    detalle_gastos_json?: Array<{
      fecha: string
      descripcion: string
      monto: number
    }>
  }>
  totalPagado?: number
  supervisorEmail?: string
  // Extension para Gestion de Capital (Phase 2)
  adelantos?: {
    total: number
    items: Array<{
      id?: string
      fecha: string
      monto: number
      descripcion: string
    }>
  }
}): Promise<Blob> {
  const { liquidaciones, totalPagado, supervisorEmail, adelantos } = args
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Logo / Header
  doc.setFillColor(9, 9, 11) // Zinc-950
  doc.rect(0, 0, pageWidth, 45, "F")

  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text("spc", 15, 20)
  
  doc.setFontSize(10)
  doc.text("reporte de pago y gestion de capital", 15, 30)

  // Resumen Financiero en el Header (Derecha) - Compacto para Portrait
  const bruteTotal = (liquidaciones || []).reduce((acc, l) => acc + (l.total_supervisor || 0), 0)
  const advanceDeduction = adelantos?.total || 0
  const finalNet = bruteTotal - advanceDeduction

  doc.setFontSize(8)
  doc.text(`bruto acumulado: $${bruteTotal.toLocaleString("es-AR")}`, pageWidth - 15, 18, { align: "right" })
  doc.setTextColor(251, 113, 133) // Rose-400
  doc.text(`adelantos: -$${advanceDeduction.toLocaleString("es-AR")}`, pageWidth - 15, 25, { align: "right" })
  
  doc.setFontSize(16)
  doc.setTextColor(52, 211, 153) // Emerald-400
  doc.text(`neto transferido: $${finalNet.toLocaleString("es-AR")}`, pageWidth - 15, 36, { align: "right" })

  let yPos = 55
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text(`fecha de emision: ${new Date().toLocaleDateString("es-AR")}`, 15, yPos)
  if (supervisorEmail) {
    yPos += 4
    doc.text(`supervisor: ${supervisorEmail.toLowerCase()}`, 15, yPos)
  }
  yPos += 8

  // TABLA 1: LIQUIDACIONES (DETALLE BRUTO RESTAURADO - 6 COLUMNAS)
  doc.setFont("helvetica", "bold")
  doc.text("detalle financiero de liquidaciones", 15, yPos)
  yPos += 4

  const headers = [
    "tarea / proyecto",
    "base",
    "gastos",
    "neta",
    "ganancia",
    "bruto"
  ]

  const body = liquidaciones.map(l => [
    l.titulo_tarea?.toLowerCase() || "-",
    `$${(l.total_base || 0).toLocaleString("es-AR")}`,
    `$${(l.gastos_reales || 0).toLocaleString("es-AR")}`,
    `$${(l.ganancia_neta || 0).toLocaleString("es-AR")}`,
    `$${(l.ganancia_supervisor || 0).toLocaleString("es-AR")}`,
    `$${(l.total_supervisor || 0).toLocaleString("es-AR")}`
  ])

  autoTable(doc, {
    startY: yPos,
    head: [headers],
    body: body,
    theme: "grid",
    headStyles: {
      fillColor: [39, 39, 42], // Zinc-800
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: "bold",
      halign: "center",
    },
    styles: { 
      fontSize: 7,
      cellPadding: 2,
      halign: "right"
    },
    columnStyles: {
      0: { cellWidth: 50, halign: "left" },
      1: { cellWidth: 26 },
      2: { cellWidth: 26 },
      3: { cellWidth: 26 },
      4: { cellWidth: 26 },
      5: { cellWidth: 26, fontStyle: "bold" },
    },
    margin: { left: 15, right: 15 },
  })

  yPos = (doc as any).lastAutoTable.finalY + 12

  // MODULO DE TRANSPARENCIA (TARJETAS EN GRILLA 2xN)
  const taskExpenses = liquidaciones.filter(l => (l.gastos_reales || 0) > 0)
  
  if (taskExpenses.length > 0) {
    if (yPos > pageHeight - 60) {
      doc.addPage()
      yPos = 20
    }

    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text("transparencia de gastos reales (reembolsos)", 15, yPos)
    yPos += 6

    const cardWidth = (pageWidth - 30 - 4) / 2
    let currentX = 15
    let maxHeightInRow = 0

    taskExpenses.forEach((l, index) => {
      const items = l.detalle_gastos_json || []
      
      // Estimar altura de la tarjeta
      const headerHeight = 6
      const rowHeight = 4
      const footerHeight = 6
      const cardHeight = headerHeight + (items.length * rowHeight) + footerHeight + 4

      // Verificar salto de página
      if (yPos + cardHeight > pageHeight - 20) {
        doc.addPage()
        yPos = 20
        currentX = 15
      }

      // Dibujar fondo de tarjeta
      doc.setFillColor(250, 250, 251) // Zinc-50
      doc.setDrawColor(228, 228, 231) // Zinc-200
      doc.roundedRect(currentX, yPos, cardWidth, cardHeight, 1, 1, "F")
      doc.rect(currentX, yPos, cardWidth, cardHeight, "D")

      // Titulo de la tarea en la tarjeta
      doc.setFontSize(6)
      doc.setTextColor(113, 113, 122) // Zinc-500
      doc.text(l.titulo_tarea?.toLowerCase().substring(0, 45) || "-", currentX + 3, yPos + 4)
      
      let itemY = yPos + 8
      doc.setTextColor(39, 39, 42) // Zinc-800
      
      items.forEach(item => {
        doc.setFont("helvetica", "normal")
        doc.text(item.descripcion?.toLowerCase().substring(0, 30) || "-", currentX + 3, itemY)
        doc.setFont("helvetica", "bold")
        doc.text(`$${item.monto.toLocaleString("es-AR")}`, currentX + cardWidth - 3, itemY, { align: "right" })
        itemY += rowHeight
      })

      // Total de la tarjeta
      doc.setDrawColor(212, 212, 216) // Zinc-300
      doc.line(currentX + 3, itemY - 1, currentX + cardWidth - 3, itemY - 1)
      doc.setFontSize(7)
      doc.text(`total gastos: $${l.gastos_reales.toLocaleString("es-AR")}`, currentX + cardWidth - 3, itemY + 3, { align: "right" })

      maxHeightInRow = Math.max(maxHeightInRow, cardHeight)

      // Mover a la siguiente posición de la grilla
      if (index % 2 === 0 && index < taskExpenses.length - 1) {
        currentX = 15 + cardWidth + 4 // Segunda columna
      } else {
        currentX = 15 // Reiniciar a primera columna
        yPos += maxHeightInRow + 4 // Bajar a la siguiente fila
        maxHeightInRow = 0
      }
    })
  }

  yPos += 10

  // TABLA DE ADELANTOS (DEDUCCIONES)
  if (adelantos && adelantos.items.length > 0) {
    if (yPos > pageHeight - 60) {
        doc.addPage()
        yPos = 20
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(190, 18, 60) // Rose-700
    doc.text("deducciones por adelantos", 15, yPos)
    yPos += 5

    autoTable(doc, {
        startY: yPos,
        head: [["fecha", "descripcion / motivo", "monto"]],
        body: adelantos.items.map(a => [
            a.fecha ? new Date(a.fecha).toLocaleDateString("es-AR") : "-",
            a.descripcion?.toLowerCase() || "-",
            `-$${(a.monto || 0).toLocaleString("es-AR")}`
        ]),
        theme: "grid",
        headStyles: {
            fillColor: [190, 18, 60], 
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: "bold",
            halign: "center"
        },
        styles: { fontSize: 7, halign: "center" },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 125, halign: "left" },
            2: { cellWidth: 30, halign: "right", fontStyle: "bold" }
        },
        margin: { left: 15, right: 15 }
    })
    
    yPos = (doc as any).lastAutoTable?.finalY + 12
  }

  // SECCION FINAL: CIERRE FINANCIERO PLATINUM (ANCHO TOTAL)
  if (yPos > pageHeight - 60) {
    doc.addPage()
    yPos = 20
  }

  const boxWidth = pageWidth - 30
  const boxX = 15
  
  doc.setFillColor(9, 9, 11) // Zinc-950
  doc.roundedRect(boxX, yPos, boxWidth, 50, 4, 4, "F")
  
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(161, 161, 170) // Zinc-400
  doc.text("cierre de liquidacion final", boxX + 10, yPos + 10)

  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text(`bruto acumulado (ganancias + reembolsos):`, boxX + 10, yPos + 22)
  doc.text(`$${bruteTotal.toLocaleString("es-AR")}`, boxX + boxWidth - 10, yPos + 22, { align: "right" })

  if (advanceDeduction > 0) {
    doc.setTextColor(251, 113, 133) // Rose-400
    doc.text(`(-) deduccion de adelantos otorgados:`, boxX + 10, yPos + 30)
    doc.text(`-$${advanceDeduction.toLocaleString("es-AR")}`, boxX + boxWidth - 10, yPos + 30, { align: "right" })
  }

  doc.setDrawColor(39, 39, 42) // Zinc-800
  doc.line(boxX + 10, yPos + 35, boxX + boxWidth - 10, yPos + 35)

  doc.setFontSize(18)
  doc.setTextColor(52, 211, 153) // Emerald-400
  doc.text(`neto transferido:`, boxX + 10, yPos + 44)
  doc.text(`$${finalNet.toLocaleString("es-AR")}`, boxX + boxWidth - 10, yPos + 44, { align: "right" })

  // Footer Final
  doc.setTextColor(0, 0, 0)
  const footerY = pageHeight - 15
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(113, 113, 122)
  doc.text(`spc platinum system - generado el ${new Date().toLocaleDateString("es-AR")} ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`, 15, footerY)
  doc.text(`firma recibido supervisor: ___________________________`, pageWidth - 80, footerY - 10)
  doc.text(`pagina ${doc.getNumberOfPages()}`, pageWidth - 15, footerY, { align: "right" })

  return doc.output("blob")
}
