// Supabase helper específico para la página de edición de facturas
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cliente de Supabase robusto para la página de edición de facturas
 * Implementa manejo de errores específico para cookies malformadas
 */
export async function createRobustServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try {
            return cookieStore.get(name)?.value;
          } catch (error) {
            console.warn(`Error al obtener cookie ${name}:`, error);
            return undefined;
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.warn(`Error al establecer cookie ${name}:`, error);
            // Errores al establecer cookies pueden ser ignorados en Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            console.warn(`Error al eliminar cookie ${name}:`, error);
            // Errores al eliminar cookies pueden ser ignorados en Server Components
          }
        },
      },
      // Configuración adicional para manejar errores de autenticación
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    }
  );
}
