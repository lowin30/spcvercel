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
  }  // Título a la derecha
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("liquidacion de supervisor", anchoPagina - margenDerecho, posicionY + 5, { align: "right" })
  
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text(`codigo: ${datos.codigo.toLowerCase()}`, anchoPagina - margenDerecho, posicionY + 12, { align: "right" })
  doc.text(`fecha: ${format(datos.fecha, "d MMM yyyy", { locale: es }).toLowerCase()}`, anchoPagina - margenDerecho, posicionY + 17, { align: "right" })

  posicionY += 30

  // ==========================================
  // INFORMACIÓN GENERAL
  // ==========================================
  
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("informacion de la tarea", margenIzquierdo, posicionY)
  posicionY += 6

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text(`tarea: ${datos.tarea.titulo.toLowerCase()}`, margenIzquierdo, posicionY)
  posicionY += 4
  doc.text(`supervisor: ${datos.supervisor.email.toLowerCase()}`, margenIzquierdo, posicionY)
  posicionY += 10

  // ==========================================
  // RESUMEN DE CÁLCULOS (6 COLUMNAS)
  // ==========================================
  
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("detalle financiero de liquidacion", margenIzquierdo, posicionY)
  posicionY += 6

  const headers = [
    "base",
    "gastos",
    "neta",
    "ganancia",
    "bruto"
  ]

  const totalBruto = (datos.gananciaSupervisor || 0) + (datos.gastosReales || 0)

  autoTable(doc, {
    head: [headers],
    body: [[
      `$${datos.presupuestoBase.toLocaleString('es-AR')}`,
      `$${datos.gastosReales.toLocaleString('es-AR')}`,
      `$${datos.gananciaNeta.toLocaleString('es-AR')}`,
      `$${datos.gananciaSupervisor.toLocaleString('es-AR')}`,
      `$${datos.totalSupervisor.toLocaleString('es-AR')}`,
    ]],
    startY: posicionY,
    margin: { left: margenIzquierdo, right: margenDerecho },
    theme: 'grid',
    headStyles: {
      fillColor: [39, 39, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      halign: 'right'
    },
    didDrawPage: (data: any) => {
      posicionY = data.cursor.y + 12
    },
  })

  // ==========================================
  // DESGLOSE DE GASTOS REALES (GRILLA O TABLA SIMPLIFICADA)
  // ==========================================
  
  if (datos.desglose && datos.desglose.length > 0) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("transparencia de gastos reales (reembolsos)", margenIzquierdo, posicionY)
    posicionY += 6

    datos.desglose.forEach((cat) => {
      if (cat.cantidad_registros > 0) {
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(113, 113, 122)
        doc.text(`${cat.categoria.toLowerCase()} (${cat.cantidad_registros} items) - total: $${cat.monto_total.toLocaleString('es-AR')}`, margenIzquierdo, posicionY)
        posicionY += 4

        const bodyItems = cat.detalle.map((item) => [
          item.fecha ? format(new Date(item.fecha), "dd/MM/yyyy") : '-',
          item.descripcion?.toLowerCase() || (cat.categoria === 'jornales' ? 'jornal' : 'material'),
          `$${(item.monto || item.monto_calculado || 0).toLocaleString('es-AR')}`,
        ])

        autoTable(doc, {
          head: [['fecha', 'descripcion', 'monto']],
          body: bodyItems,
          startY: posicionY,
          margin: { left: margenIzquierdo + 5, right: margenDerecho },
          theme: 'striped',
          headStyles: {
            fillColor: [244, 244, 245],
            textColor: [39, 39, 42],
            fontSize: 7,
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 7,
            cellPadding: 2,
          },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: anchoDisponible - 55 },
            2: { cellWidth: 25, halign: 'right' },
          },
          didDrawPage: (data: any) => {
            posicionY = data.cursor.y + 8
          },
        })

        if (posicionY > doc.internal.pageSize.height - 40) {
          doc.addPage()
          posicionY = margenSuperior
        }
      }
    })
  }

  // ==========================================
  // LIQUIDACIÓN FINAL
  // ==========================================
  
  posicionY += 5
  doc.setFillColor(9, 9, 11)
  doc.roundedRect(margenIzquierdo, posicionY, anchoDisponible, 40, 3, 3, "F")
  
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(52, 211, 153)
  doc.text("neto transferido:", margenIzquierdo + 10, posicionY + 22)
  doc.setFontSize(22)
  doc.text(`$${datos.totalSupervisor.toLocaleString('es-AR')}`, anchoPagina - margenDerecho - 10, posicionY + 24, { align: "right" })

  // Nota al pie
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(150, 150, 150)
  const nota = "* el total incluye el reembolso de los gastos reales pagados por el supervisor mas su ganancia pactada."
  doc.text(nota, margenIzquierdo, doc.internal.pageSize.height - 15)

  // Advertencia de sobrecosto
  if (datos.sobrecosto) {
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(251, 113, 133)
    doc.text("atencion: esta tarea tiene sobrecosto asociado.", margenIzquierdo, doc.internal.pageSize.height - 25)
  }

  // Pie de página
  const totalPaginas = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`spc platinum system - pagina ${i} de ${totalPaginas}`, anchoPagina - margenDerecho, doc.internal.pageSize.height - 8, { align: 'right' })
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
