// SPC Protocol v24.0: WebAuthn Registration Verification (Simplified)
// Verifies credential and stores in JSONB column

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
        { error: 'no autorizado' },
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
        { error: 'faltan datos de credencial' },
        { status: 400 }
      )
    }

    // 3. Retrieve the challenge for this user
    const expectedChallenge = getChallenge(user.id)
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: 'desafio expirado o no encontrado. intenta de nuevo.' },
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
      console.error('fallo verificacion de registro:', error)
      deleteChallenge(user.id)
      return NextResponse.json(
        { error: 'verificacion fallida. intenta de nuevo.' },
        { status: 400 }
      )
    }

    const { verified, registrationInfo } = verification

    if (!verified || !registrationInfo) {
      deleteChallenge(user.id)
      return NextResponse.json(
        { error: 'no se pudo verificar respuesta del autenticador' },
        { status: 400 }
      )
    }

    // 5. Extract credential data
    const { credential: credentialData } = registrationInfo
    const credentialID = credentialData.id
    const publicKey = credentialData.publicKey

    // 6. Create new credential object
    const newCredential = {
      credential_id: Buffer.from(credentialID).toString('base64'),
      public_key: Buffer.from(publicKey).toString('base64'),
      counter: credentialData.counter,
      device_name: deviceName || `dispositivo ${new Date().toLocaleDateString()}`,
      created_at: new Date().toISOString(),
      last_used_at: null
    }

    // 7. Append to JSONB array in usuarios table
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('webauthn_credentials')
      .eq('id', user.id)
      .single()

    const existingCredentials = usuario?.webauthn_credentials || []

    const { error: dbError } = await supabase
      .from('usuarios')
      .update({
        webauthn_credentials: [...existingCredentials, newCredential],
        webauthn_enabled: true
      })
      .eq('id', user.id)

    if (dbError) {
      console.error('error de base de datos:', dbError)
      deleteChallenge(user.id)
      return NextResponse.json(
        { error: 'no se pudo guardar credencial' },
        { status: 500 }
      )
    }

    // 8. Clean up the challenge
    deleteChallenge(user.id)

    // 9. Return success
    return NextResponse.json({
      verified: true,
      message: 'autenticador registrado con exito',
    })

  } catch (error) {
    console.error('error verificacion de registro:', error)
    return NextResponse.json(
      { error: 'error interno del servidor' },
      { status: 500 }
    )
  }
}
