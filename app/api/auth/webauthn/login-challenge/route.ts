// SPC Protocol v45.0: WebAuthn Login Challenge (Robust Fix & Audit)
// Generates authentication options from JSONB column
// Fix applied: Robust Buffer-based Base64URL conversion + Deep Audit Logs

import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { WEBAUTHN_CONFIG, storeChallenge } from '@/lib/webauthn-config'

export async function POST(request: Request) {
  try {
    console.log('[login-challenge] inicio de request (v45.0 robust-logs)')

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
    console.log('[login-challenge] preparando opciones (v45.0 ROBUST RECOVERY)...')
    console.log('[login-challenge] AUDIT user.id:', usuario.id, 'type:', typeof usuario.id)

    // Preparar allowCredentials con conversion ROBUSTA (Buffer)
    // v45.0 FIX: Usar Buffer para conversion perfecta Base64 -> Base64URL
    const allowCredentials = credentials.map((cred: any, index: number) => {
      let base64URL = '';
      try {
        // Robusta conversion usando Node.js Buffer
        // Esto maneja padding y caracteres URL-unsafe mejor que .replace() manual
        base64URL = Buffer.from(cred.credential_id, 'base64').toString('base64url');
      } catch (conversionError) {
        console.error('[login-challenge] ERROR CONVERSION BASE64:', conversionError);
        // Fallback porsiaca (aunque Buffer no deberia fallar con base64 valido)
        base64URL = cred.credential_id;
      }

      // v45.0 AUDIT: Deep Integrity Check
      // Imprimimos AMBOS valores para comparar con Google Password Manager
      console.log(`[login-challenge] cred #${index} audit:`, {
        db_raw: cred.credential_id,
        converted_base64url: base64URL,
        match_check: cred.credential_id === base64URL ? 'IDENTICAL' : 'TRANSFORMED'
      })

      return {
        id: base64URL as any, // Enviar ID convertido y seguro
        type: 'public-key' as const,
        transports: cred.transports || undefined, // Keep relaxed transports
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
