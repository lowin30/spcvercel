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
  }>
  totalPagado?: number
  supervisorEmail?: string
}): Promise<Blob> {
  const { liquidaciones, totalPagado, supervisorEmail } = args
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("SPC - PAGO DE LIQUIDACIONES DE SUPERVISOR", pageWidth / 2, 20, { align: "center" })

  let yPos = 30
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.text(`Fecha de pago: ${new Date().toLocaleDateString("es-AR")}`, 15, yPos)
  if (supervisorEmail) {
    yPos += 6
    doc.text(`Supervisor: ${supervisorEmail}`, 15, yPos)
  }
  yPos += 10

  doc.setFillColor(59, 130, 246)
  doc.rect(15, yPos, pageWidth - 30, 12, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  const totalSum = (liquidaciones || []).reduce((acc, l) => acc + (l.total_supervisor || 0), 0)
  const total = (typeof totalPagado === 'number' ? totalPagado : undefined) ?? totalSum
  doc.text(`TOTAL A PAGAR: $${(total || 0).toLocaleString("es-AR")}`, pageWidth / 2, yPos + 8, { align: "center" })
  doc.setTextColor(0, 0, 0)
  yPos += 18

  const tableData = liquidaciones.map(l => [
    l.titulo_tarea || "-",
    `$${(l.total_base || 0).toLocaleString("es-AR")}`,
    `$${(l.gastos_reales || 0).toLocaleString("es-AR")}`,
    `$${(l.ganancia_neta || 0).toLocaleString("es-AR")}`,
    `$${(l.ganancia_supervisor || 0).toLocaleString("es-AR")}`,
    `$${(l.total_supervisor || 0).toLocaleString("es-AR")}`,
  ])

  autoTable(doc, {
    startY: yPos,
    head: [[
      "Tarea",
      "Base",
      "Gastos Reales",
      "Ganancia Neta",
      "Ganancia Supervisor",
      "Total a Pagar",
    ]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 110, halign: "left" },
      1: { cellWidth: 24, halign: "right" },
      2: { cellWidth: 24, halign: "right" },
      3: { cellWidth: 24, halign: "right" },
      4: { cellWidth: 24, halign: "right" },
      5: { cellWidth: 24, halign: "right" },
    },
    margin: { left: 15, right: 15 },
  })

  const finalY = (doc as any).lastAutoTable?.finalY || yPos + 40
  const totalYPos = finalY + 10
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 64, 175)
  doc.text(`TOTAL DE LOS TOTALES: $${(totalSum || 0).toLocaleString("es-AR")}`,
    pageWidth - 15,
    totalYPos,
    { align: "right" }
  )

  doc.setTextColor(0, 0, 0)
  const footerY = pageHeight - 15
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)
  doc.text(`Generado el ${new Date().toLocaleDateString("es-AR")} ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`, 15, footerY)
  doc.text(`Página 1 de 1`, pageWidth - 15, footerY, { align: "right" })

  return doc.output("blob")
}
