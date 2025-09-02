"use client"

import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

// Declarar una variable global para almacenar la instancia del cliente Singleton
declare global {
  var __supabase_client: SupabaseClient | undefined;
}

let supabase_client: SupabaseClient | undefined;

function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // En el servidor, siempre crea una nueva instancia.
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  // En el navegador, usa el patrón Singleton.
  if (!supabase_client) {
    if (!globalThis.__supabase_client) {
      globalThis.__supabase_client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    supabase_client = globalThis.__supabase_client;
  }

  return supabase_client;
}

// Exporta una función que devuelve la instancia Singleton.
export const createClient = () => getSupabaseClient();
