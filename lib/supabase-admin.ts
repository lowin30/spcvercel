import { createClient } from '@supabase/supabase-js'

// WARNING: This client uses the Service Role Key.
// It has admin privileges and bypasses RLS.
// Use ONLY in secure server-side contexts (Loader/Actions).
// NEVER expose this client to the browser.

export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
)
