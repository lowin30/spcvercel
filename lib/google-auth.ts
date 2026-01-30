import { createClient } from "@/lib/supabase-client"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`

// Scope para Google People API (Contactos)
const SCOPES = [
    'https://www.googleapis.com/auth/contacts',
    'https://www.googleapis.com/auth/userinfo.email'
].join(' ')

/**
 * Genera la URL para iniciar el flujo OAuth.
 * IMPORTANTE: access_type=offline y prompt=consent para forzar refresh_token.
 */
export function getAuthUrl() {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
    const options = {
        redirect_uri: REDIRECT_URI,
        client_id: GOOGLE_CLIENT_ID!,
        access_type: 'offline',
        response_type: 'code',
        prompt: 'consent',
        scope: SCOPES,
    }

    const qs = new URLSearchParams(options).toString()
    return `${rootUrl}?${qs}`
}

/**
 * Intercambia el código de autorización por tokens.
 */
export async function exchangeCodeForTokens(code: string) {
    const url = 'https://oauth2.googleapis.com/token'
    const values = {
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(values).toString(),
    })

    if (!response.ok) {
        throw new Error(`Google Auth Error: ${await response.text()}`)
    }

    return await response.json()
}

/**
 * Obtiene un nuevo Access Token usando el Refresh Token.
 */
export async function refreshAccessToken(refreshToken: string) {
    const url = 'https://oauth2.googleapis.com/token'
    const values = {
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(values).toString(),
    })

    if (!response.ok) {
        throw new Error(`Google Refresh Error: ${await response.text()}`)
    }

    return await response.json()
}

/**
 * MOTOR AUTO-HEALING
 * Obtiene un token válido para el usuario. Si expiró, lo refresca y actualiza la DB.
 */
export async function getValidAccessToken(userId: string, supabase: any): Promise<string | null> {

    // 1. Obtener tokens actuales
    const { data: user, error } = await supabase
        .from('usuarios')
        .select('google_access_token, google_refresh_token, google_token_expiry')
        .eq('id', userId)
        .single()

    if (error || !user || !user.google_refresh_token) {
        console.warn("[GoogleAuth] No refresh token available for user", userId)
        return null
    }

    // 2. Verificar expiración (con margen de 5 minutos)
    const now = Date.now()
    const expiry = user.google_token_expiry ? Number(user.google_token_expiry) : 0
    const isExpired = now >= (expiry - 5 * 60 * 1000)

    if (!isExpired && user.google_access_token) {
        return user.google_access_token
    }

    console.log("[GoogleAuth] Token expired doing auto-healing...")

    // 3. Auto-Healing: Refrescar token
    try {
        const tokens = await refreshAccessToken(user.google_refresh_token)

        // Calcular nueva expiración
        const newExpiry = Date.now() + (tokens.expires_in * 1000)

        // 4. Actualizar DB
        await supabase.from('usuarios').update({
            google_access_token: tokens.access_token,
            google_token_expiry: newExpiry,
            // Algunos proveedores rotan el refresh_token, Google generalmente no, pero si viene, lo guardamos
            ...(tokens.refresh_token && { google_refresh_token: tokens.refresh_token })
        }).eq('id', userId)

        return tokens.access_token

    } catch (refreshError) {
        console.error("[GoogleAuth] Critical Auto-Healing Failed:", refreshError)
        return null
    }
}
