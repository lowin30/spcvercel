import { createServerClient } from '@/lib/supabase-server'

export async function getDatosNuevaFactura(presupuestoFinalId?: string) {
    // 0. Inicializar variables
    let presupuestoData = null
    let cliente = undefined
    let items: any[] = []

    // 1. Si hay ID, cargar Presupuesto Final Específico
    if (presupuestoFinalId) {
        const { data: pData } = await supabaseAdmin
            .from("presupuestos_finales")
            .select("*")
            .eq("id", presupuestoFinalId)
            .single()

        if (pData) {
            presupuestoData = pData

            // 2. Cargar Cliente asociado
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

            items = itemsData || []
        }
    }

    // 4. Estados Factura
    const { data: estadosData } = await supabaseAdmin
        .from("estados_facturas")
        .select("*")
        .order("orden")

    const estadosFactura = estadosData || []

    // 5. Cargar Edificios (Catalogo Global para Select)
    const { data: edificiosData } = await supabaseAdmin
        .from("edificios")
        .select(`
            id, 
            nombre, 
            direccion,
            id_administrador,
            administradores (
                id,
                nombre,
                email
            )
        `)
        .order("nombre")

    // 6. Cargar Presupuestos Disponibles (Para selector si no hay ID)
    // Buscamos presupuestos Aprobados (id_estado = 4) que NO tengan factura
    // Nota: Esto trae todos. Si son muchos, paginar. Para MVP traemos recientes.
    let presupuestosDisponibles: any[] = []

    if (!presupuestoFinalId) {
        const { data: presupuestosRaw } = await supabaseAdmin
            .from("presupuestos_finales")
            .select(`
            id,
            code,
            total,
            cliente_id,
            clientes ( nombre, empresa ),
            facturas ( id )
        `)
            .eq("id_estado", 4)
            .order("created_at", { ascending: false })
            .limit(50) // Límite de seguridad

        if (presupuestosRaw) {
            // Filtrar los que ya tienen factura
            presupuestosDisponibles = presupuestosRaw.filter((p: any) => !p.facturas || p.facturas.length === 0)
        }
    }

    // 7. Generar Siguiente Código
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
        presupuesto: presupuestoData ? {
            ...presupuestoData,
            cliente,
            items
        } : null,
        estadosFactura,
        nextCodigo,
        edificios: edificiosData || [],
        presupuestosDisponibles: presupuestosDisponibles || [],
        tareas: []
    }
}
