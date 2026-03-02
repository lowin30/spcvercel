import { createServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"

export async function getComprobantesData() {
    const supabase = await createServerClient()

    // 1. Verificar sesión y rol
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: usuario } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", user.id)
        .single()

    if (usuario?.rol !== "admin") {
        // Solo administradores pueden ver este módulo
        redirect("/dashboard")
    }

    // 2. Obtener gastos de los últimos 3 meses desde la vista platinum
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const { data: gastos, error } = await supabase
        .from("vista_comprobantes_admin_v4")
        .select("*")
        .gte("created_at", threeMonthsAgo.toISOString())
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching comprobantes:", error)
        return []
    }

    return gastos || []
}

export async function getAdminStats() {
    const supabase = await createServerClient()

    // Obtener estadísticas rápidas para el dashboard de comprobantes
    const { data: stats, error } = await supabase
        .rpc('get_comprobantes_stats') // Si no existe, lo calcularemos en el cliente o haremos una query simple

    if (error) {
        // Fallback: Query simple de conteo
        const threeMonthsAgo = new Date()
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

        const { data } = await supabase
            .from("gastos_tarea")
            .select("monto, comprobante_url, imagen_procesada_url")
            .gte("created_at", threeMonthsAgo.toISOString())

        const total = data?.length || 0
        const sinFoto = data?.filter(g => !g.comprobante_url && !g.imagen_procesada_url) || []
        const montoRiesgo = sinFoto.reduce((sum, g) => sum + (g.monto || 0), 0)

        return {
            total,
            sinFoto: sinFoto.length,
            montoRiesgo
        }
    }

    return stats
}
