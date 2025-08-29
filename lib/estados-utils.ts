// lib/estados-utils.ts

/**
 * Devuelve una clase de color de Tailwind CSS basada en un nombre de color.
 * Esta es una función de utilidad pura y segura para usar en componentes de cliente y servidor.
 * @param color - El nombre del color (ej. 'rojo', 'azul').
 * @returns La clase de Tailwind CSS correspondiente o una clase gris por defecto.
 */
export function getColorClase(color: string): string {
  const colorMap: { [key: string]: string } = {
    rojo: 'bg-red-500',
    verde: 'bg-green-500',
    amarillo: 'bg-yellow-500',
    azul: 'bg-blue-500',
    gris: 'bg-gray-500',
    naranja: 'bg-orange-500',
    morado: 'bg-purple-500',
    rosa: 'bg-pink-500',
    // Colores heredados por si se usan en otras partes
    gray: 'bg-gray-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
    orange: 'bg-orange-500'
  }
  return colorMap[color] || 'bg-gray-400'
}

