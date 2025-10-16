/**
 * Utilidades para búsqueda
 */

/**
 * Normaliza un string removiendo acentos
 * "categoría" → "categoria"
 * "José" → "Jose"
 */
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Prepara un término de búsqueda para usar en queries de Supabase
 * - Remueve acentos
 * - Trim espacios
 * - Convierte a lowercase
 */
export function prepareSearchTerm(term: string): string {
  return removeAccents(term.trim().toLowerCase());
}
