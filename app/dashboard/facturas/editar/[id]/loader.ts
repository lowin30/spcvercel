import { createServerClient } from '@/lib/supabase-server'

export type EditFacturaLoaderData = {
    factura: any
    items: any[]
    presupuestos: any[]
    error?: string
}

export async function getInvoiceForEdit(id: string): Promise<EditFacturaLoaderData | null> {
    try {
        // 1. Fetch Factura Base
        const { data: factura, error: facturaError } = await supabaseAdmin
            .from('facturas')
            .select('id, code, created_at, id_presupuesto, total')
            .eq('id', id)
            .single()

        if (facturaError || !factura) {
            console.error(`Error loader factura edit (${id}):`, facturaError?.message)
            return null
        }

        // 2. Fetch Items Factura
        const { data: itemsFactura, error: itemsError } = await supabaseAdmin
            .from('items_factura')
            .select('*')
            .eq('id_factura', id)
            .order('id', { ascending: true })

        if (itemsError) {
            console.error("Error items factura:", itemsError.message)
        }

        // 3. Fetch Presupuestos Aprobados (para el select)
        // Estado 4 = Aprobado (según lógica original)
        const { data: presupuestosRaw, error: presupuestosError } = await supabaseAdmin
            .from('presupuestos_finales')
            .select(`
        id,
        code,
        total,
        presupuestos_base (
          id,
          tareas (
            id,
            titulo,
            edificios (
              id,
              nombre,
              id_administrador
            )
          )
        )
      `)
            .eq('id_estado', 4)

        if (presupuestosError) {
            console.error("Error fetching presupuestos:", presupuestosError.message)
        }

        // 4. Formatear Presupuestos para el Select
        const presupuestosParaForm = (presupuestosRaw || []).map((p: any) => {
            const presupuesto_base = Array.isArray(p.presupuestos_base) ? p.presupuestos_base[0] : p.presupuestos_base
            const tarea = presupuesto_base ? (Array.isArray(presupuesto_base.tareas) ? presupuesto_base.tareas[0] : presupuesto_base.tareas) : null
            const edificio = tarea ? (Array.isArray(tarea.edificios) ? tarea.edificios[0] : tarea.edificios) : null

            return {
                id: String(p.id),
                code: p.code,
                titulo: tarea?.titulo || 'Sin título',
                monto_total: p.total,
                edificios: edificio ? { id: edificio.id, nombre: edificio.nombre, id_administrador: edificio.id_administrador } : null,
                estado: 'Aprobado'
            }
        })

        // 5. Asegurar que el presupuesto actual esté en la lista (si no está aprobado o cambio estado)
        if (factura.id_presupuesto) {
            const isPresupuestoActualEnLista = presupuestosParaForm.some((p: any) => p.id === String(factura.id_presupuesto))

            if (!isPresupuestoActualEnLista) {
                const { data: presupuestoActual } = await supabaseAdmin
                    .from('presupuestos_finales')
                    .select(`
            id,
            code,
            total,
            presupuestos_base (
              id,
              tareas (
                id,
                titulo,
                edificios (
                  id,
                  nombre,
                  id_administrador
                )
              )
            )
          `)
                    .eq('id', factura.id_presupuesto)
                    .single()

                if (presupuestoActual) {
                    const pb = Array.isArray(presupuestoActual.presupuestos_base) ? presupuestoActual.presupuestos_base[0] : presupuestoActual.presupuestos_base
                    const tarea = pb ? (Array.isArray(pb.tareas) ? pb.tareas[0] : pb.tareas) : null
                    const edificio = tarea ? (Array.isArray(tarea.edificios) ? tarea.edificios[0] : tarea.edificios) : null

                    presupuestosParaForm.push({
                        id: String(presupuestoActual.id),
                        code: presupuestoActual.code,
                        titulo: tarea?.titulo || 'Sin título',
                        monto_total: presupuestoActual.total,
                        edificios: edificio ? { id: edificio.id, nombre: edificio.nombre, id_administrador: edificio.id_administrador } : null,
                        estado: 'Actual'
                    })
                }
            }
        }

        return {
            factura,
            items: itemsFactura || [],
            presupuestos: presupuestosParaForm
        }

    } catch (error) {
        console.error("Error critico loader edit factura:", error)
        return null
    }
}
