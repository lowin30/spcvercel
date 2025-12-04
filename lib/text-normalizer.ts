/**
 * Utilidades para normalización de texto
 * Asegura display correcto de acentos y búsquedas inteligentes
 */

/**
 * Normaliza texto para display correcto (mantiene acentos)
 * Usa NFC (Canonical Composition) para acentos correctos
 */
export function normalizeForDisplay(text: string | null | undefined): string {
  if (!text) return ''
  
  // Trim espacios
  const trimmed = text.trim()
  
  // Normalización canónica (acentos combinados correctamente)
  return trimmed.normalize('NFC')
}

/**
 * Normaliza texto para búsquedas (sin acentos, lowercase)
 * Útil para comparaciones client-side
 */
export function normalizeForSearch(text: string | null | undefined): string {
  if (!text) return ''
  
  return text
    .toLowerCase()
    .normalize('NFD') // Descomponer acentos
    .replace(/[\u0300-\u036f]/g, '') // Quitar marcas diacríticas
    .trim()
}

/**
 * Normaliza texto para guardar en BD
 * Trim y normalización canónica
 */
export function normalizeForSave(text: string | null | undefined): string {
  if (!text) return ''
  
  return text.trim().normalize('NFC')
}

/**
 * Capitaliza primera letra de cada palabra
 * Útil para nombres propios
 */
export function capitalizeWords(text: string | null | undefined): string {
  if (!text) return ''
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Verifica si dos textos son iguales ignorando acentos y mayúsculas
 */
export function areTextsSimilar(text1: string | null | undefined, text2: string | null | undefined): boolean {
  return normalizeForSearch(text1) === normalizeForSearch(text2)
}
