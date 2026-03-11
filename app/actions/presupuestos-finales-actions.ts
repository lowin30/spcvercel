'use server'

import { createClient } from "@supabase/supabase-js"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { revalidatePath } from "next/cache"
import { sanitizeText } from "@/lib/utils"

// cliente service role
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

interface ItemInput {
    descripcion: string
    cantidad: number
    precio: number
    producto_id?: string
    es_material?: boolean
}

interface PresupuestoFinalInput {
    id?: number // si existe, es update
    id_presupuesto_base?: number
    id_tarea: number
    id_edificio?: number
    id_administrador?: string | number
    notas?: string
    observaciones_admin?: string
    items: ItemInput[]
}

/**
 * guardar presupuesto final (modo dios platinum)
 */
export async function savePresupuestoFinal(data: PresupuestoFinalInput) {
    try {
        const { id: userId, rol } = await validateSessionAndGetUser()

        // 1. rbac: solo admin crea/edita finales
        if (rol !== 'admin') {
            return { success: false, error: "solo administradores pueden crear o editar presupuestos finales" }
        }

        // 2. calculo de totales en servidor (security)
        let materiales = 0
        let mano_obra = 0
        let total = 0

        data.items.forEach(item => {
            const subtotal = Number(item.cantidad) * Number(item.precio)
            total += subtotal

            if (item.es_material) {
                materiales += subtotal
            } else {
                mano_obra += subtotal
            }
        })

        // 3. transaccion secuencial
        // a. header
        let pfId = data.id
        const headerData = {
            id_tarea: data.id_tarea,
            id_presupuesto_base: data.id_presupuesto_base,
            id_edificio: data.id_edificio,
            id_administrador: data.id_administrador,
            observaciones_admin: data.observaciones_admin || data.notas || null,
            materiales,
            mano_obra,
            total,
            updated_at: new Date()
        }

        if (pfId) {
            // update
            const { error: updateError } = await supabaseAdmin
                .from('presupuestos_finales')
                .update(headerData)
                .eq('id', pfId)

            if (updateError) throw updateError
        } else {
            // create
            const now = new Date()
            const code = `pf-${now.getTime().toString().slice(-6)}`

            const insertData = {
                ...headerData,
                code,
                estado: 'pendiente',
                creado_por: userId,
                created_at: now
            }

            const { data: newPF, error: insertError } = await supabaseAdmin
                .from('presupuestos_finales')
                .insert(insertData)
                .select()
                .single()

            if (insertError) throw insertError
            pfId = newPF.id
        }

        if (!pfId) throw new Error("no se pudo obtener id del presupuesto")

        // b. items (blindaje gold standard v81.0)
        // borrar anteriores si es update
        if (data.id) {
            const { error: deleteError } = await supabaseAdmin
                .from('items')
                .delete()
                .eq('id_presupuesto', pfId)

            if (deleteError) throw deleteError
        }

        // insertar nuevos con sanitizacion estricta
        if (data.items.length > 0) {
            const itemsToInsert = data.items.map(item => ({
                id_presupuesto: pfId,
                descripcion: sanitizeText(item.descripcion).toLowerCase(),
                cantidad: item.cantidad,
                precio: item.precio,
                es_material: item.es_material || false,
                producto_id: item.producto_id || null
            }))

            const { error: itemsError } = await supabaseAdmin
                .from('items')
                .insert(itemsToInsert)

            if (itemsError) throw itemsError
        }

        revalidatePath('/dashboard/presupuestos-finales')
        revalidatePath(`/dashboard/tareas/${data.id_tarea}`)
        return { success: true, id: pfId }

    } catch (error: any) {
        console.error("error saving presupuesto final:", error)
        return { success: false, error: error.message || "error al guardar presupuesto final" }
    }
}
