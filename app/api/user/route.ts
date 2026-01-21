import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// API endpoint para obtener información del usuario actual
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener datos del usuario incluyendo rol
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol')
      .eq('firebase_uid', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: userData.id,
        nombre: userData.nombre,
        email: userData.email,
        rol: userData.rol
      }
    })
  } catch (error) {
    console.error('[API /user] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
