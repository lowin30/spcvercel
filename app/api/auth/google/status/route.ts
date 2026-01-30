import { createClient } from "@/lib/supabase-client" // Server client
import { NextResponse } from "next/server"

export async function GET() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        return NextResponse.json({ connected: false }, { status: 401 })
    }

    const { data: user } = await supabase
        .from('usuarios')
        .select('google_refresh_token')
        .eq('id', session.user.id)
        .single()

    const connected = !!user?.google_refresh_token

    return NextResponse.json({ connected })
}
