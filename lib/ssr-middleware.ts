// lib/ssr-middleware.ts
// Supabase client and session management for Next.js Middleware
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  );

  // Refresh session if expired - important to do before accessing user
  const { data: { user } } = await supabase.auth.getUser();

  // 🔒 PROTECCIÓN DE RUTAS SOLO PARA ADMIN
  const rutasProtegidas = [
    '/dashboard/pagos',
    '/dashboard/facturas',
  ];
  
  const rutaActual = request.nextUrl.pathname;
  const esRutaProtegida = rutasProtegidas.some(ruta => rutaActual.startsWith(ruta));
  
  if (esRutaProtegida && user) {
    // Obtener el rol del usuario
    const { data: userData } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();
    
    // Si no es admin, redirigir al dashboard
    if (!userData || userData.rol !== 'admin') {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      redirectUrl.searchParams.set('error', 'acceso_denegado');
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response
}
