// PDF Generation Utilities
import { jsPDF } from 'jspdf';
import { createClient } from '@/lib/supabase-client';
import { formatDate } from '@/lib/date-utils';

/**
 * Convierte un Blob a Base64
 * @param blob Blob a convertir
 * @returns Promise con la cadena Base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      // Eliminar el prefijo "data:image/jpeg;base64," para obtener solo los datos
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Genera un PDF unificado con todas las imágenes de una tarea
 * @param taskId ID de la tarea
 * @param taskTitle Título de la tarea
 * @returns Blob con el PDF generado
 */
export async function generateTaskPDF(taskId: number, taskTitle: string): Promise<Blob> {
  // 1. Obtener todas las imágenes de la tarea
  const supabase = createClient();
  const storageResponse = await supabase.storage
    .from('comprobantes')
    .list(`tareas/${taskId}/comprobantes`);
  
  if (storageResponse.error) throw storageResponse.error;
  
  // 2. Si no hay imágenes, devolver un PDF vacío con mensaje
  if (!storageResponse.data || storageResponse.data.length === 0) {
    const emptyPDF = new jsPDF();
    emptyPDF.text('No se encontraron comprobantes para esta tarea.', 20, 20);
    return emptyPDF.output('blob');
  }
  
  // 3. Descargar cada imagen
  const images = await Promise.all(
    storageResponse.data.map(async (file) => {
      const { data, error } = await supabase.storage
        .from('comprobantes')
        .download(`tareas/${taskId}/comprobantes/${file.name}`);
      
      if (error) throw error;
      
      // Obtener datos del gasto relacionado con esta imagen
      const { data: gastoData } = await supabase
        .from('gastos_tarea')
        .select('*')
        .eq('id_tarea', taskId)
        .eq('comprobante_url', `${supabase.storage.from('comprobantes').getPublicUrl(`tareas/${taskId}/comprobantes/${file.name}`).data.publicUrl}`)
        .single();
      
      return { 
        name: file.name,
        data,
        gastoInfo: gastoData || null
      };
    })
  );
  
  // 4. Crear PDF con jsPDF
  const doc = new jsPDF();
  
  // Agregar metadata
  doc.setProperties({
    title: `Comprobantes Tarea #${taskId} - ${taskTitle}`,
    subject: 'Comprobantes de gastos',
    creator: 'Sistema SPC',
    keywords: 'comprobantes, gastos, liquidación'
  });
  
  // Página de portada
  doc.setFontSize(22);
  doc.text(`Comprobantes de Gastos`, 105, 30, { align: 'center' });
  doc.setFontSize(16);
  doc.text(`Tarea: ${taskTitle}`, 105, 50, { align: 'center' });
  doc.text(`Código: ${taskId}`, 105, 60, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Fecha de generación: ${formatDate(new Date().toISOString())}`, 105, 70, { align: 'center' });
  doc.text(`Total de comprobantes: ${images.length}`, 105, 80, { align: 'center' });
  
  // Agregar cada imagen
  for (let i = 0; i < images.length; i++) {
    // Agregar nueva página para cada imagen después de la portada
    doc.addPage();
    
    // Convertir blob a base64
    const imgData = await blobToBase64(images[i].data);
    
    try {
      // Agregar imagen a página completa
      const imgProps = doc.getImageProperties(`data:image/jpeg;base64,${imgData}`);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Calcular proporciones para ajustar a página con margen
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      const maxHeight = pageHeight - (margin * 2) - 30; // 30px para dejar espacio al pie de página
      
      const ratio = Math.min(
        maxWidth / imgProps.width,
        maxHeight / imgProps.height
      );
      
      const width = imgProps.width * ratio;
      const height = imgProps.height * ratio;
      const x = (pageWidth - width) / 2;
      const y = margin;
      
      // Añadir la imagen
      doc.addImage(`data:image/jpeg;base64,${imgData}`, 'JPEG', x, y, width, height);
      
      // Agregar información del gasto debajo de la imagen
      if (images[i].gastoInfo) {
        const gasto = images[i].gastoInfo;
        const infoY = y + height + 10;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`COMPROBANTE #${i+1}`, 20, infoY);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Descripción: ${gasto.descripcion}`, 20, infoY + 7);
        doc.text(`Monto: $${gasto.monto.toLocaleString('es-CL')}`, 20, infoY + 14);
        doc.text(`Fecha: ${formatDate(gasto.fecha_gasto)}`, 20, infoY + 21);
        
        if (gasto.datos_ocr) {
          let datosOCR;
          try {
            datosOCR = JSON.parse(gasto.datos_ocr);
            if (datosOCR.confianza) {
              doc.text(`Confianza OCR: ${datosOCR.confianza}%`, 120, infoY + 7);
            }
          } catch (e) {
            console.error('Error al parsear datos OCR:', e);
          }
        }
      }
      
      // Agregar pie de página con número de página
      doc.setFontSize(8);
      doc.text(`Página ${i+2} de ${images.length+1}`, pageWidth - 28, pageHeight - 10);
    } catch (error) {
      console.error('Error al procesar imagen para PDF:', error);
      doc.text(`Error al procesar esta imagen`, 20, 20);
    }
  }
  
  return doc.output('blob');
}
