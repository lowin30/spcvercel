// SPC Protocol v24.0: WebAuthn Login Challenge (Simplified)
// Generates authentication options from JSONB column

import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { createServerClient } from '@/lib/supabase-server'
import { WEBAUTHN_CONFIG, storeChallenge } from '@/lib/webauthn-config'

export async function POST(request: Request) {
  try {
    // 1. Get email from request body
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'email requerido' },
        { status: 400 }
      )
    }

    // 2. Find user by email with credentials
    const supabase = await createServerClient()

    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('id, email, webauthn_credentials')
      .eq('email', email)
      .single()

    if (userError || !usuario) {
      return NextResponse.json(
        { error: 'no se encontraron autenticadores para este email' },
        { status: 404 }
      )
    }

    // 3. Get credentials from JSONB array
    const credentials = usuario.webauthn_credentials || []

    if (credentials.length === 0) {
      return NextResponse.json(
        { error: 'no hay autenticadores registrados. usa acceso de google.' },
        { status: 404 }
      )
    }

    // 4. Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: WEBAUTHN_CONFIG.rpID,
      timeout: WEBAUTHN_CONFIG.timeout,
      userVerification: WEBAUTHN_CONFIG.userVerification,

      allowCredentials: credentials.map((cred: any) => ({
        id: Buffer.from(cred.credential_id, 'base64'),
        type: 'public-key' as const,
        transports: cred.transports || ['internal', 'hybrid'],
      })),
    })

    // 5. Store challenge for verification
    storeChallenge(email, options.challenge)

    // 6. Return options to client
    return NextResponse.json(options)

  } catch (error) {
    console.error('error generando opciones de autenticacion:', error)
    return NextResponse.json(
      { error: 'no se pudo generar opciones de autenticacion' },
      { status: 500 }
    )
  }
}
