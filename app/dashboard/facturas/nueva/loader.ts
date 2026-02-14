import { supabaseAdmin } from "@/lib/supabase-admin"

export async function getDatosNuevaFactura(presupuestoFinalId: string) {
    // 1. Cargar Presupuesto Final
    const { data: presupuestoData } = await supabaseAdmin
        .from("presupuestos_finales")
        .select("*")
        .eq("id", presupuestoFinalId)
        .single()

    if (!presupuestoData) {
        return { error: "Presupuesto no encontrado" }
    }

    // 2. Cargar Cliente
    let cliente = undefined
    if (presupuestoData.cliente_id) {
        const { data: clienteData } = await supabaseAdmin
            .from("clientes")
            .select("*")
            .eq("id", presupuestoData.cliente_id)
            .single()
        if (clienteData) cliente = clienteData
    }

    // 3. Cargar Items
    const { data: itemsData } = await supabaseAdmin
        .from("items")
        .select("*")
        .eq("id_presupuesto", presupuestoFinalId)

    const items = itemsData || []

    // 4. Estados Factura
    const { data: estadosData } = await supabaseAdmin
        .from("estados_facturas")
        .select("*")
        .order("orden")

    const estadosFactura = estadosData || []

    // 5. Generar Siguiente Código
    let nextCodigo = "fac000001"
    const { data: facturasExistentes } = await supabaseAdmin
        .from("facturas")
        .select("code")

    if (facturasExistentes && facturasExistentes.length > 0) {
        const numeros = facturasExistentes
            .map(f => f.code)
            .filter((c): c is string => typeof c === 'string' && c.startsWith("fac"))
            .map(c => parseInt(c.substring(3), 10))
            .filter(n => !isNaN(n))

        if (numeros.length > 0) {
            const last = Math.max(...numeros)
            nextCodigo = `fac${(last + 1).toString().padStart(6, '0')}`
        }
    }

    return {
        presupuesto: {
            ...presupuestoData,
            cliente,
            items
        },
        estadosFactura,
        nextCodigo
    }
}
