import { getSupabaseServer } from "./supabase-singleton"
import { getSession } from "./supabase-server"

export async function getUserDetails(supabase?: any) {
  try {
    // Si supabase es undefined, obtenerlo del singleton
    const supabaseClient = supabase || getSupabaseServer()
    
    // Reutilizar la función getSession mejorada en lugar de llamar directamente
    const session = await getSession()

    if (!session) {
      console.log("No hay sesión activa en getUserDetails")
      return null
    }

    // Implementar un sistema de reintentos para obtener los detalles del usuario
    let intentos = 0;
    const maxIntentos = 3;
    let errorúltimo = null;

    while (intentos < maxIntentos) {
      try {
        // Añadir un pequeño retraso entre intentos (excepto el primer intento)
        if (intentos > 0) {
          await new Promise((resolve) => setTimeout(resolve, 300 * intentos))
        }

        // Obtener los detalles del usuario desde la tabla usuarios
        const { data, error } = await supabaseClient
          .from("usuarios")
          .select("*")
          .eq("id", session.user.id)
          .single()

        if (error) {
          errorúltimo = error
          console.error(`Error al obtener detalles del usuario (intento ${intentos + 1}/${maxIntentos}):`, error)
          
          // Si es un error de límite de tasa, esperar más tiempo
          if (error.message && error.message.includes("Too Many")) {
            await new Promise((resolve) => setTimeout(resolve, 500 * (intentos + 1)))
          }
        } else {
          console.log("Detalles del usuario recuperados con éxito")
          return data
        }
      } catch (error) {
        errorúltimo = error
        console.error(`Error de red al obtener detalles del usuario (intento ${intentos + 1}/${maxIntentos}):`, error)
      }

      intentos++
    }

    console.error("No se pudieron obtener los detalles después de múltiples intentos:", errorúltimo)
    return null
  } catch (error) {
    console.error("Error global en getUserDetails:", error)
    return null
  }
}

export async function getUserDetailsFromCookies() {
  try {
    // Crear cliente Supabase usando la función mejorada
    const supabase = getSupabaseServer()
    
    // Verificar que el cliente Supabase se haya creado correctamente
    if (!supabase) {
      console.error("No se pudo crear el cliente Supabase en getUserDetailsFromCookies")
      return null
    }

    // Implementar un mecanismo de reintento mejorado
    let intentos = 0
    const maxIntentos = 3
    let delay = 200

    while (intentos < maxIntentos) {
      try {
        // Hacer una pausa incremental entre intentos (excepto el primer intento)
        if (intentos > 0) {
          console.log(`Reintentando obtener detalles de usuario (${intentos}/${maxIntentos-1})...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          delay *= 1.5 // Aumentar el retraso en cada intento
        }

        // Usar la función getUserDetails mejorada
        const userDetails = await getUserDetails(supabase)
        
        // Si tenemos datos, devolver inmediatamente
        if (userDetails) {
          return userDetails
        }
        
        // Si no hay datos, seguir intentando
        console.log(`No se obtuvieron datos en intento ${intentos+1}/${maxIntentos}`)
      } catch (error) {
        console.error(`Error al obtener detalles del usuario (intento ${intentos+1}/${maxIntentos}):`, error)
      }
      
      intentos++
    }

    console.error("No se pudieron obtener los detalles del usuario después de múltiples intentos")
    return null
  } catch (error) {
    console.error("Error global en getUserDetailsFromCookies:", error)
    return null
  }
}
