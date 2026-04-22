import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-url', request.url)

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options }))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            // Protocolo Platinum: mantener persistencia de 30 dias en cada refresh de token
            supabaseResponse.cookies.set({ name, value, ...options, maxAge: 60 * 60 * 24 * 30 })
          )
        },

      },

    }
  )

  // 2. Rutas que no requieren autenticación
  const isPublicRoute =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/auth/callback' ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname === '/manifest.json'

  // 3. Obtener sesión de Supabase
  const { data: { user } } = !isPublicRoute 
    ? await supabase.auth.getUser()
    : { data: { user: null } }

  // v100.0: Delegar recuperación de sesión al cliente en localhost
  const isLocalhost = request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1';

  // Si no hay usuario y la ruta no es pública
  if (!user && !isPublicRoute) {
    if (isLocalhost) {
      // Dejar pasar en localhost para que el Dashboard (cliente) resuelva la race condition
      return NextResponse.next();
    } else {
      // En produccion mantenemos la redireccion fuerte por seguridad SSR
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Si hay usuario o se detecta la cookie de Supabase en crudo y está en /login, forzar dashboard
  const hasAuthToken = request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
  
  if ((user || hasAuthToken) && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
