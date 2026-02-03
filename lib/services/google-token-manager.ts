import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

export class GoogleTokenManager {

    private static supabase = createClient(SUPABASE_URL, SERVICE_KEY)

    /**
     * Retrieves a valid access token for the given user.
     * If the current token is expired, it uses the refresh token to get a new one,
     * updates the database, and returns the new token.
     */
    static async getValidAccessToken(userId: string): Promise<string | null> {
        try {
            // 1. Get current tokens from DB
            const { data: user, error } = await this.supabase
                .from('usuarios')
                .select('google_access_token, google_refresh_token, google_token_expiry')
                .eq('id', userId)
                .single()

            if (error || !user) {
                console.error("[TokenManager] User not found or DB error:", error)
                return null
            }

            const now = Date.now()
            const expiryBuffer = 5 * 60 * 1000 // 5 minutes buffer
            const isExpired = !user.google_token_expiry || (user.google_token_expiry - expiryBuffer < now)

            // 2. If valid, return immediately
            if (!isExpired && user.google_access_token) {
                return user.google_access_token
            }

            // 3. If expired, attempt refresh
            if (!user.google_refresh_token) {
                console.warn("[TokenManager] Token expired and no refresh token available for User:", userId)
                return null
            }

            console.log("[TokenManager] Refreshing expired token for User:", userId)
            return await this.refreshAccessToken(userId, user.google_refresh_token)

        } catch (e) {
            console.error("[TokenManager] Unexpected error:", e)
            return null
        }
    }

    /**
     * Performs the actual OAuth Refresh exchange with Google
     */
    private static async refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
        try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: GOOGLE_CLIENT_SECRET,
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token',
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                console.error("[TokenManager] Google Check Fail:", data)
                // If invalid_grant, database should probably be cleared or user notified
                return null
            }

            const newAccessToken = data.access_token
            const expiresInSeconds = data.expires_in
            const newExpiry = Date.now() + (expiresInSeconds * 1000)

            // 4. Update Database
            await this.supabase
                .from('usuarios')
                .update({
                    google_access_token: newAccessToken,
                    google_token_expiry: newExpiry,
                    // Note: Google might return a NEW refresh token sometimes, but usually sticks to the old one unless rotated
                })
                .eq('id', userId)

            return newAccessToken

        } catch (e) {
            console.error("[TokenManager] Network error during refresh:", e)
            return null
        }
    }
}
