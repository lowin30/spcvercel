import { exchangeCodeForTokens } from "@/lib/google-auth"
import { createClient } from "@/lib/supabase-client" // Server client
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
        return NextResponse.redirect(new URL('/dashboard?error=google_auth_failed', request.url))
    }

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }

    try {
        // 1. Canjear código por tokens
        const tokens = await exchangeCodeForTokens(code)

        // 2. Obtener usuario actual con Supabase Auth (Cookie)
        // NOTA: Necesitamos el cliente de servidor que lea cookies para saber quién es el usuario
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
        }

        // 3. Guardar tokens en DB (Tabla usuarios)
        const expiry = Date.now() + (tokens.expires_in * 1000)

        const { error: dbError } = await supabase
            .from('usuarios')
            .update({
                google_access_token: tokens.access_token,
                google_refresh_token: tokens.refresh_token, // CRÍTICO: Debe estar presente si usamos prompt=consent
                google_token_expiry: expiry
            })
            .eq('id', session.user.id)

        if (dbError) {
            console.error("DB Error saving tokens:", dbError)
            return NextResponse.redirect(new URL('/dashboard?error=db_save_failed', request.url))
        }

        // 4. Éxito
        return NextResponse.redirect(new URL('/dashboard?google_connected=true', request.url))

    } catch (e) {
        console.error("Callback Error:", e)
        return NextResponse.redirect(new URL('/dashboard?error=exchange_failed', request.url))
    }
}
