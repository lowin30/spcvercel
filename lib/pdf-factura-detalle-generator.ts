import { jsPDF } from "jspdf"
import { default as autoTable } from "jspdf-autotable"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export interface FacturaItemPDF {
  id: number
  descripcion: string
  cantidad: number
  tarifa: number
  total: number
}

export interface DatosFacturaDetallePDF {
  codigo: string
  fecha: Date
  datos_afip?: string | null
  referencia?: string
  cliente: {
    nombre: string
    cuit: string
    departamento?: string
    tarea?: string
  }
  items: FacturaItemPDF[]
  notas?: string[]
  terminosCondiciones?: string[]
  totalFactura: number
  descuento_monto?: number
}

/**
  * Genera un PDF de detalle de factura con el formato idéntico al de presupuestos
 */
export async function generarFacturaDetallePDF(datos: DatosFacturaDetallePDF): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const margenIzquierdo = 10
  const margenSuperior = 10
  let posicionY = margenSuperior

  // Rubros principales en encabezado
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text(
    "ALBAÑILERIA - PINTURA - IMPERMEABILIZACION - GAS - PLOMERIA - ELECTRICIDAD",
    doc.internal.pageSize.width / 2,
    posicionY + 5,
    { align: "center" }
  )

  posicionY += 10
  let posicionInferiorLogo = posicionY

  try {
    const logoUrl = "/logo.png"
    const anchoLogo = 60
    const altoLogo = anchoLogo / (234 / 82)
    doc.addImage(logoUrl, "PNG", margenIzquierdo, posicionY, anchoLogo, altoLogo)
    posicionInferiorLogo = posicionY + altoLogo + 5
  } catch (error) {
    console.error("Error al cargar el logo:", error)
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("SERVICIOS PARA CONSORCIO", margenIzquierdo, posicionY + 15)
    posicionInferiorLogo = posicionY + 20
  }

  // Datos documento (DERECHA)
  const posicionDerecha = doc.internal.pageSize.width - margenIzquierdo
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(
    `Fecha de Factura: ${format(datos.fecha, "d MMM yyyy", { locale: es })}`,
    posicionDerecha,
    posicionY + 5,
    { align: "right" }
  )
  doc.text(`Factura # ${datos.codigo}`, posicionDerecha, posicionY + 9, { align: "right" })

  if (datos.datos_afip) {
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text(`AFIP: ${datos.datos_afip}`, posicionDerecha, posicionY + 13, { align: "right" })
    doc.setTextColor(0, 0, 0)
  }

  // Datos de empresa (IZQUIERDA)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text("Tel: 1131259449", margenIzquierdo, posicionInferiorLogo)
  doc.text("Email: lowin30@gmail.com", margenIzquierdo, posicionInferiorLogo + 4)

  // Datos de CLIENTE (DERECHA)
  const posicionYClienteInicio = posicionY + 18
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("CLIENTE", posicionDerecha, posicionYClienteInicio, { align: "right" })

  doc.setFont("helvetica", "normal")
  let posicionYCliente = posicionYClienteInicio + 5

  if (datos.cliente.nombre) {
    doc.text(`${datos.cliente.nombre}`, posicionDerecha, posicionYCliente, { align: "right" })
    posicionYCliente += 4
  }

  if (datos.cliente.cuit) {
    doc.text(`CUIT: ${datos.cliente.cuit}`, posicionDerecha, posicionYCliente, { align: "right" })
    posicionYCliente += 4
  }

  if (datos.cliente.tarea) {
    doc.text(`${datos.cliente.tarea}`, posicionDerecha, posicionYCliente, { align: "right" })
  }

  posicionY = Math.max(posicionInferiorLogo + 10, posicionYCliente + 5) + 4

  // Tabla de ítems
  const headers = [["N", "Artículo & Descripción", "Cant.", "Tarifa", "Cantidad"]]

  const body = datos.items.map((item, index) => {
    const descripcionLineas = doc.splitTextToSize(item.descripcion, 100)
    const numeroItem = (index + 1).toString()

    return [
      numeroItem,
      descripcionLineas,
      item.cantidad.toFixed(2),
      Math.round(item.tarifa).toLocaleString("es-AR"),
      Math.round(item.total).toLocaleString("es-AR"),
    ]
  })

  const anchoPagina = doc.internal.pageSize.width
  const margenDerecho = 10
  const anchoDisponible = anchoPagina - margenIzquierdo - margenDerecho

  autoTable(doc, {
    head: headers,
    body: body,
    startY: posicionY,
    margin: { left: margenIzquierdo, right: margenDerecho },
    columnStyles: {
      0: { cellWidth: anchoDisponible * 0.05 },
      1: { cellWidth: anchoDisponible * 0.55 },
      2: { cellWidth: anchoDisponible * 0.10 },
      3: { cellWidth: anchoDisponible * 0.15 },
      4: { cellWidth: anchoDisponible * 0.15 },
    },
    styles: {
      fontSize: 10,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [200, 200, 200],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    didDrawPage: (data: any) => {
      posicionY = data.cursor.y + 8

      if (datos.descuento_monto && datos.descuento_monto > 0) {
        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.text(
          `Descuento: -$${Math.round(datos.descuento_monto).toLocaleString("es-AR")}`,
          posicionDerecha,
          posicionY,
          { align: "right" }
        )
        posicionY += 6
      }

      const totalCalculado = datos.totalFactura > 0
        ? datos.totalFactura
        : datos.items.reduce((sum, i) => sum + (i.total || 0), 0)

      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text(
        `Total $${Math.round(totalCalculado).toLocaleString("es-AR")}`,
        posicionDerecha,
        posicionY,
        { align: "right" }
      )
    },
  })

  // Notas opcionales
  if (datos.notas && datos.notas.length > 0) {
    posicionY += 10
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("Notas", margenIzquierdo, posicionY)
    posicionY += 4

    doc.setFont("helvetica", "normal")
    datos.notas.forEach((nota) => {
      const notaLineas = doc.splitTextToSize(nota, anchoDisponible)
      doc.text(notaLineas, margenIzquierdo, posicionY)
      posicionY += 4 * notaLineas.length
    })
  }

  // Términos y condiciones opcionales
  if (datos.terminosCondiciones && datos.terminosCondiciones.length > 0) {
    posicionY += 4
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("Términos y condiciones", margenIzquierdo, posicionY)
    posicionY += 4

    doc.setFont("helvetica", "normal")
    datos.terminosCondiciones.forEach((termino) => {
      const terminoLineas = doc.splitTextToSize(termino, doc.internal.pageSize.width - 40)
      doc.text(terminoLineas, margenIzquierdo, posicionY)
      posicionY += 4 * terminoLineas.length
    })
  }

  return doc.output("blob")
}
