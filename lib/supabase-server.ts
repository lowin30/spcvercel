import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * cliente de servidor supabase (protocolo platinum).
 * usa cookies de next.js para mantener la sesion del usuario.
 * todos los server components, loaders y actions deben usar esta funcion.
 */
export const createServerClient = async () => {
  const cookieStore = await cookies()

  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        getAll() {
          return cookieStore.getAll()
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // ignorar en server components — el middleware refresca las sesiones
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // ignorar en server components — el middleware refresca las sesiones
          }
        },
      },
    }
  )
}

/** alias de compatibilidad platinum */
export const getSupabaseServer = createServerClient
export const createClient = createServerClient

/**
 * guardian central de auth (protocolo platinum v81.0).
 * obtiene el usuario y su perfil real asegurando bypass de cache.
 */
export async function validateSessionAndGetUser() {
  try {
    const supabase = await getSupabaseServer()
    if (!supabase) return { user: null, profile: null, error: 'no_client' }

    let intentos = 0
    while (intentos < 3) {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (user && !userError) {
        // Obtener perfil directamente para inyectar en wizards
        const { data: profile } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', user.id)
          .single()

        return { user, profile, error: null }
      }

      if (userError?.name === 'AuthSessionMissingError') {
        return { user: null, profile: null, error: userError }
      }

      await new Promise(resolve => setTimeout(resolve, 200 * (intentos + 1)))
      intentos++
    }

    return { user: null, profile: null, error: 'network_timeout_or_invalid' }
  } catch (err: any) {
    return { user: null, profile: null, error: err?.message || 'unknown_auth_error' }
  }
}

/** alias de compatibilidad legacy */
export const getvaliduser = validateSessionAndGetUser

