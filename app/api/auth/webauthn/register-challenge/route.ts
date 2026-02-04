// SPC Protocol v24.0: WebAuthn Registration Challenge (Simplified)
// Generates registration options using JSONB column in usuarios

import { NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { createServerClient } from '@/lib/supabase-server'
import { WEBAUTHN_CONFIG, storeChallenge } from '@/lib/webauthn-config'

export async function POST() {
  try {
    // 1. Get authenticated user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'no autorizado. inicia sesion primero.' },
        { status: 401 }
      )
    }

    // 2. Get user's existing credentials from JSONB column
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('webauthn_credentials')
      .eq('id', user.id)
      .single()

    const existingCredentials = usuario?.webauthn_credentials || []

    const excludeCredentials = existingCredentials.map((cred: any) => ({
      id: Buffer.from(cred.credential_id, 'base64'),
      type: 'public-key' as const,
    }))

    // 3. Generate registration options
    const options = await generateRegistrationOptions({
      rpName: WEBAUTHN_CONFIG.rpName,
      rpID: WEBAUTHN_CONFIG.rpID,
      userID: Buffer.from(user.id),
      userName: user.email || user.id,
      userDisplayName: user.user_metadata?.nombre || user.email || 'usuario',

      timeout: WEBAUTHN_CONFIG.timeout,
      attestationType: WEBAUTHN_CONFIG.attestation,
      excludeCredentials,

      authenticatorSelection: {
        authenticatorAttachment: WEBAUTHN_CONFIG.authenticatorAttachment,
        userVerification: WEBAUTHN_CONFIG.userVerification,
        residentKey: 'preferred',
      },

      supportedAlgorithmIDs: [-7, -257],
    })

    // 4. Store the challenge for later verification
    storeChallenge(user.id, options.challenge)

    // 5. Return options to client
    return NextResponse.json(options)

  } catch (error) {
    console.error('error generando opciones de registro:', error)
    return NextResponse.json(
      { error: 'no se pudo generar opciones de registro' },
      { status: 500 }
    )
  }
}
