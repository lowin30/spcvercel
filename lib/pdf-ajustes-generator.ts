import { jsPDF } from "jspdf"
import { default as autoTable } from "jspdf-autotable"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Tipos para las facturas con ajustes
interface FacturaConAjuste {
  id: number
  nombre: string | null
  datos_afip: string | null
  total: number
  total_ajustes: number | string
}

interface DatosExportAjustes {
  facturas: FacturaConAjuste[]
  nombreAdministrador?: string
  totalAjustes: number
}

/**
 * Genera un PDF con el listado de ajustes pendientes de pago
 * Formato: Factura, AFIP, Total, Ajuste
 */
export async function generarAjustesPDF(datos: DatosExportAjustes): Promise<Blob> {
  const { facturas, nombreAdministrador, totalAjustes } = datos

  // Crear documento PDF en formato landscape
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // HEADER
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("SPC - COMPROBANTE DE PAGO DE AJUSTES", pageWidth / 2, 20, { align: "center" })

  // Información del administrador y fecha
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  let yPos = 30

  if (nombreAdministrador) {
    doc.text(`Administrador: ${nombreAdministrador}`, 15, yPos)
    yPos += 6
  }

  doc.text(`Fecha de pago: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`, 15, yPos)
  yPos += 6
  doc.text(`Total facturas: ${facturas.length}`, 15, yPos)
  yPos += 10

  // Línea separadora
  doc.setDrawColor(200, 200, 200)
  doc.line(15, yPos, pageWidth - 15, yPos)
  yPos += 8

  // TOTALES DESTACADOS ANTES DE LA TABLA
  doc.setFillColor(59, 130, 246) // bg-primary
  doc.rect(15, yPos, pageWidth - 30, 12, "F")
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.text(`TOTAL AJUSTES A PAGAR: $${totalAjustes.toLocaleString("es-AR")}`, pageWidth / 2, yPos + 8, { 
    align: "center" 
  })
  
  doc.setTextColor(0, 0, 0)
  yPos += 18

  // Preparar datos para la tabla
  const tableData = facturas.map((factura) => {
    const ajuste = typeof factura.total_ajustes === 'string' 
      ? parseFloat(factura.total_ajustes) 
      : factura.total_ajustes

    return [
      factura.nombre || "Sin nombre",
      factura.datos_afip || "Sin datos",
      `$${factura.total.toLocaleString("es-AR")}`,
      `$${(ajuste || 0).toLocaleString("es-AR")}`,
    ]
  })

  // Generar tabla
  autoTable(doc, {
    startY: yPos,
    head: [["Factura", "AFIP", "Total Factura", "Ajuste"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [71, 85, 105], // slate-600
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 41, 59], // slate-800
    },
    columnStyles: {
      0: { cellWidth: 80, halign: "left" }, // Factura
      1: { cellWidth: 60, halign: "center" }, // AFIP
      2: { cellWidth: 40, halign: "right" }, // Total
      3: { cellWidth: 40, halign: "right" }, // Ajuste
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    margin: { left: 15, right: 15 },
  })

  // Obtener posición Y después de la tabla
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 40

  // TOTALES AL FINAL
  const totalYPos = finalY + 10

  doc.setFillColor(239, 246, 255) // bg-blue-50
  doc.rect(15, totalYPos, pageWidth - 30, 15, "F")

  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 64, 175) // text-blue-900
  doc.text(
    `TOTAL AJUSTES PAGADOS: $${totalAjustes.toLocaleString("es-AR")}`,
    pageWidth / 2,
    totalYPos + 10,
    { align: "center" }
  )

  doc.setTextColor(0, 0, 0)

  // FOOTER
  const footerY = pageHeight - 15
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 100, 100)
  doc.text(
    `Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`,
    15,
    footerY
  )
  doc.text(`Página 1 de 1`, pageWidth - 15, footerY, { align: "right" })

  // Convertir a Blob
  const pdfBlob = doc.output("blob")
  return pdfBlob
}
