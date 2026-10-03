// Generador de PDF para Informe de Pagos Recibidos (Protocolo Platinum v3.0)
import { jsPDF } from "jspdf"
import { default as autoTable } from "jspdf-autotable"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export interface PagoParaPDF {
  id?: string | number
  id_pago?: number
  monto_pago?: number
  monto_pagado?: number
  fecha_pago: string
  factura_numero_afip: string | null
  edificio_nombre: string | null
  edificio_cuit: string | null
  tarea_titulo: string | null
  administrador_nombre?: string | null
}

export interface DatosExportPagos {
  pagos: PagoParaPDF[]
  nombreAdministrador?: string
  rangoFechas?: {
    desde?: string
    hasta?: string
  }
}

/**
 * Genera un PDF Portrait (A4 vertical) con el listado de pagos recibidos
 */
export async function generarPagosPDF(datos: DatosExportPagos): Promise<Blob> {
  const { pagos, nombreAdministrador, rangoFechas } = datos

  // Helper para obtener el monto del pago soportando ambas propiedades (monto_pago de loader / monto_pagado de DTO)
  const getMonto = (p: PagoParaPDF) => Number(p.monto_pago ?? p.monto_pagado ?? 0)

  // 1. Calcular total pagado (sin decimales per Platinum)
  const totalPagado = pagos.reduce((sum, p) => sum + getMonto(p), 0)

  // 2. Crear documento PDF Portrait (A4 Vertical)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const margenIzquierdo = 14
  const anchoPagina = doc.internal.pageSize.width
  let posicionY = 14

  // === ENCABEZADO ===
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(24, 24, 27) // zinc-900
  doc.text("SPC - INFORME DE PAGOS RECIBIDOS", anchoPagina / 2, posicionY, {
    align: "center"
  })
  posicionY += 7

  // Subtítulo / Metadatos de filtro
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(113, 113, 122) // zinc-500

  const adminTexto = nombreAdministrador && nombreAdministrador !== 'Todos'
    ? `Administrador: ${nombreAdministrador}`
    : "Administrador: Todos los administradores"
  doc.text(adminTexto, margenIzquierdo, posicionY)
  posicionY += 5

  let periodoTexto = "Período: Historial completo a la fecha"
  if (rangoFechas?.desde || rangoFechas?.hasta) {
    const d = rangoFechas.desde ? format(new Date(rangoFechas.desde + 'T00:00:00'), "dd/MM/yyyy") : "Inicio"
    const h = rangoFechas.hasta ? format(new Date(rangoFechas.hasta + 'T00:00:00'), "dd/MM/yyyy") : "Hoy"
    periodoTexto = `Período: ${d} al ${h}`
  }
  doc.text(periodoTexto, margenIzquierdo, posicionY)
  posicionY += 5

  doc.text(`Fecha de emisión: ${format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`, margenIzquierdo, posicionY)
  posicionY += 8

  // === TARJETA DESTACADA: TOTAL PAGADO (Protocolo Platinum - Dato más visible) ===
  const anchoTarjeta = anchoPagina - (margenIzquierdo * 2)
  const altoTarjeta = 18

  doc.setFillColor(240, 253, 244) // emerald-50
  doc.rect(margenIzquierdo, posicionY, anchoTarjeta, altoTarjeta, "F")
  doc.setDrawColor(167, 243, 208) // emerald-200
  doc.rect(margenIzquierdo, posicionY, anchoTarjeta, altoTarjeta, "S")

  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(6, 95, 70) // emerald-800
  doc.text("TOTAL PAGADO RECIBIDO", margenIzquierdo + 6, posicionY + 6)

  doc.setFontSize(15)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(5, 150, 105) // emerald-600
  doc.text(`$ ${Math.round(totalPagado).toLocaleString("es-AR")}`, margenIzquierdo + 6, posicionY + 14)

  // Cantidad de pagos a la derecha
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(71, 85, 105)
  doc.text(`Comprobantes: ${pagos.length}`, anchoPagina - margenIzquierdo - 6, posicionY + 11, { align: "right" })

  posicionY += altoTarjeta + 8

  // === TABLA DE PAGOS (5 Columnas Limpias per Requerimiento) ===
  const headers = [["Fecha", "Edificio", "Factura AFIP", "Tarea", "Monto Pagado"]]

  const body = pagos.map((pago) => {
    // Formato de fecha limpia DD/MM/YYYY
    let fechaLimpia = "-"
    if (pago.fecha_pago) {
      const parts = pago.fecha_pago.split("T")[0].split("-")
      if (parts.length === 3) {
        fechaLimpia = `${parts[2]}/${parts[1]}/${parts[0]}`
      }
    }

    const edificioInfo = pago.edificio_cuit
      ? `${pago.edificio_nombre || 'Sin nombre'}\n(CUIT: ${pago.edificio_cuit})`
      : (pago.edificio_nombre || '-')

    const afipNum = pago.factura_numero_afip ? `N° ${pago.factura_numero_afip}` : '-'
    const tareaTit = pago.tarea_titulo || '-'
    const montoFormatted = `$ ${Math.round(getMonto(pago)).toLocaleString("es-AR")}`

    return [fechaLimpia, edificioInfo, afipNum, tareaTit, montoFormatted]
  })

  autoTable(doc, {
    head: headers,
    body: body,
    startY: posicionY,
    theme: "striped",
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      valign: "middle",
    },
    headStyles: {
      fillColor: [16, 185, 129], // emerald-500
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 22 }, // Fecha
      1: { cellWidth: 50 }, // Edificio / CUIT
      2: { cellWidth: 26, fontStyle: "bold" }, // Factura AFIP (Destacado)
      3: { cellWidth: 50 }, // Tarea (Solo Título)
      4: { cellWidth: 34, halign: "right", fontStyle: "bold", textColor: [5, 150, 105] }, // Monto
    },
  })

  // === PIE DE PÁGINA ===
  const totalPaginas = (doc as any).internal.getNumberOfPages()

  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(148, 163, 184)

    doc.text(
      `Página ${i} de ${totalPaginas}`,
      anchoPagina / 2,
      doc.internal.pageSize.height - 6,
      { align: "center" }
    )

    doc.text(
      `Generado por SPC - Sistema de Gestión`,
      margenIzquierdo,
      doc.internal.pageSize.height - 6
    )
  }

  return doc.output("blob")
}
