'use server'

import { createClient } from "@supabase/supabase-js"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { revalidatePath } from "next/cache"

// Cliente Service Role
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
    id?: number // Si existe, es update
    id_presupuesto_base?: number
    id_tarea: number
    id_edificio?: number
    id_administrador?: string | number
    notas?: string
    items: ItemInput[]
}

export async function savePresupuestoFinal(data: PresupuestoFinalInput) {
    try {
        const { user, rol } = await validateSessionAndGetUser()

        // 1. RBAC: Solo Admin crea/edita (Segun plan)
        // User prompt: "manual RBAC: solo admin crea/edita finales. supervisor solo ve."
        if (rol !== 'admin') {
            return { success: false, error: "Solo administradores pueden crear o editar presupuestos finales" }
        }

        // 2. Calculo de Totales en Servidor (Security)
        let materiales = 0
        let mano_obra = 0
        let total = 0

        data.items.forEach(item => {
            const subtotal = Number(item.cantidad) * Number(item.precio)
            total += subtotal

            // Logica simple de clasificacion si no viene explicita (fallback algoritmico simple o booleano explicito)
            // Asumimos que el frontend manda 'es_material' si lo sabe, sino inferimos o tratamos todo como mano_obra si no es producto?
            // "seguridad de calculo: el servidor debe recalcular"
            // Vamos a respetar 'es_material' si viene, sino usar logica de negocio basica o default.

            if (item.es_material) {
                materiales += subtotal
            } else {
                mano_obra += subtotal
            }
        })

        // 3. Transaccion (Simulada o Real)
        // Supabase no soporta transacciones multi-tabla en client-js nativo facil, 
        // pero podemos usar RPC o hacerlo secuencial con rollback manual en caso de error critico.
        // Dado que es 'admin', secuencial suele ser aceptable si se maneja error.

        // A. Header
        let pfId = data.id
        const headerData = {
            id_tarea: data.id_tarea,
            id_presupuesto_base: data.id_presupuesto_base,
            id_edificio: data.id_edificio,
            id_administrador: data.id_administrador,
            notas: data.notas,
            materiales,
            mano_obra,
            total,
            // Mantener estado o setear default
            updated_at: new Date()
        }

        if (pfId) {
            // UPDATE
            const { error: updateError } = await supabaseAdmin
                .from('presupuestos_finales')
                .update(headerData)
                .eq('id', pfId)

            if (updateError) throw updateError
        } else {
            // CREATE
            const now = new Date()
            const code = `PF-${now.getTime().toString().slice(-6)}` // Generacion simple servidora

            const insertData = {
                ...headerData,
                code,
                estado: 'pendiente', // Default
                creado_por: user.id,
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

        if (!pfId) throw new Error("No se pudo obtener ID del presupuesto")

        // B. Items (Replace Strategy: Delete all + Insert all)
        // Mas seguro para consistencia total

        // Borrar anteriores (si es update)
        if (data.id) {
            const { error: deleteError } = await supabaseAdmin
                .from('items')
                .delete()
                .eq('id_presupuesto', pfId)

            if (deleteError) throw deleteError
        }

        // Insertar nuevos
        if (data.items.length > 0) {
            const itemsToInsert = data.items.map(item => ({
                id_presupuesto: pfId, // FK
                descripcion: item.descripcion,
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
        revalidatePath(`/dashboard/presupuestos-finales/${pfId}`)
        return { success: true, id: pfId }

    } catch (error: any) {
        console.error("Error saving presupuesto final:", error)
        return { success: false, error: error.message || "Error al guardar presupuesto final" }
    }
}
