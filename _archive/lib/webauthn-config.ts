// SPC Protocol v42.0: WebAuthn Configuration
// Centralized config for all WebAuthn endpoints

export const WEBAUTHN_CONFIG = {
  // Relying Party (RP) configuration
  rpName: 'SPC Sistema de Gestión',
  rpID: 'spcvercel.vercel.app'.trim(),

  // Origin must match the domain where the authentication happens
  origin: 'https://spcvercel.vercel.app'.trim(),

  // Challenge timeout (5 minutes)
  timeout: 300000,

  // Supported authenticator types
  authenticatorAttachment: 'platform' as const, // FORCE platform authenticators (built-in biometrics), NO roaming (USB)

  // User verification requirement
  userVerification: 'required' as const, // FORCE biometric prompt (no PIN/Swipe fallback if possible)

  // Attestation conveyance preference
  attestation: 'none' as const, // We don't need device attestation for basic use
}

// In-memory challenge storage (temporary, will be replaced with Redis in production)
// Key: userId, Value: { challenge: string, timestamp: number }
export const challengeStore = new Map<string, { challenge: string; timestamp: number }>()

// Cleanup expired challenges every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [userId, data] of challengeStore.entries()) {
    if (now - data.timestamp > WEBAUTHN_CONFIG.timeout) {
      challengeStore.delete(userId)
    }
  }
}, 300000)

export function storeChallenge(userId: string, challenge: string) {
  challengeStore.set(userId, {
    challenge,
    timestamp: Date.now(),
  })
}

export function getChallenge(userId: string): string | null {
  const data = challengeStore.get(userId)
  if (!data) return null

  // Check if challenge is still valid
  if (Date.now() - data.timestamp > WEBAUTHN_CONFIG.timeout) {
    challengeStore.delete(userId)
    return null
  }

  return data.challenge
}

export function deleteChallenge(userId: string) {
  challengeStore.delete(userId)
}
