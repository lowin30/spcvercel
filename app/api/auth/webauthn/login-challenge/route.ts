// SPC Protocol v37.0: WebAuthn Login Challenge (Extreme Debugging)
// Generates authentication options from JSONB column
// Includes verbose error handling for production diagnostics

import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { WEBAUTHN_CONFIG, storeChallenge } from '@/lib/webauthn-config'

export async function POST(request: Request) {
  try {
    console.log('[login-challenge] inicio de request (v37.0)')

    // 1. Get email from request body
    let body;
    try {
      body = await request.json()
    } catch (e: any) {
      console.error('[login-challenge] error al parsear body:', e)
      return NextResponse.json({
        error: 'body invalido',
        details: e.message,
        stack: e.stack
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
    console.log('[login-challenge] conectando a supabase con service role...')
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

    console.log('[login-challenge] consultando usuario:', email)
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
          details: userError.message,
          code: userError.code
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
    console.log('[login-challenge] credenciales encontradas:', credentials.length)

    if (credentials.length === 0) {
      console.error('[login-challenge] SIN CREDENCIALES REGISTRADAS:', email)
      return NextResponse.json(
        { error: 'no hay autenticadores registrados. usa acceso de google.' },
        { status: 404 }
      )
    }

    // 4. Generate authentication options
    console.log('[login-challenge] preparando opciones...')

    // Preparar allowCredentials con conversion segura
    const allowCredentials = credentials.map((cred: any, index: number) => {
      try {
        // Usar atob para decodificar base64 a string binario
        // Esta es la forma segura que no depende de Buffer
        const binaryString = atob(cred.credential_id)
        const len = binaryString.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }

        return {
          id: bytes,
          type: 'public-key' as const,
          transports: cred.transports || ['internal', 'hybrid'],
        }
      } catch (convError: any) {
        console.error(`[login-challenge] error convirtiendo credencial ${index}:`, convError)
        throw new Error(`error conversion credencial ${index}: ${convError.message}`)
      }
    })

    console.log('[login-challenge] llamando generateAuthenticationOptions...')

    // Llamada protegida a la libreria
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
        error: 'error fatal del servidor (extreme debug)',
        message: fatalError?.message || 'error desconocido',
        stack: fatalError?.stack,
        name: fatalError?.name
      },
      { status: 500 }
    )
  }
}
