import { supabaseAdmin } from "@/lib/supabase-admin"

export type FacturaLoaderData = {
    factura: any
    items: any[]
    extras: any[]
    error?: string
}

export async function getFacturaById(id: string): Promise<FacturaLoaderData | null> {
    try {
        // 1. Cargar Factura con Relaciones
        const { data: factura, error: facturaError } = await supabaseAdmin
            .from('facturas')
            .select(`
                id, code, created_at, id_presupuesto, total, pdf_url, datos_afip, enviada, fecha_envio, pagada, fecha_pago, id_estado_nuevo,
                estados_facturas:id_estado_nuevo (id, nombre, color, codigo),
                presupuestos_finales!inner (
                    id, code, id_tarea, id_edificio, total,
                    tareas (id, titulo, code),
                    edificios (
                        id, nombre, direccion, cuit, id_administrador,
                        administradores (aplica_ajustes, porcentaje_default)
                    )
                )
            `)
            .eq('id', id)
            .single()

        if (facturaError || !factura) {
            console.error('Error loader factura:', facturaError?.message)
            return null
        }

        // 2. Cargar Items (Items de Factura tienen prioridad, si no, items del presupuesto)
        const { data: itemsFactura } = await supabaseAdmin
            .from('items_factura')
            .select('*')
            .eq('id_factura', id)
            .order('id', { ascending: true })

        const { data: itemsPresupuesto } = await supabaseAdmin
            .from('items')
            .select('id, descripcion, cantidad, precio_unitario, total')
            .eq('id_presupuesto', factura.id_presupuesto)
            .order('id', { ascending: true })

        // 3. Cargar Gastos Extra (para el PDF)
        const { data: extras } = await supabaseAdmin
            .from('gastos_extra_pdf_factura')
            .select('id, fecha, monto, descripcion, comprobante_url, imagen_procesada_url, created_at')
            .eq('id_factura', id)
            .order('fecha', { ascending: false })

        // Lógica de items combinada que hacía el page.tsx
        const itemsToShow = (itemsFactura && itemsFactura.length > 0) ? itemsFactura : (itemsPresupuesto || []);

        return {
            factura,
            items: itemsToShow,
            extras: extras || []
        }

    } catch (error) {
        console.error("Error critico en loader factura:", error)
        return null
    }
}
