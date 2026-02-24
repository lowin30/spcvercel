import { createServerClient } from '@/lib/supabase-server'

export interface CandidateTaskDTO {
    id: number // ID del Presupuesto Base
    code: string
    id_tarea: number
    total: number
    aprobado: boolean
    titulo_tarea: string
    id_supervisor: string | null
    email_supervisor: string | null
    finalizada: boolean
}

export async function getCandidateTasks(userId: string, role: string): Promise<CandidateTaskDTO[]> {
    // 1. Obtener Presupuestos Base candidatos (Aprobados + Tarea Finalizada)
    const { data: presupuestosData, error: pbError } = await supabaseAdmin
        .from('presupuestos_base')
        .select(`
      id,
      code,
      id_tarea,
      total,
      aprobado,
      tareas!inner (
        id, 
        titulo, 
        finalizada, 
        id_estado_nuevo
      )
    `)
        .eq('aprobado', true)
        .eq('tareas.finalizada', true)
        .order('total', { ascending: false })

    if (pbError) {
        console.error("Error fetching candidate tasks:", pbError)
        throw new Error("Error al buscar tareas para liquidar")
    }

    if (!presupuestosData || presupuestosData.length === 0) {
        return []
    }

    // 2. Filtrar ya liquidadas
    const taskIds = presupuestosData.map(p => p.id_tarea).filter(Boolean)
    let liquidadas = new Set<number>()

    if (taskIds.length > 0) {
        const { data: liqs } = await supabaseAdmin
            .from('liquidaciones_nuevas')
            .select('id_tarea')
            .in('id_tarea', taskIds)

        if (liqs) {
            liqs.forEach((l: any) => liquidadas.add(l.id_tarea))
        }
    }

    // 3. Filtrar Presupuestos Finales Rechazados
    // (Si el PF fue rechazado, la tarea aunque finalizada no se debería liquidar)
    let tareasRechazadas = new Set<number>()
    if (taskIds.length > 0) {
        // Buscar ID estado rechazado
        const { data: estRechazado } = await supabaseAdmin
            .from('estados_presupuestos')
            .select('id')
            .eq('codigo', 'rechazado')
            .single()

        if (estRechazado) {
            const { data: pfRechazados } = await supabaseAdmin
                .from('presupuestos_finales')
                .select('id_tarea')
                .in('id_tarea', taskIds)
                .eq('id_estado', estRechazado.id)

            if (pfRechazados) {
                pfRechazados.forEach((pf: any) => tareasRechazadas.add(pf.id_tarea))
            }
        }
    }

    // 4. Enriquecer con Supervisor
    // Esto es costoso N+1 pero necesario si no hacemos JOIN complejo. 
    // Optimizacion: Traer todos los supervisores_tareas para estos IDs de una vez.
    let mapSupervisor = new Map<number, { id: string, email: string }>()
    if (taskIds.length > 0) {
        const { data: relSup } = await supabaseAdmin
            .from('supervisores_tareas')
            .select('id_tarea, id_supervisor, usuarios!inner(email)')
            .in('id_tarea', taskIds)
        // Ordenar por created_at desc para tomar el ultimo si hay varios?
        // SQL no garantiza orden en IN, pero podemos asumir logica de negocio simple.

        if (relSup) {
            // Llenar mapa. Si hay duplicados, el ultimo gana o podriamos mejorar la query.
            // En este caso simple, asumimos 1 supervisor activo por tarea o tomamos cualquiera.
            relSup.forEach((r: any) => {
                if (r.id_supervisor) {
                    mapSupervisor.set(r.id_tarea, {
                        id: r.id_supervisor,
                        email: r.usuarios?.email || 'N/A'
                    })
                }
            })
        }
    }

    // 5. Construir lista final filtrada
    const candidates: CandidateTaskDTO[] = []

    for (const p of presupuestosData) {
        const idTarea = p.id_tarea
        if (liquidadas.has(idTarea)) continue
        if (tareasRechazadas.has(idTarea)) continue

        const sup = mapSupervisor.get(idTarea)

        // FILTRO DE ROL
        if (role === 'supervisor') {
            // Si yo soy supervisor, la tarea debe ser mia
            if (sup?.id !== userId) continue
        }

        // Mapear a DTO
        candidates.push({
            id: p.id,
            code: p.code,
            id_tarea: p.id_tarea,
            total: p.total,
            aprobado: p.aprobado,
            titulo_tarea: (p.tareas as any)?.titulo || 'Sin Título',
            finalizada: (p.tareas as any)?.finalizada,
            id_supervisor: sup?.id || null,
            email_supervisor: sup?.email || null
        })
    }

    return candidates
}

export async function getSupervisores() {
    const { data, error } = await supabaseAdmin
        .from('usuarios')
        .select('id, email')
        .eq('rol', 'supervisor')
        .order('email')

    if (error) return []
    return data
}
