import { createServerClient } from "@/lib/supabase-server"
import { syncGoogleContact } from "@/lib/google-contacts"
import { NextResponse } from "next/server"

export async function POST() {
    console.log("🚀 [TestEndpoint] Starting request...")
    try {
        const supabase = await createServerClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            console.log("❌ [TestEndpoint] No session")
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        console.log("✅ [TestEndpoint] Session OK for user:", session.user.id)

        // Datos de prueba
        const testData = {
            edificio: "EDIFICIO DEMO",
            depto: "1A",
            nombre: "Juan Perez",
            relacion: "Propietario",
            telefonos: ["1122334455"],
            emails: ["test@demo.com"]
        }

        console.log("🔄 [TestEndpoint] Calling syncGoogleContact...")
        const result = await syncGoogleContact(session.user.id, testData, supabase)
        console.log("🔄 [TestEndpoint] Result:", result)

        if (!result.success) {
            console.error("❌ [TestEndpoint] Sync failed:", result.error)
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({ success: true, resourceName: result.resourceName })

    } catch (e: any) {
        console.error("🔥 [TestEndpoint] FATAL ERROR:", e)
        return NextResponse.json({
            error: "Internal Server Error",
            details: e?.message || String(e)
        }, { status: 500 })
    }
}
