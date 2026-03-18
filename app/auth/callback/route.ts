import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
    console.log('[auth-audit] procesando callback de autenticacion (v88.3)')
    
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    // si "next" viene por url, lo re-usamos, si no vamos a dashboard
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet: { name: string, value: string, options: CookieOptions }[]) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // el metodo set puede fallar si se llama desde un server component
                            // pero en este route handler (api) deberia funcionar sin problemas para el diseño del login
                        }
                    },
                },
            }
        )

        // intercambia el code (del email o google) por una sesion de auth para el usuario
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`)
        } else {
            console.error("[auth-audit] error intercambiando codigo por sesion:", error.message)
        }
    }

    // si no hay codigo o hubo un error, regresa al login con un mensaje descriptivo
    // ñ obligatoria para el flujo de autenticacion
    return NextResponse.redirect(`${origin}/login?error=ocurrio+un+error+de+autenticacion`)
}
