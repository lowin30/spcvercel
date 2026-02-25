import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDate, formatShortDate, formatDateTime } from "@/lib/date-utils"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export date utilities
export { formatDate, formatShortDate, formatDateTime }

// Función para formatear CUIT
export function formatCuit(cuit: string): string {
  if (!cuit) return ""

  // Eliminar caracteres no numéricos
  const cleanCuit = cuit.replace(/\D/g, "")

  // Si no tiene la longitud correcta, devolver el valor original
  if (cleanCuit.length !== 11) return cuit

  // Formatear como XX-XXXXXXXX-X
  return `${cleanCuit.substring(0, 2)}-${cleanCuit.substring(2, 10)}-${cleanCuit.substring(10)}`
}

// Función para limpiar el CUIT (eliminar guiones y espacios)
export function cleanCuit(cuit: string): string {
  if (!cuit) return ""
  return cuit.replace(/\D/g, "")
}

// Función para limpiar números de teléfono (eliminar guiones y espacios)
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return ""
  return phone.replace(/[\s-]/g, "")
}

// Función para formatear moneda
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "--"

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0
  }).format(amount)
}

// Task status color utility
export function getEstadoTareaColor(estado: string): string {
  switch (estado.toLowerCase()) {
    case "pendiente":
      return "bg-yellow-500 text-white hover:bg-yellow-600"
    case "asignada":
      return "bg-blue-500 text-white hover:bg-blue-600"
    case "completada":
      return "bg-green-500 text-white hover:bg-green-600"
    case "cancelada":
      return "bg-red-500 text-white hover:bg-red-600"
    default:
      return "bg-gray-500 text-white hover:bg-gray-600"
  }
}

// Task priority color utility
export function getPrioridadColor(prioridad: string): string {
  switch (prioridad.toLowerCase()) {
    case "alta":
      return "bg-red-500"
    case "media":
      return "bg-yellow-500"
    case "baja":
      return "bg-green-500"
    default:
      return "bg-gray-500"
  }
}

// Building status color utility
export function getEstadoEdificioColor(estado: string): string {
  switch (estado.toLowerCase()) {
    case "activo":
      return "bg-green-100 text-green-800 hover:bg-green-200"
    case "en_obra":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
    case "finalizado":
      return "bg-blue-100 text-blue-800 hover:bg-blue-200"
    case "inactivo":
      return "bg-red-100 text-red-800 hover:bg-red-200"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-200"
  }
}
// Text sanitization utility
// Text sanitization utility
// Text sanitization utility (SPC Law v3.5 - Strict Uppercase & Accents)
// Text sanitization utility (SPC Protocol v18.1 - Ñ-Compatible)
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return ""

  let result = text;

  // 1. Manual replacements for standard vowels (Fast Path)
  const map: { [key: string]: string } = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
    'ü': 'u', 'Ü': 'U'
  };
  result = result.replace(/[áéíóúÁÉÍÓÚüÜ]/g, char => map[char] || char);

  // 2. Strict Diacritic Removal (Preserving Ñ)
  // Strategy: Hide Ñ -> Remove Diacritics -> Restore Ñ
  result = result
    .replace(/ñ/g, '__n_placeholder__')
    .replace(/Ñ/g, '__N_placeholder__')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Kill all accents
    .normalize("NFC")
    .replace(/__n_placeholder__/g, 'ñ')
    .replace(/__N_placeholder__/g, 'Ñ');

  // 3. Final Cleanup (Whitelist: Alphanumeric, spaces, dots, commas, hyphens)
  // We allow [a-zA-Z0-9 ñÑ .,-] 
  return result.replace(/[^a-zA-Z0-9ñÑ\s.,-]/g, "").trim();
}
