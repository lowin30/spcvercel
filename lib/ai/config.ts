/**
 * Configuración centralizada de IA para reconocimiento de comprobantes y OCR de gastos.
 * Garantiza consistencia absoluta de modelo y prompt en toda la aplicación.
 */

export const VISION_MODEL = "qwen/qwen3.6-27b";

export const VISION_PROMPT = `
  Actúa como experto contable. Analiza la imagen del comprobante.
  Extrae exclusivamente a JSON puro:
  {
    "monto": number,
    "descripcion": string,
    "fecha": string, (formato YYYY-MM-DD)
    "tipo_gasto": "material" // Siempre material (Requerimiento SPC v3.0)
  }
  REGLAS CRITICAS: descripcion en MINUSCULAS y SIN ACENTOS. Preserva 'ñ'. solo responde con JSON.
`;
