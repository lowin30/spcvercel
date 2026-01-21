import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user } } = await supabase.auth.getUser()

        // Aunque no haya usuario, podríamos querer listar tareas públicas si existieran,
        // pero por seguridad retornamos vacío si no hay sesión.
        if (!user) return NextResponse.json({ tasks: [] })

        // ESTRATEGIA SIMPLE Y ROBUSTA:
        // Traer las últimas 20 tareas activas del sistema.
        // Asumimos que si el usuario tiene acceso al dashboard, puede ver/seleccionar estas tareas.
        // Esto alinea la experiencia con lo que ve la IA en 'listarTareas'.

        const { data: tasks, error } = await supabase
            .from('vista_tareas_completa')
            .select('id, titulo, estado_tarea')
            .eq('finalizada', false) // Filtrar por booleano real
            .not('estado_tarea', 'in', '("Finalizada", "Cancelada", "Completada")') // Garantía extra de exclusión
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) {
            console.error('Error fetching tasks:', error)
            return NextResponse.json({ tasks: [] })
        }

        return NextResponse.json({ tasks: tasks || [] })

    } catch (error) {
        console.error('Critical Error fetching tasks:', error)
        return NextResponse.json({ tasks: [] })
    }
}
