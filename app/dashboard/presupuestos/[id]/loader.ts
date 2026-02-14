import { supabaseAdmin } from "@/lib/supabase-admin"

export type PresupuestoLoaderData = {
    id: number
    code?: string
    tipo: "final" | "base"
    total: number
    materiales: number
    mano_obra: number
    observaciones?: string
    nota_pb?: string
    id_padre?: number
    estados_presupuestos: {
        id: number
        nombre: string
        color: string
        codigo: string
    } | null
    tareas: {
        id: number
        titulo: string
        descripcion: string
        edificios: {
            id: number
            nombre: string
        } | null
    } | null
}

export async function getPresupuestoById(id: string): Promise<PresupuestoLoaderData | null> {
    // 1. Estrategia de carga unificada (Final -> Base) usando Service Role (bypass RLS)

    // Intento 1: Presupuesto Final
    const { data: presupuestoFinal } = await supabaseAdmin
        .from("presupuestos_finales")
        .select(`
      *,
      estados_presupuestos:id_estado (id, nombre, color, codigo),
      tareas:id_tarea (id, titulo, descripcion, edificios:id_edificio (id, nombre))
    `)
        .eq("id", id)
        .single()

    if (presupuestoFinal) {
        return {
            ...presupuestoFinal,
            tipo: "final",
            // Normalizar code si viene como codigo
            code: presupuestoFinal.code || presupuestoFinal.codigo
        }
    }

    // Intento 2: Presupuesto Base
    const { data: presupuestoBase } = await supabaseAdmin
        .from("presupuestos_base")
        .select(`
       *,
       tareas:id_tarea (id, titulo, descripcion, edificios:id_edificio (id, nombre))
     `)
        .eq("id", id)
        .single()

    if (presupuestoBase) {
        // Presupuestos base no suelen tener estado, pero si lo tienen, lo mapeamos.
        // Si no, devolvemos null o un estado default.
        // El componente espera estados_presupuestos?.codigo
        return {
            ...presupuestoBase,
            tipo: "base",
            // Normalizar code
            code: presupuestoBase.code || presupuestoBase.codigo,
            estados_presupuestos: null
        }
    }

    return null
}
