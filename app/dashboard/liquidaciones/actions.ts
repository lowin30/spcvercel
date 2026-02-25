'use server'

import { createServerClient } from '@/lib/supabase-server'
import { revalidatePath } from "next/cache"

export type CreateLiquidacionState = {
    success: boolean
    message: string
    data?: any
}

export async function createLiquidacionAction(prevState: any, formData: FormData): Promise<CreateLiquidacionState> {
    const supabase = await createServerClient()
    const rawData = Object.fromEntries(formData.entries())

    // Parse numeric fields safely
    const parseNumber = (key: string) => {
        const val = rawData[key]
        return val ? Number(val) : 0
    }

    const parseBoolean = (key: string) => rawData[key] === 'true'

    const payload = {
        id_presupuesto_base: parseNumber('id_presupuesto_base'),
        id_tarea: parseNumber('id_tarea'),
        id_usuario_admin: rawData.id_usuario_admin as string,
        id_usuario_supervisor: rawData.id_usuario_supervisor as string,
        gastos_reales: parseNumber('gastos_reales'),
        ganancia_neta: parseNumber('ganancia_neta'),
        ganancia_supervisor: parseNumber('ganancia_supervisor'),
        ganancia_admin: parseNumber('ganancia_admin'),
        total_supervisor: parseNumber('total_supervisor'),
        code: rawData.code as string,
        total_base: parseNumber('total_base'),
        ajuste_admin: parseNumber('ajuste_admin'),
        id_factura: null,
        sobrecosto: parseBoolean('sobrecosto'),
        monto_sobrecosto: parseNumber('monto_sobrecosto'),
        sobrecosto_supervisor: parseNumber('sobrecosto_supervisor'),
        sobrecosto_admin: parseNumber('sobrecosto_admin')
    }

    try {
        // 1. Insertar usando el cliente de servidor (Sujeto a RLS si se configuró, o bypass controlado por rol en app)
        const { data, error } = await supabase
            .from('liquidaciones_nuevas')
            .insert(payload)
            .select('id')
            .single()

        if (error) {
            console.error("Error Server Action createLiquidacion:", error)
            return { success: false, message: `Error BD: ${error.message}` }
        }

        // 2. Ejecutar RPC de liquidación de gastos
        const { error: rpcError } = await supabase.rpc('liquidar_gastos_supervision', {
            p_id_tarea: payload.id_tarea,
            p_id_liquidacion: data.id
        })

        if (rpcError) {
            console.error("Error RPC liquidar_gastos_supervision:", rpcError)
            return {
                success: true,
                message: "Liquidación creada, pero hubo error al marcar gastos como liquidados.",
                data
            }
        }

        revalidatePath('/dashboard/liquidaciones')
        return { success: true, message: "Liquidación creada con éxito", data }

    } catch (e: any) {
        console.error("Exception createLiquidacionAction:", e)
        return { success: false, message: `Error del servidor: ${e.message}` }
    }
}
