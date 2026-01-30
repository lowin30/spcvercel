import { createServerClient } from "@/lib/supabase-server"
import { syncGoogleContact } from "@/lib/google-contacts"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { contactData } = body

        if (!contactData) {
            return NextResponse.json({ error: "Missing contactData" }, { status: 400 })
        }

        const supabase = await createServerClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // SPC v17.0: Sync call
        console.log(`[GoogleSync] Syncing contact via Form: ${contactData.nombre}`)
        const result = await syncGoogleContact(session.user.id, contactData, supabase)

        if (!result.success) {
            console.error("[GoogleSync] Sync Failed:", result.error)
            // We return 200 with success:false so the frontend can show a specific warning if needed, 
            // or we can return 500. The user just wants a toast "Sync Success". 
            // If it fails, maybe we should warn.
            return NextResponse.json({ success: false, error: result.error })
        }

        return NextResponse.json({ success: true, resourceName: result.resourceName })

    } catch (e) {
        console.error("[GoogleSync] Fatal Error:", e)
        return NextResponse.json({ error: String(e) }, { status: 500 })
    }
}
