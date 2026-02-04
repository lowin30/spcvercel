// SPC Protocol v20.1: WebAuthn Login Challenge
// Generates authentication options for passwordless login

import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { createServerClient } from '@/lib/supabase-server'
import { WEBAUTHN_CONFIG, storeChallenge } from '@/lib/webauthn-config'

export async function POST(request: Request) {
  try {
    // 1. Get email from request body (user enters email first to identify which credentials to use)
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // 2. Find user by email (using service role to bypass RLS)
    const supabase = await createServerClient()

    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('id, email')
      .eq('email', email)
      .single()

    if (userError || !usuario) {
      // Don't reveal whether user exists or not for security
      return NextResponse.json(
        { error: 'No registered authenticators found for this email' },
        { status: 404 }
      )
    }

    // 3. Get user's registered authenticators
    const { data: authenticators, error: authError } = await supabase
      .from('webauthn_credentials')
      .select('credential_id')
      .eq('user_id', usuario.id)
      .eq('is_active', true)

    if (authError || !authenticators || authenticators.length === 0) {
      return NextResponse.json(
        { error: 'No registered authenticators found. Please use Google login.' },
        { status: 404 }
      )
    }

    // 4. Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: WEBAUTHN_CONFIG.rpID,
      timeout: WEBAUTHN_CONFIG.timeout,
      userVerification: WEBAUTHN_CONFIG.userVerification,

      // Allow any of the user's registered credentials
      allowCredentials: authenticators.map((auth) => ({
        id: auth.credential_id,
        type: 'public-key' as const,
        transports: ['internal', 'hybrid'], // Support both platform and cross-platform
      })),
    })

    // 5. Store challenge for verification (using email as key since user isn't logged in yet)
    storeChallenge(email, options.challenge)

    // 6. Return options to client
    return NextResponse.json(options)

  } catch (error) {
    console.error('Error generating authentication options:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication options' },
      { status: 500 }
    )
  }
}
