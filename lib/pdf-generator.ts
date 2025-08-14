// Importación de jspdf y autotable
import { jsPDF } from "jspdf"
// Importamos el plugin de manera que podamos usar directamente el objeto
import { default as autoTable } from "jspdf-autotable"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { getSupabaseClient } from "./supabase-client"

// Tipos para los ítems del presupuesto
interface PresupuestoItem {
  id: number
  descripcion: string
  cantidad: number
  tarifa: number
  total: number
}

// Tipo para los datos del presupuesto
interface DatosPresupuesto {
  codigo: string
  fecha: Date
  referencia: string
  cliente: {
    nombre: string
    cuit: string
    departamento?: string
    tarea?: string
  }
  items: PresupuestoItem[]
  notas?: string[]
  terminosCondiciones?: string[]
  totalPresupuesto: number
}

/**
 * Genera un PDF de presupuesto con el formato exacto solicitado
 */
export async function generarPresupuestoPDF(datos: DatosPresupuesto): Promise<Blob> {
  // Crear un nuevo documento PDF
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  // Configuración de márgenes y posiciones
  const margenIzquierdo = 10 // 1 cm en cada lado
  const margenSuperior = 10 // 1 cm en la parte superior
  let posicionY = margenSuperior

  // Primero colocar el título principal bien arriba
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text(
    "ALBAÑILERIA - PINTURA - IMPERMEABILIZACION - GAS - PLOMERIA - ELECTRICIDAD",
    doc.internal.pageSize.width / 2,
    posicionY + 5,
    { align: "center" },
  )

  // Después añadir logo y datos del presupuesto en la parte superior
  posicionY += 10
  
  try {
    // Cargar el logo desde la carpeta pública con su forma original
    const logoUrl = "/logo.png" // Ruta al logo en public
    // Mantener la proporción exacta del logo: 234x82 píxeles (2.85:1)
    const anchoLogo = 60 // Ancho fijo en unidades del PDF
    const altoLogo = anchoLogo / (234/82) // Calcular altura proporcional
    doc.addImage(logoUrl, "PNG", margenIzquierdo, posicionY, anchoLogo, altoLogo)
  } catch (error) {
    console.error("Error al cargar el logo:", error)
    // Si hay error al cargar la imagen, mostrar el nombre de la empresa como texto
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("SERVICIOS PARA CONSORCIO", margenIzquierdo, posicionY + 15)
  }
    
  // Fecha y código del presupuesto (a la derecha)
  // Calculamos la posición derecha para alinear el texto
  const posicionDerecha = doc.internal.pageSize.width - margenIzquierdo
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Fecha del Estimación: ${format(datos.fecha, "d MMM yyyy", { locale: es })}`, posicionDerecha, posicionY + 5, { align: "right" })
  doc.text(`Presupuesto # ${datos.codigo}`, posicionDerecha, posicionY + 12, { align: "right" })

  // El Total se mostrará debajo de la tabla

  // Datos fijos de la empresa - como se ve en la imagen de referencia
  posicionY += 25 // Reducido para menos espacio debajo del logo
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text("araoz 2989 - asdas", margenIzquierdo, posicionY)
  
  posicionY += 4
  doc.text("CUIT: 30535050483", margenIzquierdo, posicionY)
  
  // Eliminamos la segunda repetición de la tarea
  // Solo dejamos la tarea del cliente si existe
  if (datos.cliente.tarea && !datos.cliente.tarea.includes("araoz 2989")) {
    posicionY += 4 
    doc.text(`${datos.cliente.tarea}`, margenIzquierdo, posicionY)
  }

  // Datos de contacto - justo debajo de la fecha y código a la derecha
  // Reusamos la variable posicionDerecha para alineación
  let posicionYDerecha = posicionY - 5 // Usar una altura adecuada en relación a los datos fijos
  
  doc.setFontSize(9)
  doc.text("1131259449", posicionDerecha, posicionYDerecha, { align: "right" })
  posicionYDerecha += 4
  doc.text("lowin30@gmail.com", posicionDerecha, posicionYDerecha, { align: "right" })

  // Tabla de ítems - espacio reducido para mayor compacidad
  posicionY += 8

  // Encabezados de la tabla
  const headers = [["#", "Artículo & Descripción", "Cant.", "Tarifa", "Cantidad"]]

  // Datos de la tabla
  const body = datos.items.map((item) => {
    // Dividir la descripción en líneas si es muy larga
    const descripcionLineas = doc.splitTextToSize(item.descripcion, 100)

    return [
      item.id.toString(),
      descripcionLineas,
      item.cantidad.toFixed(2),
      item.tarifa.toLocaleString(),
      item.total.toLocaleString(),
    ]
  })

  // Calcular el ancho disponible de la página
  const anchoPagina = doc.internal.pageSize.width
  const margenDerecho = 10 // 1 cm igual que el margen izquierdo
  const anchoDisponible = anchoPagina - margenIzquierdo - margenDerecho
  
  // Añadir la tabla con ancho completo
  autoTable(doc, {
    head: headers,
    body: body,
    startY: posicionY,
    margin: { left: margenIzquierdo, right: margenDerecho },
    columnStyles: {
      0: { cellWidth: anchoDisponible * 0.05 }, // 5% para el número
      1: { cellWidth: anchoDisponible * 0.55 }, // 55% para la descripción (aumentado)
      2: { cellWidth: anchoDisponible * 0.10 }, // 10% para la cantidad (reducido)
      3: { cellWidth: anchoDisponible * 0.15 }, // 15% para la tarifa
      4: { cellWidth: anchoDisponible * 0.15 }, // 15% para el total
    },
    styles: {
      fontSize: 10,
      cellPadding: 2, // Reducido para hacer la tabla más compacta
    },
    headStyles: {
      fillColor: [200, 200, 200],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    didDrawPage: (data: any) => {
      // Actualizar la posición Y después de dibujar la tabla
      posicionY = data.cursor.y + 8
      
      // Añadir el Total debajo de la tabla, formato "Total $XXXX"
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      // Alineado a la derecha como solicita el usuario
      doc.text(`Total $${datos.totalPresupuesto.toLocaleString()}`, posicionDerecha, posicionY, { align: "right" })
    },
  })

  // Notas
  if (datos.notas && datos.notas.length > 0) {
    posicionY += 10 // Espacio adicional después del total
    doc.setFontSize(9) // Tamaño ligeramente reducido
    doc.setFont("helvetica", "bold")
    doc.text("Notas", margenIzquierdo, posicionY)
    posicionY += 4 // Espaciado más compacto

    doc.setFont("helvetica", "normal")
    datos.notas.forEach((nota) => {
      // Usar el mismo ancho disponible que la tabla (anchoPagina - margenIzquierdo - margenDerecho)
      const notaLineas = doc.splitTextToSize(nota, anchoPagina - margenIzquierdo - margenDerecho)
      doc.text(notaLineas, margenIzquierdo, posicionY)
      posicionY += 4 * notaLineas.length // Espaciado más compacto
    })
  }

  // Términos y condiciones
  if (datos.terminosCondiciones && datos.terminosCondiciones.length > 0) {
    posicionY += 4 // Espaciado más compacto
    doc.setFontSize(9) // Tamaño ligeramente reducido
    doc.setFont("helvetica", "bold")
    doc.text("Términos y condiciones", margenIzquierdo, posicionY)
    posicionY += 4 // Espaciado más compacto

    doc.setFont("helvetica", "normal")
    datos.terminosCondiciones.forEach((termino) => {
      const terminoLineas = doc.splitTextToSize(termino, doc.internal.pageSize.width - 40)
      doc.text(terminoLineas, margenIzquierdo, posicionY)
      posicionY += 4 * terminoLineas.length // Espaciado más compacto
    })
  }

  // Generar el blob del PDF
  const pdfBlob = doc.output("blob")
  return pdfBlob
}

/**
 * Genera un PDF con los gastos de una tarea
 * @param tareaId ID de la tarea para la que se generará el PDF de gastos
 * @returns Blob con el PDF generado
 */
export async function generarGastosTareaPDF(tareaId: number): Promise<{blob: Blob, filename: string}> {
  const supabase = getSupabaseClient()
  
  // Definir tipos para los gastos
  interface CategoriaGasto {
    nombre: string;
  }

  interface Gasto {
    id: number;
    fecha: string;
    descripcion: string;
    monto: string;
    comprobante: string | null;
    categoria_gasto_id: number;
    categorias_gastos: CategoriaGasto | { nombre: string }[];
  }

  const { data: gastos, error } = await supabase
    .from("gastos")
    .select(
      `
      id,
      fecha,
      descripcion,
      monto,
      comprobante,
      categoria_gasto_id,
      categorias_gastos(nombre)
    `,
    )
    .eq("tarea_id", tareaId)
    .order("fecha", { ascending: true })

  if (error) {
    console.error("Error al obtener los gastos:", error)
    throw new Error(`Error al obtener los gastos: ${error.message}`)
  }

  const { data: tarea, error: errorTarea } = await supabase
    .from("tareas")
    .select(
      `
      id,
      codigo,
      referencia,
      direccion,
      descripcion
    `,
    )
    .eq("id", tareaId)
    .single()

  if (errorTarea || !tarea) {
    console.error("Error al obtener la tarea:", errorTarea)
    throw new Error(`Error al obtener la tarea: ${errorTarea?.message}`)
  }

  // Calcular el total de gastos
  const totalGastos = gastos.reduce((total, gasto) => total + parseFloat(gasto.monto), 0)

  // Crear un nuevo documento PDF
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  // Configuración de márgenes y posiciones
  const margenIzquierdo = 20
  const margenSuperior = 20
  let posicionY = margenSuperior

  // Añadir título
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("Detalle de Gastos", doc.internal.pageSize.width / 2, posicionY, { align: "center" })
  posicionY += 10

  // Añadir información de la tarea
  doc.setFontSize(12)
  doc.text(`Tarea: ${tarea.codigo} - ${tarea.referencia}`, margenIzquierdo, posicionY)
  posicionY += 6

  if (tarea.direccion) {
    doc.text(`Dirección: ${tarea.direccion}`, margenIzquierdo, posicionY)
    posicionY += 6
  }

  if (tarea.descripcion) {
    doc.text(`Descripción: ${tarea.descripcion}`, margenIzquierdo, posicionY)
    posicionY += 6
  }

  // Fecha de generación del informe
  const fechaActual = format(new Date(), "d MMMM yyyy", { locale: es })
  doc.text(`Fecha de generación: ${fechaActual}`, margenIzquierdo, posicionY)
  posicionY += 10

  // Tabla de gastos
  const headers = [["Fecha", "Descripción", "Categoría", "Monto"]]

  const body = (gastos as any[]).map((gasto) => {
    const fechaFormateada = format(new Date(gasto.fecha), "d MMM yyyy", { locale: es })
    
    // Manejar categorias_gastos que puede ser un objeto o un array
    let nombreCategoria = '-'
    if (Array.isArray(gasto.categorias_gastos) && gasto.categorias_gastos.length > 0) {
      nombreCategoria = gasto.categorias_gastos[0].nombre || '-'
    } else if (gasto.categorias_gastos && typeof gasto.categorias_gastos === 'object') {
      nombreCategoria = gasto.categorias_gastos.nombre || '-'
    }
    
    return [
      fechaFormateada,
      gasto.descripcion,
      nombreCategoria,
      `$${parseFloat(gasto.monto).toLocaleString("es-AR")}`,
    ]
  })

  autoTable(doc, {
    head: headers,
    body: body,
    startY: posicionY,
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [200, 200, 200],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 25 }, // Fecha
      1: { cellWidth: 80 }, // Descripción
      2: { cellWidth: 40 }, // Categoría
      3: { cellWidth: 25 }, // Monto
    },
    didDrawPage: (data: any) => {
      // Actualizar la posición Y después de dibujar la tabla
      posicionY = data.cursor.y + 10
    },
  })

  // Añadir el total de gastos
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text(`Total de Gastos: $${totalGastos.toLocaleString("es-AR")}`, doc.internal.pageSize.width - margenIzquierdo, posicionY, {
    align: "right",
  })

  // Añadir número de página
  const totalPaginas = (doc as any).internal.getNumberOfPages()
  
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Página ${i} de ${totalPaginas}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10)
  }

  // Retornar el PDF como blob
  return { 
    blob: doc.output('blob'),
    filename: `Gastos_${tarea.codigo}.pdf`
  }
}
