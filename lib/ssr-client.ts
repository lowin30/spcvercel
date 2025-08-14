// lib/ssr-client.ts
// Supabase client for Client Components (browser)
import { createBrowserClient } from '@supabase/ssr'

export function createSsrClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
