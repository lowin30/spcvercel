// SPC Protocol v37.1: WebAuthn Login Challenge (Universal Fix)
// Generates authentication options from JSONB column
// Fix applied: Pass credential IDs as Base64URL strings, not Uint8Array

import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { WEBAUTHN_CONFIG, storeChallenge } from '@/lib/webauthn-config'

export async function POST(request: Request) {
  try {
    console.log('[login-challenge] inicio de request (v38.0 super-logs)')

    // 1. log de variables de entorno (audit v38.0)
    console.log('check rp_id:', process.env.NEXT_PUBLIC_RP_ID)
    console.log('check origin:', process.env.NEXT_PUBLIC_ORIGIN)
    // log de valores efectivos de config
    console.log('config efectiva rp_id:', WEBAUTHN_CONFIG.rpID)
    console.log('config efectiva origin:', WEBAUTHN_CONFIG.origin)

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

    // 2. log de entrada de datos (audit v38.0)
    console.log('datos de la bd:', {
      email,
      cred_id_length: credentials[0]?.credential_id?.length,
      total_creds: credentials.length
    })

    if (credentials.length === 0) {
      console.error('[login-challenge] SIN CREDENCIALES REGISTRADAS:', email)
      return NextResponse.json(
        { error: 'no hay autenticadores registrados. usa acceso de google.' },
        { status: 404 }
      )
    }

    // 3. bloque de proteccion manual (audit v38.0)
    if (!WEBAUTHN_CONFIG.rpID || !WEBAUTHN_CONFIG.origin) {
      console.error('[login-challenge] error fatals: config incompleta')
      return NextResponse.json({
        error: 'error: variables de entorno faltantes en vercel'
      }, { status: 500 })
    }

    // 4. Generate authentication options
    console.log('[login-challenge] preparando opciones (usando string IDs)...')

    // Preparar allowCredentials pasando IDs como Base64URL Strings
    // v39.0 FIX: El runtime de @simplewebauthn v13 espera string para .replace(), 
    // pero TS pide BufferSource. Hacemos bypass de TS con 'as any'.
    const allowCredentials = credentials.map((cred: any, index: number) => {
      // Asegurar formato Base64URL strict standard
      const base64URL = cred.credential_id
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      // v41.0 AUDIT: Integrity Check
      console.log(`[login-challenge] cred #${index} audit:`, {
        db_raw: cred.credential_id,
        transformed: base64URL,
        match: cred.credential_id === base64URL ? 'EXACT' : 'MODIFIED'
      })

      return {
        id: base64URL as any, // FORCE STRING to fix 'a.replace is not a function'
        type: 'public-key' as const,
        transports: cred.transports || undefined, // v41.0: Relax strict default. Let browser decide if unknown.
      }
    })

    console.log(`[login-challenge] allowCredentials payload:`, JSON.stringify(allowCredentials))
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
