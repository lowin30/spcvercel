// SPC Protocol v20.3: WebAuthn Client Utilities
// Helper functions for biometric authentication in the browser

import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types'

/**
 * Register a new biometric credential for the current user
 * @param deviceName Optional friendly name for the device
 * @returns true if successful, false otherwise
 */
export async function registerBiometric(deviceName?: string): Promise<boolean> {
    try {
        // 1. Get registration options from server
        const challengeResponse = await fetch('/api/auth/webauthn/register-challenge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        })

        if (!challengeResponse.ok) {
            const error = await challengeResponse.json()
            throw new Error(error.error || 'Failed to get registration options')
        }

        const options: PublicKeyCredentialCreationOptionsJSON = await challengeResponse.json()

        // 2. Trigger browser's biometric prompt
        let credential
        try {
            credential = await startRegistration(options)
        } catch (error: any) {
            // User cancelled or device doesn't support WebAuthn
            if (error.name === 'NotAllowedError') {
                throw new Error('Registro cancelado por el usuario')
            }
            throw new Error('Tu dispositivo no soporta autenticación biométrica')
        }

        // 3. Verify and save credential on server
        const verifyResponse = await fetch('/api/auth/webauthn/register-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                credential,
                deviceName: deviceName || `Dispositivo ${new Date().toLocaleDateString()}`,
            }),
        })

        if (!verifyResponse.ok) {
            const error = await verifyResponse.json()
            throw new Error(error.error || 'Failed to verify credential')
        }

        const result = await verifyResponse.json()
        return result.verified === true

    } catch (error: any) {
        console.error('Biometric registration error:', error)
        throw error
    }
}

/**
 * Login using biometric credential
 * @param email User's email address
 * @returns Session data if successful
 */
export async function loginWithBiometric(email: string): Promise<{
    access_token: string
    refresh_token: string
} | null> {
    try {
        // 1. Get authentication options from server
        const challengeResponse = await fetch('/api/auth/webauthn/login-challenge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        })

        if (!challengeResponse.ok) {
            const error = await challengeResponse.json()
            throw new Error(error.error || 'Failed to get login options')
        }

        const options: PublicKeyCredentialRequestOptionsJSON = await challengeResponse.json()

        // 2. Trigger browser's biometric prompt
        let credential
        try {
            credential = await startAuthentication(options)
        } catch (error: any) {
            // User cancelled or device doesn't support WebAuthn
            if (error.name === 'NotAllowedError') {
                throw new Error('Autenticación cancelada')
            }
            throw new Error('No se pudo verificar tu identidad biométrica')
        }

        // 3. Verify assertion and get session
        const verifyResponse = await fetch('/api/auth/webauthn/login-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                credential,
            }),
        })

        if (!verifyResponse.ok) {
            const error = await verifyResponse.json()
            throw new Error(error.error || 'Verification failed')
        }

        const result = await verifyResponse.json()

        if (result.verified && result.session) {
            return result.session
        }

        return null

    } catch (error: any) {
        console.error('Biometric login error:', error)
        throw error
    }
}

/**
 * Check if the browser supports WebAuthn
 */
export function isBiometricSupported(): boolean {
    return typeof window !== 'undefined' &&
        window.PublicKeyCredential !== undefined &&
        typeof window.PublicKeyCredential === 'function'
}
