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

  // 🔒 RBAC & WHITELIST PROTECTION (SPC Protocol v19.0)
  if (request.nextUrl.pathname.startsWith('/dashboard') && user) {

    // 1. Obtener perfil real de la tabla 'usuarios' (Source of Truth)
    const { data: profile } = await supabase
      .from('usuarios')
      .select('rol, activo')
      .eq('id', user.id)
      .single()

    // 2. WHITELIST CHECK: Si no existe o está inactivo -> Bloquear
    if (!profile || !profile.activo) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      // Logout forzado si pudiéramos, pero por ahora redirect
      return NextResponse.redirect(redirectUrl);
    }

    // 3. ADMIN ROUTES CHECK
    const rutasAdmin = ['/dashboard/pagos', '/dashboard/facturas', '/dashboard/admin-tools'];
    if (rutasAdmin.some(r => request.nextUrl.pathname.startsWith(r))) {
      if (profile.rol !== 'admin') {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/dashboard';
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return response
}
