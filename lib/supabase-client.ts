"use client";

import { createClient as createGenericClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase-singleton";
// import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"; // Comentado temporalmente

// Configuración de Supabase
const SUPABASE_URL = "https://fodyzgjwoccpsjmfinvm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvZHl6Z2p3b2NjcHNqbWZpbnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MTc4NzgsImV4cCI6MjA2MzI5Mzg3OH0.kpthf8iRunvBCcbk73Csvi2zmK_kMFPjS3wmnM79GNQ";

// Variable global para almacenar la única instancia del cliente Supabase
// Usa globalThis para garantizar que sea accesible en todos los contextos del navegador
// Usaremos el tipo de createClientComponentClient para el cliente del navegador
// y createGenericClient para el mock del servidor si es necesario mantener la distinción.
// Por ahora, enfocaremos el tipo en el cliente del navegador.
type SupabaseClientType = SupabaseClient; // Corregido tipo

// Asegurarnos de que globalThis.supabaseClient esté tipado correctamente
declare global {
  var __supabaseClient: SupabaseClient<any, "public", any> | undefined;
}

// Cliente para componentes del lado del cliente (browser)
// Esta implementación garantiza una única instancia global

// Esta función se exporta desde supabase-singleton.ts
export { getSupabaseClient };

// Función de fallback para SSR que permite importaciones sin errores
export function createBrowserSupabaseClient() {
  if (typeof window === "undefined") {
    // En el servidor, devolvemos un cliente simulado que devuelve respuestas vacías
    // pero con la estructura correcta para evitar errores de tipo
    const mockResponse = { data: null, error: null, count: null, status: 200, statusText: "OK" };
    
    // En el servidor, devolvemos un cliente simulado (mock) que usa createGenericClient
    // para mantener la estructura si es necesario, o un mock más simple.
    // Por ahora, mantenemos el mock detallado para evitar romper la lógica existente.
    const mockSupabase = createGenericClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    return {
      // Sobrescribimos los métodos para que devuelvan promesas resueltas con datos mock
      // Esto es más robusto que el mock anterior si alguna vez se intenta usar más profundamente.
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: { session: null, user: null }, error: { message: 'Mock client', name: 'MockError', status: 400 } }),
        signOut: () => Promise.resolve({ error: null }),
        // ...otros métodos de auth que podrían necesitar mockeo
      },
      from: (table: string) => ({
        select: (selectQuery = '*') => ({
          eq: (column: string, value: any) => Promise.resolve({ data: [], error: null, count: 0, status: 200, statusText: 'OK (mock)' }),
          neq: (column: string, value: any) => Promise.resolve({ data: [], error: null, count: 0, status: 200, statusText: 'OK (mock)' }),
          in: (column: string, values: any[]) => Promise.resolve({ data: [], error: null, count: 0, status: 200, statusText: 'OK (mock)' }),
          single: () => Promise.resolve({ data: null, error: null, count: 0, status: 200, statusText: 'OK (mock)' }),
          maybeSingle: () => Promise.resolve({ data: null, error: null, count: 0, status: 200, statusText: 'OK (mock)' }),
          order: (column: string, options?: any) => Promise.resolve({ data: [], error: null, count: 0, status: 200, statusText: 'OK (mock)' }),
          limit: (count: number) => Promise.resolve({ data: [], error: null, count: 0, status: 200, statusText: 'OK (mock)' }),
          // Devolver una promesa para el comportamiento por defecto de select()
          then: (onfulfilled: any, onrejected: any) => Promise.resolve({ data: [], error: null, count: 0, status: 200, statusText: 'OK (mock)' }).then(onfulfilled, onrejected),
        }),
        insert: (data: any) => Promise.resolve({ data: Array.isArray(data) ? data : [data], error: null, count: Array.isArray(data) ? data.length : 1, status: 201, statusText: 'Created (mock)' }),
        update: (data: any) => ({
          eq: (column: string, value: any) => Promise.resolve({ data: [data], error: null, count: 1, status: 200, statusText: 'OK (mock)' }),
          match: (query: any) => Promise.resolve({ data: [data], error: null, count: 1, status: 200, statusText: 'OK (mock)' }),
        }),
        delete: () => ({
          eq: (column: string, value: any) => Promise.resolve({ data: [], error: null, count: 0, status: 200, statusText: 'OK (mock)' }),
          match: (query: any) => Promise.resolve({ data: [], error: null, count: 0, status: 200, statusText: 'OK (mock)' }),
        }),
      }),
      storage: {
        from: (bucketId: string) => ({
          upload: (path: string, file: File) => Promise.resolve({ data: { path }, error: null }),
          download: (path: string) => Promise.resolve({ data: new Blob(), error: null }),
          getPublicUrl: (path: string) => ({ data: { publicUrl: `mock://supabase.co/storage/v1/object/public/${bucketId}/${path}` } }),
          // ...otros métodos de storage que podrían necesitar mockeo
        }),
      },
      // ...otros métodos de cliente Supabase que podrían necesitar mockeo
    } as any; // Usamos 'as any' para simplificar el mock, ya que no es un cliente completo
  }
  
  // En el cliente, devolvemos la instancia global única del cliente
  // Esto evita crear múltiples instancias de GoTrueClient
  return getSupabaseClient();
}
