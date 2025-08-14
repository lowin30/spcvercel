"use server"

import { createClient } from '@supabase/supabase-js'

/**
 * SOLUCIÓN DEFINITIVA: Registrar usuario con admin API (service_role_key)
 * - Evita problemas con el trigger on_auth_user_created
 * - Crea el usuario directamente en auth.users y public.usuarios
 * - No requiere verificación de email para pruebas
 */
export async function registrarUsuario(email: string, password: string, nombre: string) {
  console.log('Intentando registrar usuario con Admin API:', { email, nombre })
  
  try {
    // 1. Configuración de clientes de Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Error: Faltan variables de entorno de Supabase (especialmente SUPABASE_SERVICE_ROLE_KEY)')
      return { success: false, message: 'Error de configuración del servidor' }
    }
    
    // Cliente con privilegios de admin que evita el trigger problemático
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verificar si el usuario ya existe antes de crearlo
    const { data: existingUser } = await adminClient.auth.admin.listUsers()
    const userExists = existingUser?.users.some(user => user.email === email)
    
    if (userExists) {
      console.error('El email ya existe en auth.users:', email)
      return { success: false, message: 'Este email ya está registrado. Intenta con otro email o recupera tu contraseña.' }
    }
    
    console.log('El email no existe, intentando crear usuario con:', { email, password })
    
    // 2. Crear usuario directamente con la API de Admin (evita el trigger)
    const { data: adminData, error: adminError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirma automáticamente el email
      user_metadata: { nombre },
      app_metadata: {} // Agregamos explícitamente un objeto vacío
    })
    
    if (adminError) {
      console.error('Error al crear usuario con Admin API:', adminError)
      return { success: false, message: adminError.message }
    }
    
    if (!adminData.user) {
      console.error('No se pudo crear el usuario con Admin API')
      return { success: false, message: 'Error al crear usuario' }
    }
    
    console.log('Usuario creado en Auth con Admin API:', adminData.user.id)
    
    // Crear objeto de datos exactamente con la estructura esperada
    const userData = {
      id: adminData.user.id,
      email: email,
      nombre: nombre || email.split('@')[0],
      rol: 'trabajador', // SIEMPRE trabajador como indicaste
      color_perfil: '#3498db'
      // No incluimos code ni last_login que pueden ser NULL
    }
    
    console.log('Intentando insertar en tabla usuarios con:', userData)
    
    // 3. Insertar DIRECTAMENTE en tabla usuarios con la estructura correcta
    const { data: insertData, error: insertError } = await adminClient
      .from('usuarios')
      .insert(userData)
      .select('id, email, rol')
      .single()
    
    // Verificamos si hay error al insertar (probablemente un conflicto)
    if (insertError) {
      // Mostrar el error completo para diagnóstico
      console.error('ERROR AL INSERTAR EN TABLA USUARIOS:')
      console.error('Código:', insertError.code)
      console.error('Mensaje:', insertError.message)
      console.error('Detalles:', insertError.details)
      console.error('Error completo:', JSON.stringify(insertError, null, 2))
      
      // Verificamos si el usuario ya existe en la tabla (por otro proceso)
      const { data: checkData } = await adminClient
        .from('usuarios')
        .select('id')
        .eq('id', adminData.user.id)
        .single()
      
      // Si no existe en la tabla, entonces hay un problema genuino
      if (!checkData) {
        console.error('Usuario no existe en tabla usuarios después del intento de inserción')
        return {
          success: true,
          incompleteSync: true,
          message: 'Usuario creado pero hubo problemas con su perfil. Un administrador necesita completarlo.'
        }
      }
    }
    
    // 4. Como usamos el admin API con email_confirm=true, el usuario ya tiene acceso
    console.log('Registro exitoso y email confirmado automáticamente')
    
    console.log('Usuario registrado y listo para usar')
    return { 
      success: true, 
      message: 'Registro exitoso. Ya puedes iniciar sesión.'
    }
    
  } catch (error: any) {
    console.error('Error en el proceso de registro:', error)
    return { 
      success: false, 
      message: error?.message || 'Error desconocido en el registro'
    }
  }
}
