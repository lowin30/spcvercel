// SPC Protocol v20.1: WebAuthn Registration Verification
// Verifies the authenticator response and stores the credential

import { NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/types'
import { createServerClient } from '@/lib/supabase-server'
import { WEBAUTHN_CONFIG, getChallenge, deleteChallenge } from '@/lib/webauthn-config'

export async function POST(request: Request) {
  try {
    // 1. Get authenticated user
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get the credential response from client
    const body = await request.json()
    const { credential, deviceName } = body as {
      credential: RegistrationResponseJSON
      deviceName?: string
    }

    if (!credential) {
      return NextResponse.json(
        { error: 'Missing credential data' },
        { status: 400 }
      )
    }

    // 3. Retrieve the challenge for this user
    const expectedChallenge = getChallenge(user.id)
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: 'Challenge expired or not found. Please try again.' },
        { status: 400 }
      )
    }

    // 4. Verify the registration response
    let verification
    try {
      verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: WEBAUTHN_CONFIG.origin,
        expectedRPID: WEBAUTHN_CONFIG.rpID,
        requireUserVerification: true,
      })
    } catch (error) {
      console.error('Registration verification failed:', error)
      deleteChallenge(user.id)
      return NextResponse.json(
        { error: 'Verification failed. Please try again.' },
        { status: 400 }
      )
    }

    const { verified, registrationInfo } = verification

    if (!verified || !registrationInfo) {
      deleteChallenge(user.id)
      return NextResponse.json(
        { error: 'Could not verify authenticator response' },
        { status: 400 }
      )
    }

    // 5. Extract credential data
    const {
      credentialPublicKey,
      credentialID,
      counter,
      credentialDeviceType,
      credentialBackedUp,
    } = registrationInfo

    // 6. Store the credential in database
    const { error: dbError } = await supabase
      .from('user_authenticators')
      .insert({
        user_id: user.id,
        credential_id: Buffer.from(credentialID).toString('base64'),
        public_key: Buffer.from(credentialPublicKey).toString('base64'),
        counter: counter,
        device_type: credentialDeviceType || 'unknown',
        user_agent: request.headers.get('user-agent') || undefined,
        friendly_name: deviceName || `Dispositivo ${new Date().toLocaleDateString()}`,
      })

    if (dbError) {
      console.error('Database error:', dbError)
      deleteChallenge(user.id)
      return NextResponse.json(
        { error: 'Failed to save credential' },
        { status: 500 }
      )
    }

    // 7. Clean up the challenge
    deleteChallenge(user.id)

    // 8. Return success
    return NextResponse.json({
      verified: true,
      message: 'Authenticator registered successfully',
    })

  } catch (error) {
    console.error('Registration verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
