import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Versión asíncrona de createServerClient para corregir el error de cookies()
export const createServerClient = async () => {
  // IMPORTANTE: await cookies() - En Next.js 15+ se debe esperar por cookies()
  const cookieStore = await cookies()

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

// Versión no asíncrona para compatibilidad (solo lectura)
export const createServerClientSync = () => {
  try {
    // Nota: En Next.js 15 cookies() puede ser asíncrono.
    // Esta función es un fallback para código legacy.
    const cookieStore = cookies() as any;

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
            } catch (error) { }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) { }
          },
        },
      }
    )
  } catch (e) {
    return null
  }
}

export const getSupabaseServer = createServerClient

// Mejorar la gestión de sesiones con reintentos usando getUser() por seguridad
export async function getSession() {
  try {
    const supabase = await getSupabaseServer()
    if (!supabase) return null

    let retries = 2
    while (retries >= 0) {
      try {
        // Usar getUser() en lugar de getSession() para evitar warnings de seguridad
        const { data: { user }, error } = await supabase.auth.getUser()

        if (user) {
          // Simulamos un objeto de sesión mínimo si es necesario, 
          // pero para la mayoría de los casos solo el usuario es lo primordial.
          return { user }
        }
        return null
      } catch (error) {
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
        retries--
      }
    }
    return null
  } catch (error) {
    return null
  }
}

export async function getUserDetails() {
  try {
    // Obtener cliente Supabase del singleton
    const supabase = await getSupabaseServer()

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
