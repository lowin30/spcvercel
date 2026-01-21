import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    }
                }
            }
        )

        // Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        // Obtener tareas activas usando la vista real
        const { data, error } = await supabase
            .from('vista_tareas_completa')
            .select('id, titulo, descripcion, estado_tarea, fecha_visita, nombre_edificio')
            .in('estado_tarea', ['Aprobado', 'Organizar', 'Preguntar', 'Presupuestado', 'Enviado', 'En Proceso'])
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) {
            console.error('Error fetching tasks:', error)
            return NextResponse.json({ error: 'Error al obtener tareas' }, { status: 500 })
        }

        return NextResponse.json({ tasks: data || [] })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
