// SPC Protocol v45.0: WebAuthn Login Challenge (Robust Fix & Audit)
// Generates authentication options from JSONB column
// Fix applied: Robust Buffer-based Base64URL conversion + Deep Audit Logs

import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { Buffer } from 'buffer'
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
    console.log('[login-challenge] preparando opciones (v47.1 forensic audit)...')

    // FORENSIC AUDIT: USER HANDLE
    // webauthn es sensible a los bytes exactos del userhandle.
    // verificamos que la codificacion sea consistente.
    const userHandleHex = Buffer.from(new TextEncoder().encode(usuario.id)).toString('hex')
    console.log(`[audit] user.id raw: ${usuario.id}`)
    console.log(`[audit] user.id encoded (textencoder hex): ${userHandleHex}`)
    console.log(`[audit] user.id type: ${typeof usuario.id} (length: ${usuario.id.length})`)

    // Preparar allowCredentials con conversion ROBUSTA (Buffer)
    // v47.1 FORENSIC: Loguear bit a bit lo que sale
    const allowCredentials = credentials
      .map((cred: any, index: number) => {
        if (!cred || !cred.credential_id) {
          console.warn(`[login-challenge] cred #${index} invalida/vacia, saltando.`)
          return null
        }

        let base64URL = '';
        try {
          // Robusta conversion usando Node.js Buffer
          base64URL = Buffer.from(cred.credential_id, 'base64').toString('base64url');
        } catch (conversionError) {
          console.error('[login-challenge] error conversion base64:', conversionError);
          base64URL = cred.credential_id;
        }

        // v47.1 FORENSIC AUDIT: COMPARACION BINARIA
        // verificamos padding y caracteres url-safe
        console.log(`[audit] cred #${index} id original (db): ${cred.credential_id}`)
        console.log(`[audit] cred #${index} id final (allowcredentials): ${base64URL}`)

        // chequeo rapido de caracteres peligrosos
        const tienePadding = base64URL.includes('=')
        const tieneMas = base64URL.includes('+')
        const tieneSlash = base64URL.includes('/')

        console.log(`[audit] cred #${index} health check: padding=${tienePadding}, mas=${tieneMas}, slash=${tieneSlash}`)

        return {
          id: base64URL as any, // Enviar ID convertido y seguro
          type: 'public-key' as const,
          transports: cred.transports || undefined, // Keep relaxed transports
        }
      })
      .filter((c: any) => c !== null)

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
