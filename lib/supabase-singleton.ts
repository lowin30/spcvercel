import { createClient as createGenericClient, type SupabaseClient } from "@supabase/supabase-js";
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

// Cliente singleton para componentes del lado del cliente (browser)
let clientComponentInstance: SupabaseClient | undefined;

function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey
  );
}

export function getSupabaseClient() {
  // Siempre devuelve la misma instancia en el lado del cliente.
  if (typeof window === "undefined") {
    // En el servidor, siempre crea una nueva instancia para evitar compartir datos entre requests.
    return createClient();
  }
  if (!clientComponentInstance) {
    clientComponentInstance = createClient();
  }
  return clientComponentInstance;
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
