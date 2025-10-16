import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from "./supabase-client"

// Extender jsPDF para TypeScript para poder acceder a propiedades internas
type ExtendedJsPDF = jsPDF & {
  internal: {
    pageSize: {
      getWidth: () => number
      getHeight: () => number
      width: number
      height: number
    }
    getNumberOfPages: () => number
  }
}

// Definiciones de tipos para los gastos y tareas
interface GastoTarea {
  id: number
  id_usuario: string
  monto: number
  descripcion: string
  fecha_gasto: string
  imagen_procesada_url?: string
  tarea_id: number
  ubicacion?: string
  procesado?: boolean
  fecha_creacion?: string
  fecha_actualizacion?: string
}

interface DatosTarea {
  id: number
  code?: string
  titulo?: string
  nombre?: string
  descripcion?: string
  fecha_inicio?: string
  id_edificio?: number | null
  id_asignado?: string | null
  codigo?: string
}

/**
 * Genera un PDF con los gastos de una tarea, incluyendo las imágenes procesadas
 * @param tareaId ID de la tarea para generar el PDF
 * @returns Objeto con el blob del PDF, nombre de archivo y monto total
 */
export async function generarGastosTareaPDF(tareaId: number): Promise<{blob: Blob, filename: string, montoTotal: number}> {
  // Obtener cliente Supabase
  const supabase = createClient()
  if (!supabase) {
    throw new Error('Cliente Supabase no disponible')
  }
  
  // Obtener datos de la tarea
  const { data: datosTarea, error: errorTarea } = await supabase
    .from('tareas')
    .select('*')
    .eq('id', tareaId)
    .single()
  
  if (errorTarea || !datosTarea) {
    throw new Error(`Error al obtener datos de la tarea: ${errorTarea?.message || 'No se encontró la tarea'}`)
  }
  
  // Obtener SOLO gastos de MATERIALES con imágenes (procesadas o originales)
  const { data: gastos, error: errorGastos } = await supabase
    .from('gastos_tarea')
    .select('*')
    .eq('id_tarea', tareaId)
    .eq('tipo_gasto', 'material') // ✅ SOLO MATERIALES
    .or('imagen_procesada_url.not.is.null,comprobante_url.not.is.null') // ✅ SOLO CON FOTOS
    .order('fecha_gasto', { ascending: true })
  
  if (errorGastos || !gastos) {
    throw new Error(`Error al obtener gastos de la tarea: ${errorGastos?.message || 'No se encontraron gastos'}`)
  }
  
  // Si no hay gastos, lanzar error
  if (gastos.length === 0) {
    throw new Error('No hay gastos para generar el PDF')
  }
  
  // Crear instancia de jsPDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  }) as ExtendedJsPDF
  
  // Variables para márgenes y fecha actual
  const margenIzquierdo = 20
  const margenSuperior = 20
  const fechaHoy = new Date()
  const fechaActual = format(fechaHoy, "d 'de' MMMM 'de' yyyy, HH:mm:ss", { locale: es })
  
  // Calcular monto total de los gastos
  let montoTotal = 0;
  for (const gasto of gastos) {
    montoTotal += Number(gasto.monto) || 0;
  }
  
  try {
    // Crear portada
    doc.setFillColor(230, 230, 230)
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 40, 'F')
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(40, 40, 40)
    doc.text('Informe de Gastos - MATERIALES', doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' })
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(14)
    doc.setTextColor(80, 80, 80)
    doc.text(`Fecha: ${fechaActual}`, doc.internal.pageSize.getWidth() / 2, 35, { align: 'center' })
    
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(`Tarea: ${datosTarea.nombre || datosTarea.titulo || datosTarea.codigo || 'Sin nombre'}`, margenIzquierdo, 60)
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    if (datosTarea.descripcion) {
      doc.setFontSize(12)
      doc.text(`Descripción: ${datosTarea.descripcion}`, margenIzquierdo, 70)
    }
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    if (datosTarea.fecha_inicio) {
      // Manejo seguro de la fecha de inicio
      let fechaTarea: Date;
      try {
        fechaTarea = new Date(datosTarea.fecha_inicio as string);
      } catch (e) {
        fechaTarea = new Date();
      }
      doc.text(`Fecha de la tarea: ${format(fechaTarea, 'dd/MM/yyyy', { locale: es })}`, margenIzquierdo, 80)
    }
    doc.text(`Total gastos: $${montoTotal.toLocaleString('es-CL')}`, margenIzquierdo, 90)
    doc.text(`Número de comprobantes: ${gastos.length}`, margenIzquierdo, 100)
    
    // Agregar página nueva para cada gasto
    for (let i = 0; i < gastos.length; i++) {
      const gasto = gastos[i]
      if (i > 0) { // No agregar nueva página después de la portada
        doc.addPage()
      } else {
        // Espacio en blanco después de la portada si solo hay una página
        doc.text('', margenIzquierdo, 120)
      }
      
      // Variables para usar en toda la función
      let imageHeight = doc.internal.pageSize.height * 0.7 // 70% de la altura por defecto
      let errorMessage = ''
          // Verificar que la URL de la imagen procesada es válida
      if (gasto.imagen_procesada_url) {
        try {
          // Extraer la ruta de la imagen desde la URL completa
          console.log(`Procesando imagen de URL: ${gasto.imagen_procesada_url}`)
          
          // URL ejemplo: https://ejemplo.supabase.co/storage/v1/object/public/comprobantes/ruta/archivo.jpg
          const urlPartes = new URL(gasto.imagen_procesada_url as string)
          const fullPath = urlPartes.pathname
          let rutaImagen = ''
          
          // Método 1: Extracción por patrón '/storage/v1/object/public/comprobantes/'
          const storageIndex = fullPath.indexOf('/storage/v1/object/public/comprobantes/')
          if (storageIndex !== -1) {
            rutaImagen = fullPath.substring(storageIndex + '/storage/v1/object/public/comprobantes/'.length)
            console.log(`Método 1 - Ruta extraída: ${rutaImagen}`)
          } 
          // Método 2: Buscar 'comprobantes' en la URL
          else {
            const pathParts = fullPath.split('/')
            const comprobantesIndex = pathParts.indexOf('comprobantes')
            if (comprobantesIndex !== -1 && comprobantesIndex < pathParts.length - 1) {
              rutaImagen = pathParts.slice(comprobantesIndex + 1).join('/')
              console.log(`Método 2 - Ruta extraída: ${rutaImagen}`)
            } 
            // Método 3: Usar últimas dos partes como fallback
            else {
              rutaImagen = pathParts.slice(-2).join('/')
              console.log(`Método 3 - Ruta extraída: ${rutaImagen}`)
            }
          }
          
          console.log(`Intentando descargar imagen de ruta: ${rutaImagen}`)
          
          // Intentar obtener la imagen como blob
          const { data: imagenBlob, error: errorImagen } = await supabase.storage
            .from('comprobantes')
            .download(rutaImagen)
          
          if (errorImagen) {
            throw new Error(`Error Supabase: ${errorImagen.message}`)
          }
          
          if (!imagenBlob) {
            throw new Error('No se pudo obtener la imagen')
          }
          
          // Crear una URL para el blob obtenido
          const urlImagen = URL.createObjectURL(imagenBlob)
          console.log(`URL del blob creada: ${urlImagen}`)
          
          // Convertir Blob a base64 para incrustarlo en el PDF
          const reader = new FileReader()
          reader.readAsDataURL(imagenBlob)
          
          await new Promise<void>((resolve, reject) => {
            reader.onload = () => {
              try {
                if (reader.result) {
                  const base64String = reader.result as string
                  
                  console.log(`Añadiendo imagen a PDF (longitud base64: ${base64String.length})`)
                  
                  // Centrar la imagen en la página
                  const pageWidth = doc.internal.pageSize.getWidth()
                  const maxWidth = pageWidth * 0.8 // 80% del ancho de página
                  
                  doc.addImage(
                    base64String,
                    'JPEG',
                    (pageWidth - maxWidth) / 2,
                    25,
                    maxWidth,
                    imageHeight,
                    undefined,
                    'MEDIUM'
                  )
                  
                  console.log('Imagen añadida correctamente')
                } else {
                  throw new Error('El resultado de la lectura está vacío')
                }
              } catch (err) {
                errorMessage = `Error al procesar imagen: ${err instanceof Error ? err.message : 'Desconocido'}`
                console.error(errorMessage)
              }
              resolve()
            }
            
            reader.onerror = (e) => {
              errorMessage = `Error al leer la imagen como base64: ${e}`
              console.error(errorMessage)
              resolve()
            }
          })
          
        } catch (err) {
          errorMessage = `Error al procesar imagen: ${err instanceof Error ? err.message : 'Desconocido'}`
          console.error(errorMessage)
        } finally {
          if (errorMessage) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(12)
            doc.setTextColor(255, 0, 0)
            doc.text(`[${errorMessage}]`, margenIzquierdo, 50, { maxWidth: 170 })
          }
        }
      } else {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(12)
        doc.setTextColor(100, 100, 100)
        doc.text('[Sin imagen de comprobante]', margenIzquierdo, 50)
      }
      
      // Información del gasto
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      const alturaInfo = imageHeight + 30
      
      const montoFormateado = Number(gasto.monto).toLocaleString('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })
      
      doc.setFont('helvetica', 'bold')
      doc.text(`Monto: $${montoFormateado}`, margenIzquierdo, alturaInfo)
      
      // Quitamos fecha y descripción, solo mostramos el monto
      
      // Agregar número y fecha en el pie de página
      doc.setFontSize(10)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Página ${i + 1} de ${gastos.length + 1}`,
        doc.internal.pageSize.getWidth() - 20,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      )
      doc.text(
        `Generado el ${fechaActual}`,
        20,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'left' }
      )
    }
    
    // Agregar una página final con el resumen
    doc.addPage()
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen de Gastos', doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' })
    
    // Mostrar el monto total
    doc.setFontSize(18)
    doc.text(`MONTO TOTAL: $${montoTotal.toLocaleString('es-CL')}`, doc.internal.pageSize.getWidth() / 2, 70, { align: 'center' })
    
    // Agregar fecha del resumen
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Fecha de generación: ${fechaActual}`, doc.internal.pageSize.getWidth() / 2, 90, { align: 'center' })
    
    // Generar nombre del archivo: {NombreTarea}_Materiales_${Total}.pdf
    const nombreTarea = (
      datosTarea.titulo ||
      datosTarea.nombre ||
      datosTarea.code ||
      datosTarea.codigo ||
      `Tarea${tareaId}`
    ).replace(/[^a-zA-Z0-9\s]/g, '_').trim()
    
    // Formato del total: $XXX.XXX (sin decimales)
    const totalFormateado = montoTotal.toLocaleString('es-CL').replace(/\./g, '')
    const filename = `${nombreTarea}_Materiales_$${totalFormateado}.pdf`
    
    return {
      blob: doc.output('blob'),
      filename,
      montoTotal
    }
  } catch (error) {
    console.error('Error al generar PDF:', error)
    
    // En caso de error, retornar un PDF de error
    const errorFecha = new Date()
    const errorFechaStr = format(errorFecha, 'yyyyMMdd_HHmmss')
    const errorFilename = `Error_Gastos_Tarea_${tareaId}_${errorFechaStr}.pdf`
    return {
      blob: doc.output('blob'),
      filename: errorFilename,
      montoTotal: 0
    }
  }
}

/**
 * Guarda un PDF en Supabase Storage y actualiza la URL en la tabla de tareas
 * @param tareaId ID de la tarea
 * @param pdfBlob Blob del PDF a guardar
 * @returns URL pública del PDF guardado
 */
export async function guardarPDFGastosTarea(tareaId: number, pdfBlob: Blob): Promise<string> {
  const supabase = createClient()
  if (!supabase) {
    throw new Error('Cliente Supabase no disponible')
  }
  
  // Obtener código de la tarea para usarlo en el nombre de archivo
  const { data: datosRaw, error: errorTarea } = await supabase
    .from('tareas')
    .select('code')
    .eq('id', tareaId)
    .single()
    
  if (errorTarea) {
    console.error('Error al obtener datos de la tarea:', errorTarea)
    throw new Error(`No se pudo obtener datos de la tarea: ${errorTarea.message}`)
  }
  
  // Especificar el tipo correcto para los datos
  const datosTarea: { code: string | null } = { 
    code: (datosRaw?.code as string) || null 
  }
  
  // Verificar si hay código en la tarea
  if (!datosTarea.code) {
    console.warn('La tarea no tiene código, se usará el ID como nombre de archivo')
  }

  // Generar nombre del archivo sanitizado
  const codigoSanitizado = datosTarea.code ? datosTarea.code.replace(/[^a-zA-Z0-9]/g, '_') : `tarea_${tareaId}`
  const fechaStr = format(new Date(), 'yyyyMMdd_HHmmss')
  const nombreArchivo = `Gastos_${codigoSanitizado}_${fechaStr}.pdf`
  
  try {  
    // Subir PDF a bucket 'documentos'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(`gastos/${nombreArchivo}`, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      })
    
    if (uploadError) {
      throw new Error(`Error al subir PDF: ${uploadError.message}`)
    }
    
    if (!uploadData || !uploadData.path) {
      throw new Error('No se pudo obtener la ruta del archivo subido')
    }
    
    // Obtener URL pública del archivo
    const { data: publicUrlData } = supabase.storage
      .from('documentos')
      .getPublicUrl(uploadData.path)
      
    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error('No se pudo generar la URL pública del PDF')
    }
    
    // Actualizar URL del PDF en la tabla de tareas
    const pdfUrl = publicUrlData.publicUrl
    const { error: updateError } = await supabase
      .from('tareas')
      .update({
        gastos_tarea_pdf: pdfUrl,
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('id', tareaId)
    
    if (updateError) {
      console.error('Error al actualizar URL en la tarea:', updateError)
    }
    
    return pdfUrl
  } catch (error) {
    console.error('Error al guardar PDF:', error)
    throw error
  }
}