import { supabaseAdmin } from "@/lib/supabase-admin"

export async function getPresupuestoById(id: string) {
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
        return { ...presupuestoFinal, tipo: "final" }
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
        return { ...presupuestoBase, tipo: "base" }
    }

    return null
}
