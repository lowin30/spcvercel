// OCR Utilities
import type { RecognizeResult } from 'tesseract.js';

/**
 * Interfaz para representar un monto detectado con formato original
 */
export interface MontoDetectado {
  valor: number;        // Valor numérico para cálculos
  textoOriginal: string; // Texto original como aparece en la imagen
  esTotal: boolean;     // Indica si probablemente es el total
}

/**
 * Detecta montos en un texto utilizando patrones comunes de factura
 * @param text Texto extraído del OCR
 * @returns Array de montos detectados con formato
 */
export function detectarMontos(text: string): MontoDetectado[] {
  if (!text) return [];

  const montosDetectados: MontoDetectado[] = [];
  
  // Patrones para detectar montos con formato
  const patrones = [
    // Formato: TOTAL $123.456 o TOTAL: $123.456
    { regex: /(?:TOTAL|Total|total|IMPORTE|Importe|importe)([\s:]*\$?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/gi, esTotal: true },
    
    // Formato: $123.456
    { regex: /\$\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/g, esTotal: false },
    
    // Formato: 123.456,78 o 123,456.78
    { regex: /(?:^|\s)(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)(?:\s|$)/g, esTotal: false },
  ];

  // Extraer montos usando los patrones
  for (const { regex, esTotal } of patrones) {
    let match;
    const clonedRegex = new RegExp(regex); // Clonar para evitar problemas con lastIndex
    while ((match = clonedRegex.exec(text)) !== null) {
      // Obtener el texto completo del monto
      const textoOriginal = match[1].trim();
      
      // Convertir el texto a valor numérico
      const valorNumerico = convertirANumero(textoOriginal);
      
      // Solo agregar si es un número válido y no está duplicado
      if (!isNaN(valorNumerico) && valorNumerico > 0 && 
          !montosDetectados.some(m => m.valor === valorNumerico)) {
        montosDetectados.push({
          valor: valorNumerico,
          textoOriginal,
          esTotal
        });
      }
    }
  }

  // Ordenar montos de mayor a menor (el total suele ser el mayor)
  return montosDetectados.sort((a, b) => {
    // Primero por si es total
    if (a.esTotal && !b.esTotal) return -1;
    if (!a.esTotal && b.esTotal) return 1;
    // Luego por valor
    return b.valor - a.valor;
  });
}

/**
 * Convierte un texto con formato de número a valor numérico
 * @param texto Texto con formato de número (ej: "1.234,56" o "1,234.56")
 * @returns Valor numérico
 */
function convertirANumero(texto: string): number {
  // Eliminar símbolos de moneda y espacios
  let resultado = texto.replace(/[$\s]/g, '');
  
  // Detectar el formato según la posición de puntos y comas
  const tienePuntos = resultado.includes('.');
  const tieneComas = resultado.includes(',');
  
  // Caso 1: Tiene puntos y comas (determinar cuál es separador decimal)
  if (tienePuntos && tieneComas) {
    const ultimoPunto = resultado.lastIndexOf('.');
    const ultimaComa = resultado.lastIndexOf(',');
    
    // Si el punto está después de la última coma, es separador decimal (formato US)
    if (ultimoPunto > ultimaComa) {
      // Formato US: 1,234.56
      resultado = resultado.replace(/,/g, '');
    } else {
      // Formato LATAM: 1.234,56
      resultado = resultado.replace(/\./g, '').replace(',', '.');
    }
  }
  // Caso 2: Solo tiene puntos
  else if (tienePuntos) {
    // Si el punto está a 3 dígitos del final, probablemente es decimal
    if (resultado.length - resultado.lastIndexOf('.') - 1 <= 2) {
      // Es un decimal, dejar como está
      resultado = resultado;
    } else {
      // Son separadores de miles, eliminarlos
      resultado = resultado.replace(/\./g, '');
    }
  }
  // Caso 3: Solo tiene comas
  else if (tieneComas) {
    // Si la coma está a 3 dígitos del final, probablemente es decimal
    if (resultado.length - resultado.lastIndexOf(',') - 1 <= 2) {
      // Es un decimal, convertir a punto
      resultado = resultado.replace(',', '.');
    } else {
      // Son separadores de miles, eliminarlos
      resultado = resultado.replace(/,/g, '');
    }
  }
  
  // Convertir a número
  return parseFloat(resultado);
}

/**
 * Calcula la confianza en la detección de montos basada en varios factores
 * @param montos Montos detectados
 * @param textoOCR Texto completo del OCR
 * @param confianzaBase Confianza base del OCR
 * @returns Nivel de confianza entre 0-100
 */
export function calcularConfianza(montos: MontoDetectado[], textoOCR: string, confianzaBase: number): number {
  if (montos.length === 0) return 0;
  
  let confianza = confianzaBase * 0.5; // La confianza base del OCR es el 50% del total
  
  // Factores que aumentan la confianza
  // 1. Detección de palabras clave relacionadas con totales
  const patronesTotales = /(total|suma|importe|monto|valor|pago)/i;
  if (patronesTotales.test(textoOCR)) confianza += 20;
  
  // 2. Detección de formato de factura
  const patronesFactura = /(factura|boleta|recibo|ticket|comprobante)/i;
  if (patronesFactura.test(textoOCR)) confianza += 15;
  
  // 3. Número de montos detectados (ideal tener pocos montos claramente diferenciados)
  if (montos.length === 1) {
    confianza += 15; // Un solo monto es más probable que sea el total
  } else if (montos.length >= 2 && montos.length <= 5) {
    confianza += 10; // Algunos montos, probablemente incluye subtotal y total
  } else if (montos.length > 5) {
    confianza -= 5; // Muchos montos, puede haber confusión
  }

  // 4. Presencia de montos marcados como totales
  if (montos.some(m => m.esTotal)) {
    confianza += 15;
  }

  // Asegurar que la confianza esté en el rango 0-100
  return Math.max(0, Math.min(100, Math.round(confianza)));
}

/**
 * Verifica si una fecha es válida 
 * @param texto Texto donde buscar la fecha
 * @returns Fecha encontrada o null
 */
export function extraerFecha(texto: string): Date | null {
  // Patrones comunes de fecha en facturas
  const patrones = [
    // Formato: dd/mm/yyyy o dd-mm-yyyy
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
    // Formato: yyyy/mm/dd o yyyy-mm-dd
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
  ];

  for (const patron of patrones) {
    const match = patron.exec(texto);
    if (match) {
      try {
        // Verificar si el primer grupo capturado tiene 4 dígitos para saber el formato
        if (match[1].length === 4) {
          // Formato: yyyy/mm/dd
          const fecha = new Date(`${match[1]}-${match[2]}-${match[3]}`);
          if (!isNaN(fecha.getTime())) return fecha;
        } else {
          // Formato: dd/mm/yyyy
          const fecha = new Date(`${match[3]}-${match[2]}-${match[1]}`);
          if (!isNaN(fecha.getTime())) return fecha;
        }
      } catch (error) {
        console.error("Error al parsear fecha:", error);
      }
    }
  }
  
  return null;
}