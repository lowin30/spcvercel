"use server"

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// @deprecated - spc v48.3: registro con password deprecado. usar descope flow.
// esta funcion se mantiene por compatibilidad con user-role-manager.tsx
export async function registerUserServerSide(email: string, password: string, nombre: string) {
  console.warn('spc: registerUserServerSide esta deprecado. usar descope para autenticacion.')
  try {
    // Validación básica para evitar errores con valores undefined
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables de entorno no configuradas correctamente')
    }

    // Creamos un cliente especial con la clave de servicio (service role)
    // Esta clave tiene privilegios especiales y permite bypass de verificación
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Crear el usuario con la clave de servicio (sin verificación)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Marcar el email como ya confirmado
      user_metadata: { nombre }
    })

    if (authError) throw authError

    // 2. Verificar si se creó correctamente en la tabla usuarios
    // Si no, crearlo manualmente
    if (authData?.user) {
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (!existingUser) {
        // Nos aseguramos que email nunca sea undefined
        const userEmail = authData.user.email || email

        await supabase
          .from('usuarios')
          .insert({
            id: authData.user.id,
            email: userEmail,
            nombre: nombre || userEmail.split('@')[0],
            rol: 'trabajador',
            activo: true
          })
      }

      return { success: true, message: "Usuario creado correctamente" }
    }

    return { success: false, message: "No se pudo crear el usuario" }
  } catch (error: any) { // Usamos any para permitir acceso a .message
    console.error("Error en el registro del lado del servidor:", error)
    return {
      success: false,
      message: error?.message || "Error desconocido en el registro"
    }
  }
}
