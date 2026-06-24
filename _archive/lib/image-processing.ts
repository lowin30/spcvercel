// Utilidades para procesamiento de imágenes
// Implementación de carga dinámica de OpenCV
let cv: any = null;

async function loadOpenCV(): Promise<any> {
  if (cv) return cv;
  
  try {
    // Carga dinámica de OpenCV solo en el cliente
    if (typeof window !== 'undefined') {
      // Importación dinámica
      const opencv = await import('@techstark/opencv-js');
      cv = opencv.default || opencv;
      return cv;
    }
  } catch (error) {
    console.error('Error cargando OpenCV:', error);
    throw new Error('No se pudo cargar OpenCV');
  }
}

/**
 * Mejora una imagen para OCR detectando bordes y aplicando filtros
 * @param imageData Datos de la imagen como File o Blob
 * @returns Promise con los datos de la imagen mejorada
 */
export async function mejorarImagenParaOCR(imageData: File | Blob): Promise<Blob> {
  try {
    // Intentar cargar OpenCV dinámicamente
    await loadOpenCV();
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(imageData);
      
      img.onload = () => {
        // Crear canvas para procesar la imagen
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('No se pudo crear el contexto del canvas'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Obtener datos de la imagen
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Procesar con OpenCV
        try {
          const src = cv.matFromImageData(imageData);
          const dst = new cv.Mat();
          
          // Convertir a escala de grises
          cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
          
          // Aplicar umbral adaptativo para mejorar el contraste
          const processed = new cv.Mat();
          cv.adaptiveThreshold(dst, processed, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
          
          // Detectar bordes (opcional, si queremos recortar)
          const edges = new cv.Mat();
          cv.Canny(processed, edges, 50, 150);
          
          // Buscar contornos
          const contours = new cv.MatVector();
          const hierarchy = new cv.Mat();
          cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
          
          // Encontrar el contorno más grande (asumimos que es el recibo)
          let maxArea = 0;
          let maxContourIndex = -1;
          
          for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour);
            if (area > maxArea) {
              maxArea = area;
              maxContourIndex = i;
            }
          }
          
          // Si encontramos un contorno significativo, recortar la imagen
          if (maxContourIndex >= 0 && maxArea > (canvas.width * canvas.height * 0.1)) {
            const maxContour = contours.get(maxContourIndex);
            const rect = cv.boundingRect(maxContour);
            
            // Dibujar en un nuevo canvas
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = rect.width;
            cropCanvas.height = rect.height;
            
            // Crear ROI (Region of Interest)
            const roi = new cv.Mat();
            roi.copyTo(processed.roi(new cv.Rect(rect.x, rect.y, rect.width, rect.height)));
            
            // Mostrar en canvas
            cv.imshow(cropCanvas, roi);
            
            // Liberar memoria
            src.delete();
            dst.delete();
            processed.delete();
            edges.delete();
            contours.delete();
            hierarchy.delete();
            roi.delete();
            
            // Convertir a Blob y resolver
            cropCanvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Error al convertir canvas a blob'));
              }
            }, 'image/jpeg', 0.95);
          } else {
            // Si no encontramos contornos significativos, usar la imagen procesada completa
            cv.imshow(canvas, processed);
            
            // Liberar memoria
            src.delete();
            dst.delete();
            processed.delete();
            edges.delete();
            contours.delete();
            hierarchy.delete();
            
            // Convertir a Blob y resolver
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Error al convertir canvas a blob'));
              }
            }, 'image/jpeg', 0.95);
          }
        } catch (error) {
          console.error('Error en OpenCV, usando método simple:', error);
          // Si hay error en OpenCV, usar una versión simplificada
          simpleMejorarImagen(canvas, ctx).then(resolve).catch(reject);
        }
        
        URL.revokeObjectURL(url);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Error al cargar la imagen'));
      };
      
      img.src = url;
    });
  } catch (error) {
    console.error('Error cargando OpenCV, fallback a método simple:', error);
    return mejorarImagenSimple(imageData);
  }
}

/**
 * Versión simplificada de mejora de imagen sin OpenCV
 * @param canvas Canvas con la imagen original
 * @param ctx Contexto del canvas
 * @returns Promise con los datos de la imagen mejorada
 */
async function simpleMejorarImagen(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<Blob> {
  // NOTA: La binarización estaba causando distorsión, cambiamos a un enfoque más suave
  
  // Obtener datos de la imagen
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Intentar detectar bordes del papel para recortar
  const bordes = detectarBordesPapel(imageData);
  if (bordes) {
    console.log('Bordes detectados:', bordes);
    // Recortar la imagen según los bordes detectados
    const imagenRecortada = ctx.getImageData(
      bordes.x, bordes.y, bordes.width, bordes.height
    );
    
    // Redimensionar el canvas al tamaño del recorte
    canvas.width = bordes.width;
    canvas.height = bordes.height;
    
    // Dibujar solo la parte recortada
    ctx.putImageData(imagenRecortada, 0, 0);
    console.log('Imagen recortada a los bordes del papel');
  } else {
    console.log('No se detectaron bordes claros, procesando imagen completa');
  }
  
  // Obtener los datos actualizados (después del posible recorte)
  const imageDataFinal = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const dataFinal = imageDataFinal.data;
  
  // Ajustar brillo y contraste de forma más suave (sin binarizar)
  for (let i = 0; i < dataFinal.length; i += 4) {
    // Mejorar contraste sin binarizar
    const r = dataFinal[i];
    const g = dataFinal[i + 1];
    const b = dataFinal[i + 2];
    
    // Convertir a escala de grises pero preservar algo de color
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Aplicar un ajuste de contraste adaptativo
    const factor = 1.2;  // Factor de contraste (más alto = más contraste)
    const medio = 128;
    
    gray = medio + factor * (gray - medio);
    
    // Limitar los valores entre 0-255
    gray = Math.min(255, Math.max(0, gray));
    
    // Actualizar pixel con valor mejorado, manteniendo cierto nivel de grises
    dataFinal[i] = gray;      // R
    dataFinal[i + 1] = gray;  // G
    dataFinal[i + 2] = gray;  // B
  }
  
  // Poner datos de vuelta en el canvas
  ctx.putImageData(imageDataFinal, 0, 0);
  
  // Convertir a Blob y resolver con calidad mejorada
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Error al convertir canvas a blob'));
      }
    }, 'image/jpeg', 0.92);  // Calidad ligeramente reducida para mejor legibilidad OCR
  });
}

// Función para detectar los bordes del papel en la imagen
function detectarBordesPapel(imageData: ImageData): {x: number, y: number, width: number, height: number} | null {
  try {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    console.log('Analizando imagen para detectar bordes, dimensiones:', width, 'x', height);
    
    // Convertir a escala de grises y calcular derivadas para análisis
    const grayData = new Uint8Array(width * height);
    
    // Calcular brillo promedio para ajustar umbral
    let sumaTotal = 0;
    let totalPixels = width * height;
    
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const idx = (i * width + j) * 4;
        // Convertir RGB a escala de grises
        const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
        grayData[i * width + j] = gray;
        sumaTotal += gray;
      }
    }
    
    // Calcular brillo promedio
    const promedioBrillo = sumaTotal / totalPixels;
    console.log('Brillo promedio de la imagen:', promedioBrillo);
    
    // Ajustar umbral basándonos en el brillo promedio
    // Si la imagen es muy clara (papel blanco), usar un umbral más alto para detectar cambios sutiles
    const umbralBase = promedioBrillo > 200 ? 245 : 240;
    console.log('Umbral base ajustado:', umbralBase);
    
    // Calcular promedio de bordes para cada fila y columna
    const promedioFilas = new Array(height).fill(0);
    const promedioColumnas = new Array(width).fill(0);
    
    // Calcular promedio para filas
    for (let i = 0; i < height; i++) {
      let sumaFila = 0;
      for (let j = 0; j < width; j++) {
        sumaFila += grayData[i * width + j];
      }
      promedioFilas[i] = sumaFila / width;
    }
    
    // Calcular promedio para columnas
    for (let j = 0; j < width; j++) {
      let sumaCol = 0;
      for (let i = 0; i < height; i++) {
        sumaCol += grayData[i * width + j];
      }
      promedioColumnas[j] = sumaCol / height;
    }
    
    // Calcular derivadas para detectar cambios bruscos
    const derivadasFilas = new Array(height-1).fill(0);
    const derivadasColumnas = new Array(width-1).fill(0);
    
    for (let i = 1; i < height; i++) {
      derivadasFilas[i-1] = Math.abs(promedioFilas[i] - promedioFilas[i-1]);
    }
    
    for (let j = 1; j < width; j++) {
      derivadasColumnas[j-1] = Math.abs(promedioColumnas[j] - promedioColumnas[j-1]);
    }
    
    // MEJORADO: Analizar ventanas deslizantes para encontrar bordes
    // Esto es más robusto para papeles blancos en fondos claros
    
    // Método de ventana deslizante para buscar cambios suaves pero consistentes
    const ventanaSize = Math.max(5, Math.min(20, Math.floor(height * 0.02)));
    
    // Buscar desde arriba
    let topEdge = 0;
    const topThreshold = height * 0.3; // Buscar en el primer 30%
    let maxDifTop = 0;
    let maxDifTopIdx = 0;
    
    for (let i = ventanaSize; i < topThreshold; i++) {
      let difAntes = 0;
      let difDespues = 0;
      
      // Promediar antes y después
      for (let k = 0; k < ventanaSize; k++) {
        difAntes += promedioFilas[i - k];
        difDespues += promedioFilas[i + k];
      }
      
      const dif = Math.abs(difDespues/ventanaSize - difAntes/ventanaSize);
      if (dif > maxDifTop) {
        maxDifTop = dif;
        maxDifTopIdx = i;
      }
    }
    
    // Solo aceptar el borde si la diferencia es significativa
    if (maxDifTop > 1.0) {
      topEdge = maxDifTopIdx;
    }
    
    // Buscar desde abajo
    let bottomEdge = height - 1;
    const bottomThreshold = height * 0.7; // Buscar en el último 30%
    let maxDifBottom = 0;
    let maxDifBottomIdx = height - 1;
    
    for (let i = height - ventanaSize - 1; i >= bottomThreshold; i--) {
      let difAntes = 0;
      let difDespues = 0;
      
      // Promediar antes y después
      for (let k = 0; k < ventanaSize; k++) {
        if (i + k < height) difAntes += promedioFilas[i + k];
        if (i - k >= 0) difDespues += promedioFilas[i - k];
      }
      
      const dif = Math.abs(difDespues/ventanaSize - difAntes/ventanaSize);
      if (dif > maxDifBottom) {
        maxDifBottom = dif;
        maxDifBottomIdx = i;
      }
    }
    
    // Solo aceptar el borde si la diferencia es significativa
    if (maxDifBottom > 1.0) {
      bottomEdge = maxDifBottomIdx;
    }
    
    // Buscar desde la izquierda
    let leftEdge = 0;
    const leftThreshold = width * 0.3;
    let maxDifLeft = 0;
    let maxDifLeftIdx = 0;
    
    for (let j = ventanaSize; j < leftThreshold; j++) {
      let difAntes = 0;
      let difDespues = 0;
      
      for (let k = 0; k < ventanaSize; k++) {
        difAntes += promedioColumnas[j - k];
        difDespues += promedioColumnas[j + k];
      }
      
      const dif = Math.abs(difDespues/ventanaSize - difAntes/ventanaSize);
      if (dif > maxDifLeft) {
        maxDifLeft = dif;
        maxDifLeftIdx = j;
      }
    }
    
    // Solo aceptar el borde si la diferencia es significativa
    if (maxDifLeft > 1.0) {
      leftEdge = maxDifLeftIdx;
    }
    
    // Buscar desde la derecha
    let rightEdge = width - 1;
    const rightThreshold = width * 0.7;
    let maxDifRight = 0;
    let maxDifRightIdx = width - 1;
    
    for (let j = width - ventanaSize - 1; j >= rightThreshold; j--) {
      let difAntes = 0;
      let difDespues = 0;
      
      for (let k = 0; k < ventanaSize; k++) {
        if (j + k < width) difAntes += promedioColumnas[j + k];
        if (j - k >= 0) difDespues += promedioColumnas[j - k];
      }
      
      const dif = Math.abs(difDespues/ventanaSize - difAntes/ventanaSize);
      if (dif > maxDifRight) {
        maxDifRight = dif;
        maxDifRightIdx = j;
      }
    }
    
    // Solo aceptar el borde si la diferencia es significativa
    if (maxDifRight > 1.0) {
      rightEdge = maxDifRightIdx;
    }
    
    console.log('Bordes detectados:', {top: topEdge, bottom: bottomEdge, left: leftEdge, right: rightEdge});
    console.log('Diferencias max en bordes:', {top: maxDifTop, bottom: maxDifBottom, left: maxDifLeft, right: maxDifRight});
    
    // Verificar si los bordes detectados tienen sentido
    const bordeWidth = rightEdge - leftEdge;
    const bordeHeight = bottomEdge - topEdge;
    
    // Si los bordes detectados son muy pequeños o cubren casi toda la imagen, ignorarlos
    if (bordeWidth < width * 0.1 || bordeHeight < height * 0.1 || 
        (bordeWidth > width * 0.98 && bordeHeight > height * 0.98)) {
      console.log('Bordes detectados no válidos, usando imagen completa');
      return null;
    }
    
    // Aplicar un margen de seguridad
    const margen = 10;
    return {
      x: Math.max(0, leftEdge - margen),
      y: Math.max(0, topEdge - margen),
      width: Math.min(width - leftEdge - margen, bordeWidth + margen*2),
      height: Math.min(height - topEdge - margen, bordeHeight + margen*2)
    };
  } catch (error) {
    console.error('Error al detectar bordes:', error);
    return null;  // En caso de error, no aplicar recorte
  }
}

/**
 * Función alternativa simple usando solo Canvas
 * @param imageData Datos de la imagen como File o Blob
 * @returns Promise con los datos de la imagen mejorada
 */
export async function mejorarImagenSimple(imageData: File | Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageData);
    
    img.onload = () => {
      // Crear canvas para procesar la imagen
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo crear el contexto del canvas'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Aplicar mejoras simples
      simpleMejorarImagen(canvas, ctx).then(resolve).catch(reject);
      
      URL.revokeObjectURL(url);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error al cargar la imagen'));
    };
    
    img.src = url;
  });
}