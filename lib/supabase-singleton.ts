import { createClient as createGenericClient } from "@supabase/supabase-js";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { createBrowserClient } from "@supabase/ssr";

// Configuración de Supabase
export const supabaseUrl = "https://fodyzgjwoccpsjmfinvm.supabase.co"
export const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvZHl6Z2p3b2NjcHNqbWZpbnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MTc4NzgsImV4cCI6MjA2MzI5Mzg3OH0.kpthf8iRunvBCcbk73Csvi2zmK_kMFPjS3wmnM79GNQ"

// Definir el tipo para la variable global
// type SupabaseClientType = ReturnType<typeof createGenericClient>; // No longer needed

// Asegurar que globalThis.__supabaseClient esté tipado correctamente
declare global {
  var __supabaseClient: SupabaseClient<any, "public", any> | undefined
}

// Cliente para componentes del lado del cliente (browser)
import { type SupabaseClient } from "@supabase/supabase-js";
let clientComponentInstance: SupabaseClient | null = null; // Corregido tipo

export function getSupabaseClient() {
  if (typeof window === "undefined") {
    // Server-side - no deberíamos estar aquí con createBrowserClient
    console.warn("getSupabaseClient() llamado en el servidor. Esto puede causar problemas.");
    return createGenericClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey
    );
  }

  // En el cliente, creamos una nueva instancia si no existe
  if (!clientComponentInstance) {
    try {
      // Intentamos primero con createBrowserClient (nueva API)
      clientComponentInstance = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey
      );
    } catch (e) {
      console.warn(
        "Error al crear cliente con createBrowserClient, usando createClientComponentClient como fallback:",
        e
      );
      // Fallback a la API anterior
      clientComponentInstance = createClientComponentClient();
    }
  }

  return clientComponentInstance;
}

// Función para crear un cliente de Supabase en el lado del cliente
// Utilizando el patrón singleton para evitar múltiples instancias
// NOTA: Esta función parece redundante con getSupabaseClient ahora que usa createBrowserClient.
// Considera unificar o deprecarl si getSupabaseClient satisface todas las necesidades del cliente.
export function createClientSupabase() {
  if (typeof window === "undefined") {
    // Estamos en el servidor
    console.warn("createClientSupabase() llamado en el servidor. Usando createGenericClient con persistSession: false.")
    return createGenericClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Adecuado para usos efímeros en servidor si es necesario
      },
    });
  }

  // Para el cliente, es mejor usar createBrowserClient consistentemente.
  // Reutilizamos la lógica de getSupabaseClient que ya instancia createBrowserClient.
  console.warn("createClientSupabase() llamado en el cliente. Redirigiendo a getSupabaseClient() que usa createBrowserClient.");
  return getSupabaseClient(); 

  // La lógica original de globalThis.__supabaseClient con createGenericClient podría ser menos ideal
  // que usar createBrowserClient directamente para el contexto del navegador con Next.js App Router.
  /*
  if (!globalThis.__supabaseClient) {
    globalThis.__supabaseClient = createGenericClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'supabase.auth.token',
      },
    });
  }
  return globalThis.__supabaseClient;
  */
}

// Implementar un mecanismo de limitación de tasa
const requestTimestamps: number[] = []
const MAX_REQUESTS_PER_MINUTE = 50
const MINUTE_IN_MS = 60 * 1000

function isRateLimited(): boolean {
  const now = Date.now()

  // Eliminar timestamps antiguos (más de un minuto)
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - MINUTE_IN_MS) {
    requestTimestamps.shift()
  }

  // Verificar si se ha excedido el límite
  if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    return true
  }

  // Registrar la nueva solicitud
  requestTimestamps.push(now)
  return false
}

// Singleton para el cliente Supabase en el servidor
let serverInstance: SupabaseClient | null = null; // Corregido tipo

export function getSupabaseServer() {
  if (typeof window !== "undefined") {
    // No debe usarse en el cliente
    console.warn("getSupabaseServer() llamado en el navegador. Esto puede causar problemas.");
    return null;
  }

  // En el servidor, crear un cliente o reutilizar el existente
  if (!serverInstance) {
    try {
      serverInstance = createGenericClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey,
        {
          auth: {
            persistSession: false, // No necesitamos persistir sesiones en el servidor
          },
        }
      );
    } catch (error) {
      console.error("Error al crear cliente Supabase del servidor:", error);
      return null;
    }
  }

  return serverInstance;
}
