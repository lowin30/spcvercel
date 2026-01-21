import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET: Recuperar historial reciente
export async function GET(req: Request) {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Obtener los últimos 50 mensajes del usuario
    const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }) // Traer los más nuevos primero
        .limit(50)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Invertir para devolver cronológicamente (más antiguo -> más nuevo)
    const reversed = data ? data.reverse() : []

    return NextResponse.json(reversed)
}

// POST: Guardar un nuevo mensaje
export async function POST(req: Request) {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { role, content, metadata } = body

        if (!role || !content) {
            return NextResponse.json({ error: 'Missing role or content' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('chat_history')
            .insert({
                user_id: session.user.id,
                role,
                content,
                metadata: metadata || {}
            })
            .select() // Devolver el registro creado

        if (error) {
            console.error('Error saving chat:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data[0])

    } catch (e) {
        console.error('API Error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
