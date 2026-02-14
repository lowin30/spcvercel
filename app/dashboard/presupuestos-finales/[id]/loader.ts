import { supabaseAdmin } from "@/lib/supabase-admin"

export type PresupuestoFinalLoaderData = {
    presupuesto: any // Se tipará mejor si hay types definidos, por ahora any para compatibilidad
    items: any[]
    error?: string
}

export async function getPresupuestoFinalById(id: string): Promise<PresupuestoFinalLoaderData | null> {
    try {
        // 1. Cargar Presupuesto Final (Vista Completa)
        const { data: presupuesto, error: presupuestoError } = await supabaseAdmin
            .from("vista_presupuestos_finales_completa")
            .select("*")
            .eq("id", id)
            .single()

        if (presupuestoError || !presupuesto) {
            console.error("Error loader presupuestoFinal:", presupuestoError)
            return null
        }

        // 2. Cargar Estado (Relación directa para asegurar colores/datos frescos)
        const { data: presupuestoConEstado } = await supabaseAdmin
            .from("presupuestos_finales")
            .select(`
                id, id_estado, 
                estados_presupuestos:id_estado (id, nombre, codigo, color)
            `)
            .eq("id", id)
            .single()

        // 3. Cargar Info Edificio (si aplica)
        let edificioInfo = null
        if (presupuesto.id_edificio) {
            const { data: edificioData } = await supabaseAdmin
                .from("vista_edificios_completa")
                .select("*")
                .eq("id", presupuesto.id_edificio)
                .single()
            edificioInfo = edificioData
        }

        // 4. Cargar Items
        const { data: items } = await supabaseAdmin
            .from("items")
            .select("*")
            .eq("id_presupuesto", id)
            .order("id", { ascending: true })

        // 5. Comparación con Base (para el cálculo de ajuste)
        // La vista ya trae 'presupuestos_base'? Si no, lo cargamos.
        // La vista vista_presupuestos_finales_completa suele tener relaciones.
        // Pero para asegurar el 'total' del base:
        let presupuestoBaseTotal = 0;
        if (presupuesto.id_presupuesto_base) { // Si existe la columna de relación
            const { data: pb } = await supabaseAdmin
                .from("presupuestos_base")
                .select("total")
                .eq("id", presupuesto.id_presupuesto_base)
                .single()
            if (pb) presupuestoBaseTotal = pb.total
        } else {
            // Intentar buscar por relación inversa o lógica negocio?
            // En el componente original: presupuesto.presupuestos_base?.total
            // Asumimos que la vista lo trae o supabase lo resuelve si está en select.
            // Vamos a hacer un fetch explícito si la vista no lo trajo anidado rico.
            // Para el loader, mejor traerlo explícito si es crítico.
        }

        // MIXIN: Combinar datos
        const dataCompleta = {
            ...presupuesto,
            estados_presupuestos: presupuestoConEstado?.estados_presupuestos || null,
            edificio_info: edificioInfo,
            presupuestos_base: presupuesto.presupuestos_base || { total: presupuestoBaseTotal } // Fallback/Enhance
        }

        return {
            presupuesto: dataCompleta,
            items: items || []
        }

    } catch (error) {
        console.error("Error critico en loader presupuesto final:", error)
        return null
    }
}
