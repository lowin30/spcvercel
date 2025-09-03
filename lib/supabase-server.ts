import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createServerClient = () => {
  const cookieStore = cookies()

  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export const getSupabaseServer = createServerClient

// Mejorar la gestión de sesiones con reintentos
export async function getSession() {
  // Usar try-catch global para manejar cualquier error inesperado
  try {
    const supabase = getSupabaseServer()
    
    // Si no tenemos cliente Supabase, retornar null de inmediato
    if (!supabase) {
      console.error("No se pudo crear el cliente Supabase")
      return null
    }

    // Implementar un mecanismo de reintento
    let retries = 2
    let lastError = null
    
    while (retries >= 0) {
      try {
        const response = await supabase.auth.getSession()
        return response.data.session
      } catch (error) {
        lastError = error
        console.warn(`Error al obtener la sesión (intento ${2-retries}/2)`, error)
        
        // Si aún quedan reintentos, esperar antes de volver a intentar
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
        retries--
      }
    }
    
    console.error("Error definitivo al obtener la sesión:", lastError)
    return null
  } catch (error) {
    console.error("Error global en getSession:", error)
    return null
  }
}

export async function getUserDetails() {
  try {
    // Obtener cliente Supabase del singleton
    const supabase = getSupabaseServer()

    // Usar supabase.auth.getUser() para obtener la información del usuario de forma segura
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    // Si no hay usuario o hay error, no podemos obtener los detalles
    if (userError || !user) {
      console.log("No hay usuario autenticado en getUserDetails:", userError)
      return null
    }

    // Implementar un mecanismo de reintento para la consulta de detalles del usuario
    let attempts = 0
    const maxAttempts = 3
    let userDetails = null
    let lastError = null

    while (attempts < maxAttempts && !userDetails) {
      try {
        // Añadir un pequeño retraso entre intentos (excepto el primer intento)
        if (attempts > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempts))
        }

        // Intentar obtener los detalles del usuario desde la tabla usuarios
        const { data, error } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", user.id)
          .single()

        if (error) {
          lastError = error
          console.error("Error al obtener detalles del usuario (intento " + (attempts + 1) + "/" + maxAttempts + "):", error)
        } else {
          userDetails = data
          console.log("Detalles del usuario recuperados correctamente")
        }
      } catch (error) {
        lastError = error
        console.error("Error de red al obtener detalles del usuario (intento " + (attempts + 1) + "/" + maxAttempts + "):", error)
      }

      attempts++
    }

    if (!userDetails && lastError) {
      console.error("No se pudieron obtener los detalles del usuario después de múltiples intentos:", lastError)
    }

    return userDetails
  } catch (error) {
    console.error("Error global en getUserDetails:", error)
    return null
  }
}
