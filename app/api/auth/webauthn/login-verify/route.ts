// SPC Protocol v20.1: WebAuthn Login Verification
// Verifies the authentication assertion and creates a Supabase session

import { NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'
import { createServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { WEBAUTHN_CONFIG, getChallenge, deleteChallenge } from '@/lib/webauthn-config'

export async function POST(request: Request) {
  try {
    // 1. Get the authentication response from client
    const body = await request.json()
    const { email, credential } = body as {
      email: string
      credential: AuthenticationResponseJSON
    }

    if (!email || !credential) {
      return NextResponse.json(
        { error: 'Missing email or credential data' },
        { status: 400 }
      )
    }

    // 2. Create Supabase client
    const supabase = await createServerClient()

    // 3. Find user by email
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('id, email, activo, rol')
      .eq('email', email)
      .single()

    if (userError || !usuario) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 4. Check if user is active
    if (!usuario.activo) {
      return NextResponse.json(
        { error: 'Account is disabled. Contact administrator.' },
        { status: 403 }
      )
    }

    // 5. Retrieve the challenge for this email
    const expectedChallenge = getChallenge(email)
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: 'Challenge expired or not found. Please try again.' },
        { status: 400 }
      )
    }

    // 6. Find the authenticator that was used (by credential ID)
    const credentialIDBase64 = credential.id

    const { data: authenticator, error: authError } = await supabase
      .from('webauthn_credentials')
      .select('*')
      .eq('user_id', usuario.id)
      .eq('credential_id', credentialIDBase64)
      .eq('is_active', true)
      .single()

    if (authError || !authenticator) {
      deleteChallenge(email)
      return NextResponse.json(
        { error: 'Authenticator not found' },
        { status: 404 }
      )
    }

    // 7. Verify the authentication response
    let verification
    try {
      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: WEBAUTHN_CONFIG.origin,
        expectedRPID: WEBAUTHN_CONFIG.rpID,
        authenticator: {
          credentialID: Buffer.from(authenticator.credential_id, 'base64'),
          credentialPublicKey: Buffer.from(authenticator.public_key, 'base64'),
          counter: authenticator.counter,
        },
        requireUserVerification: true,
      })
    } catch (error) {
      console.error('Authentication verification failed:', error)
      deleteChallenge(email)
      return NextResponse.json(
        { error: 'Verification failed. Please try again.' },
        { status: 400 }
      )
    }

    const { verified, authenticationInfo } = verification

    if (!verified) {
      deleteChallenge(email)
      return NextResponse.json(
        { error: 'Could not verify authenticator response' },
        { status: 400 }
      )
    }

    // 8. Update the counter to prevent replay attacks
    const { newCounter } = authenticationInfo
    await supabase
      .from('webauthn_credentials')
      .update({
        counter: newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', authenticator.id)

    // 9. Create a Supabase session using Service Role
    // This is the critical part - we need to create a valid auth session
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    )

    // Generate a new session token for this user
    const { data: sessionData, error: sessionError } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email: usuario.email,
    })

    if (sessionError || !sessionData) {
      console.error('Failed to generate session:', sessionError)
      deleteChallenge(email)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    // 10. Clean up the challenge
    deleteChallenge(email)

    // 11. Return the session data to client
    // The client will use this to set the session in their Supabase client
    return NextResponse.json({
      verified: true,
      message: 'Authentication successful',
      session: {
        access_token: sessionData.properties.access_token,
        refresh_token: sessionData.properties.refresh_token,
        expires_in: sessionData.properties.expires_in,
        token_type: sessionData.properties.token_type,
      },
    })

  } catch (error) {
    console.error('Login verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
