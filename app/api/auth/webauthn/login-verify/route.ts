// SPC Protocol v24.0: WebAuthn Login Verification (Simplified)
// Verifies authentication and updates JSONB column

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
        { error: 'faltan email o datos de credencial' },
        { status: 400 }
      )
    }

    // 2. Create Supabase client
    const supabase = await createServerClient()

    // 3. Find user by email with credentials
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('id, email, activo, rol, webauthn_credentials')
      .eq('email', email)
      .single()

    if (userError || !usuario) {
      return NextResponse.json(
        { error: 'usuario no encontrado' },
        { status: 404 }
      )
    }

    // 4. Check if user is active
    if (!usuario.activo) {
      return NextResponse.json(
        { error: 'cuenta deshabilitada. contacta al administrador.' },
        { status: 403 }
      )
    }

    // 5. Retrieve the challenge
    const expectedChallenge = getChallenge(email)
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: 'desafio expirado o no encontrado. intenta de nuevo.' },
        { status: 400 }
      )
    }

    // 6. Find the authenticator from JSONB array
    const credentialIDBase64 = credential.id
    const credentials = usuario.webauthn_credentials || []

    const authenticator = credentials.find(
      (cred: any) => cred.credential_id === credentialIDBase64
    )

    if (!authenticator) {
      deleteChallenge(email)
      return NextResponse.json(
        { error: 'autenticador no encontrado' },
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
      console.error('fallo verificacion de autenticacion:', error)
      deleteChallenge(email)
      return NextResponse.json(
        { error: 'verificacion fallida. intenta de nuevo.' },
        { status: 400 }
      )
    }

    const { verified, authenticationInfo } = verification

    if (!verified) {
      deleteChallenge(email)
      return NextResponse.json(
        { error: 'no se pudo verificar respuesta del autenticador' },
        { status: 400 }
      )
    }

    // 8. Update the counter in JSONB array
    const { newCounter } = authenticationInfo
    const updatedCredentials = credentials.map((cred: any) =>
      cred.credential_id === credentialIDBase64
        ? { ...cred, counter: newCounter, last_used_at: new Date().toISOString() }
        : cred
    )

    await supabase
      .from('usuarios')
      .update({ webauthn_credentials: updatedCredentials })
      .eq('id', usuario.id)

    // 9. Create a Supabase session using Service Role
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

    // Generate session token
    const { data: sessionData, error: sessionError } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email: usuario.email,
    })

    if (sessionError || !sessionData) {
      console.error('no se pudo generar sesion:', sessionError)
      deleteChallenge(email)
      return NextResponse.json(
        { error: 'no se pudo crear sesion' },
        { status: 500 }
      )
    }

    // 10. Clean up the challenge
    deleteChallenge(email)

    // 11. Return the session data to client
    return NextResponse.json({
      verified: true,
      message: 'autenticacion exitosa',
      session: {
        access_token: sessionData.properties.access_token,
        refresh_token: sessionData.properties.refresh_token,
        expires_in: sessionData.properties.expires_in,
        token_type: sessionData.properties.token_type,
      },
    })

  } catch (error) {
    console.error('error verificacion de acceso:', error)
    return NextResponse.json(
      { error: 'error interno del servidor' },
      { status: 500 }
    )
  }
}
