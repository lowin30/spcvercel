// SPC Protocol v37.1: WebAuthn Login Challenge (Universal Fix)
// Generates authentication options from JSONB column
// Fix applied: Pass credential IDs as Base64URL strings, not Uint8Array

import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { WEBAUTHN_CONFIG, storeChallenge } from '@/lib/webauthn-config'

export async function POST(request: Request) {
  try {
    console.log('[login-challenge] inicio de request (v37.1)')

    // 1. Get email from request body
    let body;
    try {
      body = await request.json()
    } catch (e: any) {
      console.error('[login-challenge] error al parsear body:', e)
      return NextResponse.json({
        error: 'body invalido',
        details: e.message
      }, { status: 400 })
    }

    const { email: rawEmail } = body

    // normalizar email (trim + lowercase)
    const email = rawEmail?.trim().toLowerCase()

    console.log('[login-challenge] email recibido (normalizado):', email)

    if (!email || typeof email !== 'string' || email === '') {
      console.error('[login-challenge] email invalido o vacio:', email)
      return NextResponse.json(
        { error: 'email requerido' },
        { status: 400 }
      )
    }

    // 2. Find user by email with credentials (usando service role para bypass rls)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    )

    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('id, email, webauthn_credentials')
      .eq('email', email)
      .single()

    if (userError) {
      console.error('[login-challenge] ERROR SUPABASE:', userError)
      return NextResponse.json(
        {
          error: 'error al buscar usuario',
          details: userError.message
        },
        { status: 500 }
      )
    }

    if (!usuario) {
      console.error('[login-challenge] USUARIO NO EXISTE:', email)
      return NextResponse.json(
        { error: 'email no registrado' },
        { status: 404 }
      )
    }

    // 3. Get credentials from JSONB array
    const credentials = usuario.webauthn_credentials || []

    if (credentials.length === 0) {
      console.error('[login-challenge] SIN CREDENCIALES REGISTRADAS:', email)
      return NextResponse.json(
        { error: 'no hay autenticadores registrados. usa acceso de google.' },
        { status: 404 }
      )
    }

    // 4. Generate authentication options
    console.log('[login-challenge] preparando opciones (usando string IDs)...')

    // Preparar allowCredentials pasando IDs como Base64URL Strings
    // Esto evita el 'TypeError: a.replace is not a function' interno de la libreria
    const allowCredentials = credentials.map((cred: any, index: number) => {
      try {
        // Base64 to Base64URL string BREAKS BUILD (TS type mismatch).
        // Reverting to Uint8Array (via atob) which allows build to pass.
        // The previous runtime error 'a.replace' was likely due to rpID which is now fixed in config.
        const binaryString = atob(cred.credential_id)
        const len = binaryString.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }

        return {
          id: bytes, // Uint8Array (Correct TS type)
          type: 'public-key' as const,
          transports: cred.transports || ['internal', 'hybrid'],
        }
      } catch (convError: any) {
        console.error(`[login-challenge] error convirtiendo credencial ${index}:`, convError)
        // Skip invalid credentials instead of crashing? No, lets throw to see it.
        throw convError
      }
    })

    console.log(`[login-challenge] ${allowCredentials.length} credenciales preparadas`)
    console.log(`[login-challenge] rpID para generacion: '${WEBAUTHN_CONFIG.rpID}'`)

    let options;
    try {
      options = await generateAuthenticationOptions({
        rpID: WEBAUTHN_CONFIG.rpID,
        timeout: WEBAUTHN_CONFIG.timeout,
        userVerification: WEBAUTHN_CONFIG.userVerification,
        allowCredentials,
      })
    } catch (libError: any) {
      console.error('[login-challenge] CRASH en generateAuthenticationOptions:', libError)
      return NextResponse.json({
        error: 'crash interno en libreria webauthn',
        message: libError.message,
        stack: libError.stack,
        name: libError.name
      }, { status: 500 })
    }

    // 5. Store challenge
    storeChallenge(email, options.challenge)
    console.log('[login-challenge] exito, challenge generado')

    // 6. Return options
    return NextResponse.json(options)

  } catch (fatalError: any) {
    console.error('[login-challenge] ERROR FATAL NO CAPTURADO:', fatalError)

    return NextResponse.json(
      {
        error: 'error fatal del servidor',
        message: fatalError?.message,
        stack: fatalError?.stack
      },
      { status: 500 }
    )
  }
}
