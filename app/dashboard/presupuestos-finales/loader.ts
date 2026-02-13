import { createClient } from "@supabase/supabase-js"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"

// Cliente Service Role para bypass de RLS (Manual RBAC)
// "el servidor debe recalcular ... no confies en el total que mande el cliente"
// por lo tanto usamos service role para garantizar lecturas y escrituras autorizadas
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

export async function getPresupuestosFinales(rol: string, userId: string) {
    // 1. Validacion de Seguridad (Manual RBAC)
    // Admin ve todo
    // Supervisor ve solo lo suyo (si aplica?)
    // Segun "CORREGIR-SEGURIDAD-PRESUPUESTOS-FINALES-URGENTE.sql": "Solo admin puede leer presupuestos finales"
    // Pero en la app real, supervisores quizas necesiten ver?
    // User request: "manual RBAC: solo admin crea/edita finales. supervisor solo ve."

    if (rol === 'trabajador') {
        return [] // Trabajadores no ven
    }

    let query = supabaseAdmin
        .from('presupuestos_finales')
        .select(`
            *,
            tareas!id_tarea(
                id,
                titulo,
                code,
                id_edificio,
                edificios(nombre)
            ),
            presupuestos_base(
                id,
                code
            )
        `)
        .order('created_at', { ascending: false })

    // Filtrado por Rol
    if (rol === 'supervisor') {
        // Si el supervisor debe ver solo sus tareas:
        // Necesitamos filtrar por tareas.id_supervisor = userId
        // Esto requiere un !inner join si filtramos por columna de relacion
        query = supabaseAdmin
            .from('presupuestos_finales')
            .select(`
                *,
                tareas!inner(
                    id,
                    titulo,
                    code,
                    id_edificio,
                    id_supervisor,
                    edificios(nombre)
                ),
                presupuestos_base(
                    id,
                    code
                )
            `)
            .eq('tareas.id_supervisor', userId)
            .order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
        console.error("Error fetching presupuestos finales:", error)
        throw new Error("No se pudieron cargar los presupuestos finales")
    }

    return data || []
}

export async function getPresupuestoFinalConItems(id: number) {
    const user = await validateSessionAndGetUser()
    const { rol } = user

    if (rol !== 'admin' && rol !== 'supervisor') {
        return null
    }

    // Consulta principal: Presupuesto Final
    const { data: pf, error: pfError } = await supabaseAdmin
        .from('presupuestos_finales')
        .select(`
            *,
            tareas(
                id,
                titulo,
                code,
                id_edificio,
                edificios(nombre)
            )
        `)
        .eq('id', id)
        .single()

    if (pfError || !pf) {
        console.error("Error fetching presupuesto final header:", pfError)
        return null
    }

    // Validacion Supervisor (Manual RBAC)
    if (rol === 'supervisor') {
        // Verificar si la tarea pertenece al supervisor
        // Nota: 'tareas' puede ser null si se borró la tarea, pero es required FK.
        // Si usamos 'tareas(id_supervisor)' arriba podriamos chequearlo directo.
        // Hacemos fetch extra si es necesario o confiamos en la query initial si trajo id_supervisor.
        // Vamos a re-verificar por seguridad.
        const { data: tarea } = await supabaseAdmin
            .from('tareas')
            .select('id_supervisor')
            .eq('id', pf.id_tarea)
            .single()

        if (!tarea || tarea.id_supervisor !== user.id) {
            return null // No autorizado
        }
    }

    // Consulta Secundaria: Items (Items Bridge)
    // "hacer un join o query secundario a items filtrando estrictamente por id_presupuesto_final"
    // Asumimos columna 'id_presupuesto' basado en analisis previo.
    const { data: items, error: itemsError } = await supabaseAdmin
        .from('items')
        .select('*')
        .eq('id_presupuesto', id) // Usamos id_presupuesto como FK a presupuestos_finales

    if (itemsError) {
        console.error("Error fetching items for presupuesto final:", itemsError)
        // Retornamos PF sin items? O fallamos? Mejor fallar o retornar array vacio.
        return { ...pf, items: [] }
    }

    return { ...pf, items: items || [] }
}
