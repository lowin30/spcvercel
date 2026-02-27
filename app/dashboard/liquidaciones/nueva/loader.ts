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
    es_propietario: boolean
}

export async function getCandidateTasks(userId: string, role: string): Promise<CandidateTaskDTO[]> {
    const supabase = await createServerClient()
    // 1. Obtener Presupuestos Base candidatos (Aprobados + Tarea Finalizada)
    const { data: presupuestosData, error: pbError } = await supabase
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
        const { data: liqs } = await supabase
            .from('liquidaciones_nuevas')
            .select('id_tarea')
            .in('id_tarea', taskIds)

        if (liqs) {
            liqs.forEach((l: any) => liquidadas.add(l.id_tarea))
        }
    }

    // 3. Filtrar Presupuestos Finales Rechazados
    let tareasRechazadas = new Set<number>()
    if (taskIds.length > 0) {
        const { data: estRechazado } = await supabase
            .from('estados_presupuestos')
            .select('id')
            .eq('codigo', 'rechazado')
            .single()

        if (estRechazado) {
            const { data: pfRechazados } = await supabase
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
    let mapSupervisor = new Map<number, { id: string, email: string }>()
    if (taskIds.length > 0) {
        const { data: relSup } = await supabase
            .from('supervisores_tareas')
            .select('id_tarea, id_supervisor, usuarios!inner(email, es_propietario)')
            .in('id_tarea', taskIds)

        if (relSup) {
            relSup.forEach((r: any) => {
                if (r.id_supervisor) {
                    mapSupervisor.set(r.id_tarea, {
                        id: r.id_supervisor,
                        email: r.usuarios?.email || 'N/A',
                        es_propietario: r.usuarios?.es_propietario || false
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
            if (sup?.id !== userId) continue
        }

        candidates.push({
            id: p.id,
            code: p.code,
            id_tarea: p.id_tarea,
            total: p.total,
            aprobado: p.aprobado,
            titulo_tarea: (p.tareas as any)?.titulo || 'Sin Título',
            finalizada: (p.tareas as any)?.finalizada,
            id_supervisor: sup?.id || null,
            email_supervisor: sup?.email || null,
            es_propietario: sup?.es_propietario || false
        })
    }

    return candidates
}

export async function getSupervisores() {
    const supabase = await createServerClient()
    const { data, error } = await supabase
        .from('usuarios')
        .select('id, email')
        .eq('rol', 'supervisor')
        .order('email')

    if (error) return []
    return data
}

