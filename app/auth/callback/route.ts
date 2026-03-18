import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1'

    if (!code) {
        return NextResponse.redirect(new URL('/login?error=no_code', request.url))
    }

    let response = NextResponse.redirect(new URL('/dashboard', request.url))

    // v880: la race condition de @supabase/ssr en next.js 15.
    // setAll se dispara como microtarea asincrona DESPUES de que el handler retorna.
    // esta promise bloquea el return hasta que setAll escriba las cookies en el response.
    let resolveSetAll!: () => void
    const setAllCompleted = new Promise<void>(resolve => { resolveSetAll = resolve })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        // en localhost http, desactivar Secure para que el browser acepte las cookies
                        const finalOptions = isLocalhost
                            ? { ...options, secure: false, sameSite: 'lax' as const }
                            : options
                        response.cookies.set(name, value, finalOptions)
                    })
                    resolveSetAll()
                },
            },
        }
    )

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
        console.error('[auth] error en callback:', error.message)
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url))
    }

    // esperar hasta 2 segundos a que setAll se dispare y escriba las cookies en el response
    await Promise.race([
        setAllCompleted,
        new Promise<void>(resolve => setTimeout(resolve, 2000))
    ])

    return response
}
