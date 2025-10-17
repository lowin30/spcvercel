// Generador de PDF para listado de facturas
import { jsPDF } from "jspdf"
import { default as autoTable } from "jspdf-autotable"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Tipos para las facturas
interface FacturaParaPDF {
  id: number
  code: string
  nombre: string | null
  datos_afip: string | null
  estado_nombre: string
  total: number
  saldo_pendiente: number | string
  total_ajustes_todos: number | string
}

interface DatosExportFacturas {
  facturas: FacturaParaPDF[]
  nombreAdministrador?: string
  filtros?: {
    administrador?: string
    estado?: string
    busqueda?: string
  }
}

/**
 * Genera un PDF con el listado de facturas filtradas
 * Compatible con el sistema existente de pdf-generator.ts
 */
export async function generarFacturasPDF(datos: DatosExportFacturas): Promise<Blob> {
  const { facturas, nombreAdministrador, filtros } = datos

  // Calcular totales
  const totalSaldo = facturas.reduce((sum, f) => {
    const saldo = typeof f.saldo_pendiente === 'string' 
      ? parseFloat(f.saldo_pendiente) 
      : f.saldo_pendiente
    return sum + (saldo || 0)
  }, 0)

  const totalAjustes = facturas.reduce((sum, f) => {
    const ajuste = typeof f.total_ajustes_todos === 'string' 
      ? parseFloat(f.total_ajustes_todos) 
      : f.total_ajustes_todos
    return sum + (ajuste || 0)
  }, 0)

  // Crear documento PDF
  const doc = new jsPDF({
    orientation: "landscape", // Horizontal para más columnas
    unit: "mm",
    format: "a4",
  })

  // Configuración de márgenes
  const margenIzquierdo = 10
  const margenSuperior = 10
  let posicionY = margenSuperior

  // === HEADER ===
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("SPC - LISTADO DE FACTURAS", doc.internal.pageSize.width / 2, posicionY, { 
    align: "center" 
  })
  posicionY += 8

  // Información del filtro
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  
  if (nombreAdministrador) {
    doc.text(`Administrador: ${nombreAdministrador}`, margenIzquierdo, posicionY)
    posicionY += 5
  }

  doc.text(`Fecha: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`, margenIzquierdo, posicionY)
  posicionY += 5

  doc.text(`Total de facturas: ${facturas.length}`, margenIzquierdo, posicionY)
  posicionY += 8

  // === RESUMEN DE TOTALES (arriba) ===
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 100, 0) // Verde oscuro
  doc.text(`Saldo Total: $${totalSaldo.toLocaleString('es-AR')}`, margenIzquierdo, posicionY)
  
  doc.setTextColor(200, 50, 50) // Rojo
  doc.text(
    `Ajustes Total: $${totalAjustes.toLocaleString('es-AR')}`, 
    margenIzquierdo + 80, 
    posicionY
  )
  doc.setTextColor(0, 0, 0) // Reset a negro
  posicionY += 10

  // === TABLA DE FACTURAS ===
  const headers = [['Nombre', 'AFIP', 'Estado', 'Total', 'Saldo', 'Ajuste']]

  const body = facturas.map((factura) => {
    const saldo = typeof factura.saldo_pendiente === 'string' 
      ? parseFloat(factura.saldo_pendiente) 
      : factura.saldo_pendiente

    const ajuste = typeof factura.total_ajustes_todos === 'string' 
      ? parseFloat(factura.total_ajustes_todos) 
      : factura.total_ajustes_todos

    return [
      factura.nombre || factura.code || `Factura #${factura.id}`,
      factura.datos_afip || 'N/A',
      factura.estado_nombre || '-',
      `$${factura.total.toLocaleString('es-AR')}`,
      `$${(saldo || 0).toLocaleString('es-AR')}`,
      `$${(ajuste || 0).toLocaleString('es-AR')}`,
    ]
  })

  autoTable(doc, {
    head: headers,
    body: body,
    startY: posicionY,
    theme: "striped",
    styles: {
      fontSize: 9,
      cellPadding: 3,
      halign: 'left',
    },
    headStyles: {
      fillColor: [41, 128, 185], // Azul
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 80 },  // Nombre (más ancho)
      1: { cellWidth: 25 },  // AFIP
      2: { cellWidth: 35 },  // Estado
      3: { cellWidth: 30, halign: 'right' },  // Total
      4: { cellWidth: 30, halign: 'right' },  // Saldo
      5: { cellWidth: 30, halign: 'right' },  // Ajuste
    },
    // Aplicar color condicional a la columna Saldo
    didParseCell: function(data) {
      // Columna 4 = Saldo (índice 4)
      if (data.column.index === 4 && data.section === 'body') {
        const saldoTexto = data.cell.text[0]
        // Si el saldo es mayor a $0, pintar de rojo
        if (saldoTexto && saldoTexto !== '$0') {
          data.cell.styles.textColor = [200, 50, 50] // Rojo
          data.cell.styles.fontStyle = 'bold'
        } else {
          data.cell.styles.textColor = [0, 150, 0] // Verde
        }
      }
      
      // Columna 5 = Ajuste (índice 5)
      if (data.column.index === 5 && data.section === 'body') {
        const ajusteTexto = data.cell.text[0]
        // Si hay ajuste, pintarlo de naranja
        if (ajusteTexto && ajusteTexto !== '$0') {
          data.cell.styles.textColor = [230, 126, 34] // Naranja
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    didDrawPage: (data: any) => {
      posicionY = data.cursor.y + 10
    },
  })

  // === FOOTER CON TOTALES FINALES ===
  const posicionFinal = (doc as any).lastAutoTable.finalY + 10

  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  
  // Cuadro de totales
  const anchoTotal = 120
  const posicionXTotal = doc.internal.pageSize.width - margenIzquierdo - anchoTotal
  
  // Fondo gris claro
  doc.setFillColor(240, 240, 240)
  doc.rect(posicionXTotal, posicionFinal, anchoTotal, 20, 'F')
  
  // Bordes
  doc.setDrawColor(0, 0, 0)
  doc.rect(posicionXTotal, posicionFinal, anchoTotal, 20, 'S')
  
  // Textos de totales
  doc.setTextColor(0, 100, 0) // Verde
  doc.text(
    `SALDO TOTAL: $${totalSaldo.toLocaleString('es-AR')}`, 
    posicionXTotal + 5, 
    posicionFinal + 8
  )
  
  doc.setTextColor(200, 50, 50) // Rojo
  doc.text(
    `AJUSTES TOTAL: $${totalAjustes.toLocaleString('es-AR')}`, 
    posicionXTotal + 5, 
    posicionFinal + 15
  )

  // === PIE DE PÁGINA ===
  const totalPaginas = (doc as any).internal.getNumberOfPages()
  
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(128, 128, 128)
    
    // Número de página
    doc.text(
      `Página ${i} de ${totalPaginas}`, 
      doc.internal.pageSize.width / 2, 
      doc.internal.pageSize.height - 5,
      { align: 'center' }
    )
    
    // Generado por
    doc.text(
      `Generado por SPC - ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 
      margenIzquierdo, 
      doc.internal.pageSize.height - 5
    )
  }

  // Retornar como Blob
  return doc.output('blob')
}
