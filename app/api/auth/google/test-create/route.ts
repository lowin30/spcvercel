import { createServerClient } from "@/lib/supabase-server"
import { syncGoogleContact } from "@/lib/google-contacts"
import { NextResponse } from "next/server"

export async function POST() {
    try {
        const supabase = await createServerClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Datos de prueba según protocolo SPC v16
        const testData = {
            edificio: "EDIFICIO DEMO",
            depto: "1A",
            nombre: "Juan Perez",
            relacion: "Propietario",
            telefonos: ["1122334455"],
            emails: ["test@demo.com"]
        }

        const result = await syncGoogleContact(session.user.id, testData)

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({ success: true, resourceName: result.resourceName })

    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 })
    }
}
