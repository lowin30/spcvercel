import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
    try {
        const supabase = await createServerClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Obtener rol
        const { data: userData } = await supabase
            .from('usuarios')
            .select('rol')
            .eq('id', user.id)
            .single()

        const badges: Record<string, number> = {}

        // Lógica Segura: Solo consulta si tiene rol, y usa try-catch por consulta
        if (userData?.rol === 'admin') {
            try {
                const { count } = await supabase.from('tareas').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente')
                if (count) badges['crear_tarea'] = count // Tareas pendientes
            } catch (e) { }

            try {
                const { count } = await supabase.from('presupuestos').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente_aprobacion')
                if (count) badges['aprobar_presupuesto'] = count
            } catch (e) { }
        }

        if (userData?.rol === 'trabajador') {
            try {
                const { count } = await supabase.from('tareas').select('*', { count: 'exact', head: true }).eq('asignado_a', user.id).eq('estado', 'pendiente')
                if (count) badges['listar_mis_tareas'] = count
            } catch (e) { }
        }

        return NextResponse.json({ badges })

    } catch (error) {
        console.error('Error badges:', error)
        // Fallback seguro: retornar objeto vacío, no romper la UI
        return NextResponse.json({ badges: {} })
    }
}
