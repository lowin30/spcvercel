import { createServerSupabase } from "@/lib/supabase-server"
export interface Estado {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  color: string
  orden: number
}

export function getColorClase(color: string) {
  const colorMap: { [key: string]: string } = {
    rojo: 'bg-red-500',
    verde: 'bg-green-500',
    amarillo: 'bg-yellow-500',
    azul: 'bg-blue-500',
    gris: 'bg-gray-500',
    naranja: 'bg-orange-500',
    morado: 'bg-purple-500',
    rosa: 'bg-pink-500'
    case "orange":
      return "bg-orange-500 hover:bg-orange-600"
    default:
      return "bg-gray-500 hover:bg-gray-600"
  }
}
