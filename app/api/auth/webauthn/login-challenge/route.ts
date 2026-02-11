// SPC Protocol v24.0: WebAuthn Login Challenge (Simplified)
// Generates authentication options from JSONB column

import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { WEBAUTHN_CONFIG, storeChallenge } from '@/lib/webauthn-config'

export async function POST(request: Request) {
  try {
    console.log('[login-challenge] inicio de request')

    // 1. Get email from request body
    const body = await request.json()
    const { email: rawEmail } = body

    // normalizar email (trim + lowercase)
    const email = rawEmail?.trim().toLowerCase()

    console.log('[login-challenge] email recibido (normalizado):', email)
    console.log('[login-challenge] body completo:', JSON.stringify(body))

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
      console.error('[login-challenge] ERROR SUPABASE:', {
        code: userError.code,
        message: userError.message,
        details: userError.details,
        hint: userError.hint,
        email_buscado: email
      })
      return NextResponse.json(
        { error: 'error al buscar usuario' },
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

    console.log('[login-challenge] usuario encontrado:', usuario.id)
    console.log('[login-challenge] webauthn_credentials raw:', typeof usuario.webauthn_credentials, usuario.webauthn_credentials)

    // 3. Get credentials from JSONB array
    const credentials = usuario.webauthn_credentials || []
    console.log('[login-challenge] credenciales parseadas:', credentials.length, 'encontradas')

    if (credentials.length === 0) {
      console.error('[login-challenge] SIN CREDENCIALES REGISTRADAS:', email)
      return NextResponse.json(
        { error: 'no hay autenticadores registrados. usa acceso de google.' },
        { status: 404 }
      )
    }

    console.log('[login-challenge] primera credencial:', JSON.stringify(credentials[0]))
    console.log('[login-challenge] credential_id:', credentials[0].credential_id)
    console.log('[login-challenge] credential_id type:', typeof credentials[0].credential_id)
    console.log('[login-challenge] credential_id length:', credentials[0].credential_id?.length)

    // 4. Generate authentication options
    console.log('[login-challenge] preparando opciones de autenticacion...')
    console.log('[login-challenge] rpID:', WEBAUTHN_CONFIG.rpID)
    console.log('[login-challenge] timeout:', WEBAUTHN_CONFIG.timeout)
    console.log('[login-challenge] userVerification:', WEBAUTHN_CONFIG.userVerification)

    try {
      const allowCredentials = credentials.map((cred: any, index: number) => {
        console.log(`[login-challenge] procesando credencial ${index}:`, {
          credential_id: cred.credential_id,
          has_transports: !!cred.transports
        })

        const credId = Buffer.from(cred.credential_id, 'base64')
        console.log(`[login-challenge] credencial ${index} convertida a buffer:`, credId.length, 'bytes')

        return {
          id: Uint8Array.from(credId),  // usar .from en lugar de new
          type: 'public-key' as const,
          transports: cred.transports || ['internal', 'hybrid'],
        }
      })

      console.log('[login-challenge] allowCredentials preparado:', allowCredentials.length)

      const options = await generateAuthenticationOptions({
        rpID: WEBAUTHN_CONFIG.rpID,
        timeout: WEBAUTHN_CONFIG.timeout,
        userVerification: WEBAUTHN_CONFIG.userVerification,
        allowCredentials,
      })

      console.log('[login-challenge] opciones generadas exitosamente')
      console.log('[login-challenge] challenge length:', options.challenge?.length)

      // 5. Store challenge for verification
      storeChallenge(email, options.challenge)
      console.log('[login-challenge] challenge almacenado para:', email)

      // 6. Return options to client
      return NextResponse.json(options)

    } catch (genError: any) {
      console.error('[login-challenge] error al generar opciones:', genError)
      console.error('[login-challenge] error name:', genError.name)
      console.error('[login-challenge] error message:', genError.message)
      console.error('[login-challenge] error stack:', genError.stack)

      return NextResponse.json(
        {
          error: 'no se pudo generar opciones de autenticacion',
          details: genError.message,
          stack: genError.stack,
          name: genError.name
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('[login-challenge] error general:', error)
    console.error('[login-challenge] error type:', typeof error)
    console.error('[login-challenge] error name:', error?.name)
    console.error('[login-challenge] error message:', error?.message)
    console.error('[login-challenge] error stack:', error?.stack)

    return NextResponse.json(
      {
        error: 'no se pudo generar opciones de autenticacion',
        details: error?.message,
        stack: error?.stack,
        name: error?.name
      },
      { status: 500 }
    )
  }
}
