import { jsPDF } from "jspdf"
import { default as autoTable } from "jspdf-autotable"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@/lib/supabase-client"

interface DetalleGasto {
  id: number
  fecha: string
  descripcion?: string
  monto: number
  tipo_jornada?: string
  salario_diario?: number
  monto_calculado?: number
}

interface CategoriaGastos {
  categoria: string
  cantidad_registros: number
  monto_total: number
  detalle: DetalleGasto[]
}

interface DatosLiquidacion {
  codigo: string
  fecha: Date
  tarea: {
    titulo: string
    codigo?: string
  }
  supervisor: {
    email: string
  }
  presupuestoBase: number
  gastosReales: number
  gananciaNeta: number
  gananciaSupervisor: number
  gananciaAdmin: number
  totalSupervisor: number
  sobrecosto: boolean
  montoSobrecosto?: number
  desglose?: CategoriaGastos[]
}

/**
 * Genera un PDF de liquidación de supervisor
 */
export async function generarLiquidacionPDF(datos: DatosLiquidacion): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const margenIzquierdo = 15
  const margenDerecho = 15
  const margenSuperior = 15
  const anchoPagina = doc.internal.pageSize.width
  const anchoDisponible = anchoPagina - margenIzquierdo - margenDerecho
  let posicionY = margenSuperior

  // ==========================================
  // ENCABEZADO
  // ==========================================
  
  // Logo y título
  try {
    const logoUrl = "/logo.png"
    const anchoLogo = 50
    const altoLogo = anchoLogo / (234/82)
    doc.addImage(logoUrl, "PNG", margenIzquierdo, posicionY, anchoLogo, altoLogo)
  } catch (error) {
    console.error("Error al cargar el logo:", error)
  }

  // Título a la derecha
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("LIQUIDACIÓN DE SUPERVISOR", anchoPagina - margenDerecho, posicionY + 5, { align: "right" })
  
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Código: ${datos.codigo}`, anchoPagina - margenDerecho, posicionY + 12, { align: "right" })
  doc.text(`Fecha: ${format(datos.fecha, "d MMM yyyy", { locale: es })}`, anchoPagina - margenDerecho, posicionY + 17, { align: "right" })

  posicionY += 30

  // ==========================================
  // INFORMACIÓN GENERAL
  // ==========================================
  
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("INFORMACIÓN DE LA TAREA", margenIzquierdo, posicionY)
  posicionY += 6

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text(`Tarea: ${datos.tarea.titulo}`, margenIzquierdo, posicionY)
  posicionY += 5
  doc.text(`Supervisor: ${datos.supervisor.email}`, margenIzquierdo, posicionY)
  posicionY += 10

  // ==========================================
  // RESUMEN DE CÁLCULOS
  // ==========================================
  
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("RESUMEN DE LIQUIDACIÓN", margenIzquierdo, posicionY)
  posicionY += 8

  const tablaResumen = [
    ["Concepto", "Monto"],
    ["Presupuesto Base", `$${datos.presupuestoBase.toLocaleString('es-AR')}`],
    ["(-) Gastos Reales", `$${datos.gastosReales.toLocaleString('es-AR')}`],
    ["(=) Ganancia Neta", `$${datos.gananciaNeta.toLocaleString('es-AR')}`],
    ["", ""],
    ["Ganancia Supervisor (50%)", `$${datos.gananciaSupervisor.toLocaleString('es-AR')}`],
    ["Ganancia Administración (50%)", `$${datos.gananciaAdmin.toLocaleString('es-AR')}`],
  ]

  autoTable(doc, {
    body: tablaResumen,
    startY: posicionY,
    margin: { left: margenIzquierdo, right: margenDerecho },
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: anchoDisponible * 0.65, fontStyle: 'bold' },
      1: { cellWidth: anchoDisponible * 0.35, halign: 'right' },
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    didParseCell: (data: any) => {
      // Resaltar la ganancia neta
      if (data.row.index === 3 && data.section === 'body') {
        data.cell.styles.fillColor = [240, 240, 240]
        data.cell.styles.fontStyle = 'bold'
      }
      // Resaltar las ganancias
      if ((data.row.index === 5 || data.row.index === 6) && data.section === 'body') {
        data.cell.styles.fillColor = [250, 250, 250]
      }
    },
    didDrawPage: (data: any) => {
      posicionY = data.cursor.y + 5
    },
  })

  // ==========================================
  // DESGLOSE DE GASTOS REALES
  // ==========================================
  
  if (datos.desglose && datos.desglose.length > 0) {
    posicionY += 5
    
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("DESGLOSE DE GASTOS REALES", margenIzquierdo, posicionY)
    posicionY += 8

    // Materiales
    const materiales = datos.desglose.find(d => d.categoria === 'materiales')
    if (materiales && materiales.cantidad_registros > 0) {
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text(`📦 MATERIALES (${materiales.cantidad_registros} comprobantes) - $${materiales.monto_total.toLocaleString('es-AR')}`, margenIzquierdo, posicionY)
      posicionY += 6

      const bodyMateriales = materiales.detalle.map((item, idx) => [
        `#${idx + 1}`,
        item.descripcion || 'Sin descripción',
        item.fecha ? format(new Date(item.fecha), "dd/MM/yyyy", { locale: es }) : '-',
        `$${item.monto.toLocaleString('es-AR')}`,
      ])

      autoTable(doc, {
        head: [['#', 'Descripción', 'Fecha', 'Monto']],
        body: bodyMateriales,
        startY: posicionY,
        margin: { left: margenIzquierdo + 5, right: margenDerecho },
        theme: 'striped',
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: anchoDisponible * 0.50 },
          2: { cellWidth: 25 },
          3: { cellWidth: anchoDisponible * 0.25, halign: 'right' },
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [100, 150, 200],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        didDrawPage: (data: any) => {
          posicionY = data.cursor.y + 5
        },
      })
    }

    // Jornales
    const jornales = datos.desglose.find(d => d.categoria === 'jornales')
    if (jornales && jornales.cantidad_registros > 0) {
      // Verificar si necesitamos nueva página
      if (posicionY > doc.internal.pageSize.height - 60) {
        doc.addPage()
        posicionY = margenSuperior
      }

      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text(`💼 JORNALES (${jornales.cantidad_registros} jornadas) - $${jornales.monto_total.toLocaleString('es-AR')}`, margenIzquierdo, posicionY)
      posicionY += 6

      const bodyJornales = jornales.detalle.map((item, idx) => [
        `#${idx + 1}`,
        item.fecha ? format(new Date(item.fecha), "dd/MM/yyyy", { locale: es }) : '-',
        item.tipo_jornada === 'dia_completo' ? 'Día completo' : 'Medio día',
        item.salario_diario ? `$${item.salario_diario.toLocaleString('es-AR')}` : '-',
        `$${(item.monto_calculado || 0).toLocaleString('es-AR')}`,
      ])

      autoTable(doc, {
        head: [['#', 'Fecha', 'Tipo', 'Salario/día', 'Total']],
        body: bodyJornales,
        startY: posicionY,
        margin: { left: margenIzquierdo + 5, right: margenDerecho },
        theme: 'striped',
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 25 },
          2: { cellWidth: anchoDisponible * 0.30 },
          3: { cellWidth: anchoDisponible * 0.25, halign: 'right' },
          4: { cellWidth: anchoDisponible * 0.25, halign: 'right' },
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [220, 120, 50],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        didDrawPage: (data: any) => {
          posicionY = data.cursor.y + 5
        },
      })
    }

    // Total de gastos
    posicionY += 3
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text(`TOTAL GASTOS REALES: $${datos.gastosReales.toLocaleString('es-AR')}`, margenIzquierdo, posicionY)
    posicionY += 8
  }

  // ==========================================
  // LIQUIDACIÓN FINAL
  // ==========================================
  
  // Verificar si necesitamos nueva página
  if (posicionY > doc.internal.pageSize.height - 50) {
    doc.addPage()
    posicionY = margenSuperior
  }

  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("LIQUIDACIÓN FINAL - SUPERVISOR", margenIzquierdo, posicionY)
  posicionY += 8

  const tablaFinal = [
    ["Ganancia del Supervisor", `$${datos.gananciaSupervisor.toLocaleString('es-AR')}`],
    ["(+) Gastos Reales (reembolso)", `$${datos.gastosReales.toLocaleString('es-AR')}`],
    ["TOTAL A PAGAR AL SUPERVISOR", `$${datos.totalSupervisor.toLocaleString('es-AR')}`],
  ]

  autoTable(doc, {
    body: tablaFinal,
    startY: posicionY,
    margin: { left: margenIzquierdo, right: margenDerecho },
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: anchoDisponible * 0.65, fontStyle: 'bold' },
      1: { cellWidth: anchoDisponible * 0.35, halign: 'right', fontStyle: 'bold' },
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    didParseCell: (data: any) => {
      // Resaltar la fila del total
      if (data.row.index === 2 && data.section === 'body') {
        data.cell.styles.fillColor = [50, 100, 200]
        data.cell.styles.textColor = [255, 255, 255]
        data.cell.styles.fontSize = 12
        data.cell.styles.fontStyle = 'bold'
      }
    },
    didDrawPage: (data: any) => {
      posicionY = data.cursor.y + 10
    },
  })

  // Nota al pie
  doc.setFontSize(8)
  doc.setFont("helvetica", "italic")
  const nota = "* El total incluye el reembolso de los gastos pagados por el supervisor durante la ejecución de la tarea."
  const notaLineas = doc.splitTextToSize(nota, anchoDisponible)
  doc.text(notaLineas, margenIzquierdo, posicionY)

  // Advertencia de sobrecosto
  if (datos.sobrecosto) {
    posicionY += 10
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(200, 0, 0)
    doc.text("⚠️ ATENCIÓN: ESTA TAREA TIENE SOBRECOSTO", margenIzquierdo, posicionY)
    doc.setTextColor(0, 0, 0)
    posicionY += 5
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text(`Monto del sobrecosto: $${(datos.montoSobrecosto || 0).toLocaleString('es-AR')}`, margenIzquierdo, posicionY)
  }

  // Pie de página con número de página
  const totalPaginas = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    
    // Información de la empresa
    doc.text("SERVICIOS PARA CONSORCIO", margenIzquierdo, doc.internal.pageSize.height - 10)
    doc.text("Tel: 1131259449 | Email: lowin30@gmail.com", margenIzquierdo, doc.internal.pageSize.height - 6)
    
    // Número de página
    doc.text(`Página ${i} de ${totalPaginas}`, anchoPagina - margenDerecho, doc.internal.pageSize.height - 6, { align: 'right' })
    
    doc.setTextColor(0, 0, 0)
  }

  return doc.output("blob")
}

/**
 * Obtiene los datos necesarios para generar el PDF de liquidación
 */
export async function obtenerDatosLiquidacion(liquidacionId: number): Promise<DatosLiquidacion> {
  const supabase = createClient()

  // Obtener datos de la liquidación
  const { data: liquidacion, error } = await supabase
    .from('vista_liquidaciones_completa')
    .select('*')
    .eq('id', liquidacionId)
    .single()

  if (error || !liquidacion) {
    throw new Error(`Error al obtener liquidación: ${error?.message}`)
  }

  // Obtener desglose de gastos
  let desglose: CategoriaGastos[] = []
  try {
    const { data: desgloseData } = await supabase.rpc(
      'obtener_desglose_gastos_para_liquidacion',
      { p_id_tarea: liquidacion.id_tarea }
    )
    desglose = desgloseData || []
  } catch (err) {
    console.error('Error al obtener desglose:', err)
  }

  return {
    codigo: liquidacion.code,
    fecha: new Date(liquidacion.created_at),
    tarea: {
      titulo: liquidacion.titulo_tarea,
      codigo: liquidacion.code_presupuesto_base,
    },
    supervisor: {
      email: liquidacion.email_supervisor || 'Sin supervisor',
    },
    presupuestoBase: liquidacion.total_base,
    gastosReales: liquidacion.gastos_reales,
    gananciaNeta: liquidacion.ganancia_neta,
    gananciaSupervisor: liquidacion.ganancia_supervisor,
    gananciaAdmin: liquidacion.ganancia_admin,
    totalSupervisor: liquidacion.total_supervisor,
    sobrecosto: liquidacion.sobrecosto,
    montoSobrecosto: liquidacion.monto_sobrecosto,
    desglose,
  }
}
