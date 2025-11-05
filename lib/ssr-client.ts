// lib/ssr-client.ts
// Supabase client for Client Components (browser)
import { createBrowserClient } from '@supabase/ssr'
import { supabaseUrl, supabaseAnonKey } from './supabase-singleton'

export function createSsrClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey
  )
}
