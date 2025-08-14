import { createServerSupabase } from "@/lib/supabase-server"

export interface Estado {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  color: string
  orden: number
}

export async function obtenerEstadosTareas(): Promise<Estado[]> {
  const supabase = createServerSupabase()
  const { data } = await supabase.from("estados_tareas").select("*").order("orden", { ascending: true })

  return data || []
}

export async function obtenerEstadosPresupuestos(): Promise<Estado[]> {
  const supabase = createServerSupabase()
  const { data } = await supabase.from("estados_presupuestos").select("*").order("orden", { ascending: true })

  return data || []
}

export async function obtenerEstadosFacturas(): Promise<Estado[]> {
  const supabase = createServerSupabase()
  const { data } = await supabase.from("estados_facturas").select("*").order("orden", { ascending: true })

  return data || []
}

export async function obtenerEstadoPorId(tipoEntidad: string, id: number): Promise<Estado | null> {
  const supabase = createServerSupabase()
  let tabla = ""

  if (tipoEntidad === "tarea") tabla = "estados_tareas"
  else if (tipoEntidad === "presupuesto") tabla = "estados_presupuestos"
  else if (tipoEntidad === "factura") tabla = "estados_facturas"
  else return null

  const { data } = await supabase.from(tabla).select("*").eq("id", id).single()

  return data
}

export function getColorClase(color: string): string {
  switch (color) {
    case "gray":
      return "bg-gray-500 hover:bg-gray-600"
    case "blue":
      return "bg-blue-500 hover:bg-blue-600"
    case "green":
      return "bg-green-500 hover:bg-green-600"
    case "red":
      return "bg-red-500 hover:bg-red-600"
    case "yellow":
      return "bg-yellow-500 hover:bg-yellow-600"
    case "purple":
      return "bg-purple-500 hover:bg-purple-600"
    case "indigo":
      return "bg-indigo-500 hover:bg-indigo-600"
    case "orange":
      return "bg-orange-500 hover:bg-orange-600"
    default:
      return "bg-gray-500 hover:bg-gray-600"
  }
}
