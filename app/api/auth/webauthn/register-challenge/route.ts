// SPC Protocol v20.1: WebAuthn Registration Challenge
// Generates registration options for a logged-in user

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
        { error: 'Unauthorized. Please login first.' },
        { status: 401 }
      )
    }

    // 2. Get user's existing authenticators to exclude them
    const { data: existingAuthenticators } = await supabase
      .from('webauthn_credentials')
      .select('credential_id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const excludeCredentials = existingAuthenticators?.map((auth) => ({
      id: auth.credential_id,
      type: 'public-key' as const,
    })) || []

    // 3. Generate registration options
    const options = await generateRegistrationOptions({
      rpName: WEBAUTHN_CONFIG.rpName,
      rpID: WEBAUTHN_CONFIG.rpID,
      userID: user.id,
      userName: user.email || user.id,
      userDisplayName: user.user_metadata?.nombre || user.email || 'Usuario',

      // Timeout for the authentication ceremony
      timeout: WEBAUTHN_CONFIG.timeout,

      // Attestation preference
      attestationType: WEBAUTHN_CONFIG.attestation,

      // Exclude already registered authenticators
      excludeCredentials,

      // Authenticator selection criteria
      authenticatorSelection: {
        authenticatorAttachment: WEBAUTHN_CONFIG.authenticatorAttachment,
        userVerification: WEBAUTHN_CONFIG.userVerification,
        residentKey: 'preferred', // Allow discoverable credentials (autofill UI)
      },

      // Supported algorithms (ES256, RS256)
      supportedAlgorithmIDs: [-7, -257],
    })

    // 4. Store the challenge for later verification
    storeChallenge(user.id, options.challenge)

    // 5. Return options to client
    return NextResponse.json(options)

  } catch (error) {
    console.error('Error generating registration options:', error)
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 }
    )
  }
}
