import type { PostgrestFilterBuilder, PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js'

/**
 * Función de ayuda para ejecutar consultas con count en Supabase de forma segura
 * Esta función maneja los problemas de tipado relacionados con la propiedad count
 */
export async function executeCountQuery<T>(
  query: PostgrestFilterBuilder<any, any, any, any>
): Promise<{ count: number; error: any }> {
  try {
    const response = await query
    
    // Obtener el count de forma segura
    const count = typeof response.count === 'number' ? response.count : 0
    
    return { 
      count,
      error: response.error 
    }
  } catch (error) {
    console.error("Error en executeCountQuery:", error)
    return { count: 0, error }
  }
}

/**
 * Función de ayuda para ejecutar consultas con limit en Supabase de forma segura
 * Esta función maneja los problemas de tipado relacionados con la propiedad limit
 */
export async function executeQuery<T>(
  baseQuery: any,
  limit?: number,
  orderColumn?: string,
  ascending?: boolean
): Promise<{ data: T[]; error: any }> {
  try {
    let query = baseQuery
    
    // Aplicar orden si se proporciona
    if (orderColumn) {
      query = query.order(orderColumn, { ascending: ascending ?? false })
    }
    
    // Aplicar límite si se proporciona
    if (limit && limit > 0) {
      query = query.limit(limit)
    }
    
    // Ejecutar la consulta
    const response: PostgrestResponse<T> = await query
    
    return { 
      data: response.data || [],
      error: response.error
    }
  } catch (error) {
    console.error("Error en executeQuery:", error)
    return { data: [], error }
  }
}
