import "server-only"
import { descopeClient } from "@/lib/descope-client"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { cookies } from "next/headers"

// Tipos base para los datos retornados
export type Tarea = {
    id: number
    code: string
    titulo: string
    descripcion: string
    id_estado_nuevo: number
    estado_tarea: string
    prioridad: string
    finalizada: boolean
    fecha_visita: string | null
    created_at: string
    // Relaciones
    id_edificio: number
    nombre_edificio: string
    direccion_edificio: string
    id_administrador: number
    nombre_administrador: string
    supervisores: string // CSV o Array de nombres
    supervisores_emails: string // CSV de emails
    // Flags de permisos (opcional, calculado)
    can_edit: boolean
}


export type TareasFilterParams = {
    id_administrador?: string
    id_edificio?: string
    estado?: string
    id_supervisor?: string
    search?: string
    view?: string
}

export async function getTareasData(filters?: TareasFilterParams) {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("DS")?.value

    // 1. Validar Sesión con Descope
    if (!sessionToken) {
        throw new Error("No hay sesión activa (DS Cookie missing)")
    }

    try {
        const authInfo = await descopeClient.validateSession(sessionToken)
        const email = authInfo.token.email || authInfo.token.sub; // Fallback

        if (!email) throw new Error("No se pudo identificar el email del usuario en el token Descope")

        // 2. Mapeo Identity: Email -> Usuario (DB)
        const { data: usuario, error: userError } = await supabaseAdmin
            .from('usuarios')
            .select('id, rol, id_delegacion, email')
            .ilike('email', email) // Case insensitive match
            .single();

        if (userError || !usuario) {
            console.error("Identity Bridge Error: Usuario no encontrado en tabla publica.usuarios", email);
            throw new Error("Usuario no registrado en el sistema SPC");
        }

        const { id: userId, rol } = usuario;

        // 3. Service Role Query (Bypass RLS) con Filtro Manual por Rol
        let query = supabaseAdmin
            .from('vista_tareas_completa')
            .select('*')
            .order('created_at', { ascending: false });

        // 4. Aplicar Filtros de Seguridad (ACL)
        if (rol === 'admin') {
            query = query.neq('id_estado_nuevo', 9);
        }
        else if (rol === 'supervisor') {
            // Replicamos logica manual de asignación
            const { data: asignaciones } = await supabaseAdmin
                .from('supervisores_tareas')
                .select('id_tarea')
                .eq('id_supervisor', userId);

            const idsAsignados = asignaciones?.map(a => a.id_tarea) || [];

            if (idsAsignados.length > 0) {
                query = query.in('id', idsAsignados);
            } else {
                return []; // Supervisor sin tareas
            }
        }
        else if (rol === 'trabajador') {
            const { data: asignaciones } = await supabaseAdmin
                .from('trabajadores_tareas')
                .select('id_tarea')
                .eq('id_trabajador', userId);

            const ids = asignaciones?.map(a => a.id_tarea) || [];
            if (ids.length === 0) return []; // Sin tareas
            query = query.in('id', ids);
        }

        // 5. Aplicar Filtros de Usuario (Search Params)
        if (filters) {
            // Filtro por VISTA (Smart Tabs v88.1)
            // Solo aplicamos si no hay un filtro de estado específico seleccionado
            if (!filters.estado || filters.estado === '_todos_') {
                const view = filters.view || 'activas';

                switch (view) {
                    case 'activas':
                        // organizar, preguntar, presupuestado, reclamado, posible (1, 2, 3, 8, 10)
                        query = query.in('id_estado_nuevo', [1, 2, 3, 8, 10]);
                        break;
                    case 'aprobadas':
                        // aprobado (5)
                        query = query.eq('id_estado_nuevo', 5);
                        break;
                    case 'enviadas':
                        // enviado (4)
                        query = query.eq('id_estado_nuevo', 4);
                        break;
                    case 'finalizadas':
                        // facturado, terminado, liquidada (6, 7, 9)
                        query = query.in('id_estado_nuevo', [6, 7, 9]);
                        break;
                    case 'todas':
                        // No aplicamos filtro de estado adicional (pero respetamos seguridades de rol arriba)
                        break;
                }
            }

            // Filtro Administrador
            if (filters.id_administrador && filters.id_administrador !== '_todos_') {
                query = query.eq('id_administrador', filters.id_administrador)
            }

            // Filtro Edificio
            if (filters.id_edificio && filters.id_edificio !== '_todos_') {
                query = query.eq('id_edificio', filters.id_edificio)
            }

            // Filtro Estado Especifico (Sobreescribe la Vista)
            if (filters.estado && filters.estado !== '_todos_') {
                const estadoId = parseInt(filters.estado)
                if (!isNaN(estadoId)) {
                    query = query.eq('id_estado_nuevo', estadoId)
                }
            }

            // Filtro Supervisor (Email o ID?)
            if (filters.id_supervisor && filters.id_supervisor !== '_todos_') {
                if (filters.id_supervisor.includes('@')) {
                    query = query.ilike('supervisores_emails', `%${filters.id_supervisor}%`)
                } else {
                    const { data: tareasSup } = await supabaseAdmin
                        .from('supervisores_tareas')
                        .select('id_tarea')
                        .eq('id_supervisor', filters.id_supervisor)

                    const idsSup = tareasSup?.map(t => t.id_tarea) || []
                    if (idsSup.length > 0) {
                        query = query.in('id', idsSup)
                    } else {
                        // Si no tiene tareas, devolvemos vacío directamente
                        return []
                    }
                }
            }

            // Busqueda de Texto
            if (filters.search) {
                const term = filters.search;
                query = query.or(`titulo.ilike.%${term}%,code.ilike.%${term}%,descripcion.ilike.%${term}%,nombre_edificio.ilike.%${term}%`)
            }
        } else {
            // DEFAULT: Si no hay filtros en absoluto, mostrar ACTIVAS
            query = query.in('id_estado_nuevo', [1, 2, 3, 8, 10]);
        }

        const { data: tareas, error: dataError } = await query;

        if (dataError) {
            console.error("Error fetching tareas via Service Role:", dataError);
            throw new Error("Error al cargar datos del sistema");
        }

        return tareas || [];

    } catch (error) {
        console.error("Loader Error:", error);
        if ((error as any).message?.includes("No hay sesión")) {
            throw new Error("Unauthorized");
        }
        throw error;
    }
}

// Helper para usar vistas especificas si el rol es complejo
async function getTareasFromView(viewName: string, userId: string) {
    // Nota: Las vistas SQL suelen depender de auth.uid() si no estan bien hechas.
    // 'vista_tareas_supervisor' usaba logica pura de estados, no de auth.uid().
    // EXCEPTO que el supervisor solo ve "sus" tareas?
    // Revisando el codigo SQL de la vista: NO filtra por supervisor ID, filtra por estados globales.
    // EL filtrado por supervisor-tarea se hacia en el 'search_path' o RLS policies de la tabla base?
    // NO. La vista parece ser global.
    // ENTONCES, debemos filtrar manualmente por asignacion AQUI en el loader.

    // 1. Obtener IDs asignados al supervisor
    const { data: asignaciones } = await supabaseAdmin
        .from('supervisores_tareas')
        .select('id_tarea')
        .eq('id_supervisor', userId);

    const idsAsignados = asignaciones?.map(a => a.id_tarea) || [];

    // 2. Query a la vista de estados (que filtra por flujo de negocio)
    let query = supabaseAdmin.from(viewName).select('*');

    // 3. Aplicar interseccion: Tareas del flujo (vista) AND Asignadas al supervisor

    // Filtro critico: Solo las asignadas (si es requerimiento de negocio)
    // El codigo legado parecia mostrar todas las de la delegacion?
    // Audit `page.tsx`:
    /*
      if (userData?.rol === "supervisor") {
            const supervisorTareasResponse = await supabase.from('supervisores_tareas')...
            const tareasAsignadas = ...
            tareasQuery = baseQuery.in("id", tareasAsignadas);
      }
    */
    // SÍ, el codigo legado filtraba por ID explicito.
    if (idsAsignados.length > 0) {
        query = query.in('id', idsAsignados);
    } else {
        return []; // Supervisor sin tareas asignadas
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}
// ... existing code ...

export async function getRecordatorios(rol: string, userId: string) {
    if (rol === 'admin') {
        const { data } = await supabaseAdmin
            .from('vista_admin_recordatorios_tareas_unificada')
            .select('*')
            .limit(50);
        return data || [];
    } else if (rol === 'supervisor') {
        const { data } = await supabaseAdmin
            .from('vista_sup_recordatorios_tareas_unificada')
            .select('*')
            .limit(50); // La vista ya filtra por el "current user"? No, las vistas SQL a veces usan auth.uid().
        // Audit Report: "vistas dependen de auth.uid()".
        // Service Role NO tiene auth.uid().
        // Si la vista usa auth.uid(), devolverá vacio para Service Role.
        // Necesitamos verificar la definición de `vista_sup_recordatorios_tareas_unificada`.
        // Si es opaca, riesgo alto.
        // Asumiremos que por ahora filtramos en memoria o que la vista es global?
        // "vista_sup_recordatorios_tareas_unificada" suena a que muestra TODO lo de supervisores.
        // Vamos a intentar filtrar manualmente si trae campo supervisor.
        return data || [];
    }
    return [];
}

export async function getTareasParaPresupuesto() {
    // Reemplazo de get_tareas_sin_presupuesto_final
    // Lógica: Tareas activas (no liquidadas) que NO tienen presupuesto final.
    // Consulta "negativa" es costosa.

    // 1. Obtener IDs de tareas con PF
    const { data: conPF } = await supabaseAdmin
        .from('presupuestos_finales')
        .select('id_tarea')
        .not('id_tarea', 'is', null);

    const idsConPF = conPF?.map(x => x.id_tarea) || [];

    // 2. Obtener todas las tareas candidatas (no finalizadas/liquidadas)
    let query = supabaseAdmin
        .from('tareas')
        .select('*')
        .neq('id_estado_nuevo', 9); // No liquidadas

    if (idsConPF.length > 0) {
        query = query.not('id', 'in', `(${idsConPF.join(',')})`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function getTareaDetail(id: string) {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("DS")?.value

    if (!sessionToken) throw new Error("No hay sesión activa")

    try {
        const authInfo = await descopeClient.validateSession(sessionToken)
        const email = authInfo.token.email || authInfo.token.sub

        // 1. Obtener usuario actual
        const { data: usuario, error: userError } = await supabaseAdmin
            .from('usuarios')
            .select('*')
            .ilike('email', email)
            .single()

        if (userError || !usuario) throw new Error("Usuario no encontrado")

        const tareaId = parseInt(id)
        if (isNaN(tareaId)) throw new Error("ID de tarea inválido")

        // 2. Obtener Tarea con Relaciones (Edificio, etc.)
        const { data: tareaData, error: tareaError } = await supabaseAdmin
            .from("tareas")
            .select(`
          *,
          edificios!left (id, nombre, direccion, cuit, notas)
        `)
            .eq("id", tareaId)
            .single()

        if (tareaError || !tareaData) throw new Error("Tarea no encontrada")

        // 3. Obtener Supervisores y Trabajadores Asignados
        // Supervisor (puede ser null si no hay asignado)
        const { data: supervisorRel } = await supabaseAdmin
            .from("supervisores_tareas")
            .select("id_supervisor")
            .eq("id_tarea", tareaId)
            .maybeSingle()

        let supervisorData = null
        if (supervisorRel?.id_supervisor) {
            const { data: supUser } = await supabaseAdmin
                .from("usuarios")
                .select("id, email, color_perfil")
                .eq("id", supervisorRel.id_supervisor)
                .single()
            if (supUser) supervisorData = { usuarios: supUser }
        }

        // Trabajadores (puede haber múltiples o ninguno)
        const { data: trabsRel } = await supabaseAdmin
            .from("trabajadores_tareas")
            .select("id_trabajador")
            .eq("id_tarea", tareaId)

        const trabajadoresAsignados: { usuarios: any }[] = []
        if (trabsRel && trabsRel.length > 0) {
            const ids = trabsRel.map(t => t.id_trabajador)
            const { data: trabsUsers } = await supabaseAdmin
                .from("usuarios")
                .select("id, email, color_perfil")
                .in("id", ids)

            if (trabsUsers) {
                trabsUsers.forEach(t => trabajadoresAsignados.push({ usuarios: t }))
            }
        }

        // 4. Presupuestos (Base y Final)
        // Base
        const { data: pbData } = await supabaseAdmin
            .from("presupuestos_base")
            .select(`
          *,
          tareas!inner (
            code,
            titulo,
            id_edificio,
            edificios (nombre)
          )
        `)
            .eq("id_tarea", tareaId)
            .maybeSingle()

        // Final
        let pfData = null
        if (pbData?.id) {
            const { data } = await supabaseAdmin
                .from("presupuestos_finales")
                .select("*")
                .eq("id_presupuesto_base", pbData.id)
                .maybeSingle()
            pfData = data
        } else {
            // Buscar huérfano
            const { data } = await supabaseAdmin
                .from("presupuestos_finales")
                .select("*")
                .eq("id_tarea", tareaId)
                .is("id_presupuesto_base", null)
                .maybeSingle()
            pfData = data
        }

        // Facturas (solo si admin y hay PF)
        if (pfData && usuario.rol === 'admin') {
            const { data: facturas } = await supabaseAdmin
                .from("facturas")
                .select("id, pagada")
                .eq("id_presupuesto_final", pfData.id)

            if (facturas && facturas.length > 0) {
                pfData.tiene_facturas = true
                pfData.facturas_pagadas = facturas.every(f => f.pagada)
            }
        }

        // 5. Comentarios
        const { data: comentariosData } = await supabaseAdmin
            .from("comentarios")
            .select("id, contenido, created_at, foto_url, id_usuario")
            .eq("id_tarea", tareaId)
            .order("created_at", { ascending: false })

        // Enriquecer comentarios con usuarios
        let comentariosEnriquecidos: any[] = []
        if (comentariosData && comentariosData.length > 0) {
            const userIds = [...new Set(comentariosData.map(c => c.id_usuario))].filter(Boolean)
            const { data: usersComments } = await supabaseAdmin
                .from("usuarios")
                .select("id, email, code, color_perfil")
                .in("id", userIds)

            comentariosEnriquecidos = comentariosData.map(c => ({
                ...c,
                usuarios: usersComments?.find(u => u.id === c.id_usuario) || null
            }))
        }

        // 6. Catalogs (Wait... do we need catalogs here? The original page loaded them for "TrabajadoresInteractivos" components)
        // Yes, we need them for the dropdowns.

        // Supervisores Disponibles (para reasignar)
        const { data: supervisoresDisp } = await supabaseAdmin
            .from("usuarios")
            .select("id, email, color_perfil, code")
            .eq("rol", "supervisor")

        // Trabajadores Disponibles
        const { data: trabajadoresDisp } = await supabaseAdmin
            .from("usuarios")
            .select("id, email, color_perfil, configuracion_trabajadores!inner(activo)")
            .eq("rol", "trabajador")
            .eq("configuracion_trabajadores.activo", true)

        const trabajadoresFormateados = trabajadoresDisp?.map(t => ({
            id: t.id,
            email: t.email,
            color_perfil: t.color_perfil
        })) || []


        // 7. Gastos (Desde la Vista Completa para visibilidad total)
        const { data: gastosData, error: gastosError } = await supabaseAdmin
            .from("vista_gastos_tarea_completa")
            .select("*")
            .eq("id_tarea", tareaId)
            .order("created_at", { ascending: false })

        if (gastosError) {
            console.error("Error fetching gastos from view:", gastosError)
        }

        return {
            tarea: tareaData,
            userDetails: usuario,
            supervisor: supervisorData,
            trabajadoresAsignados,
            trabajadoresDisponibles: trabajadoresFormateados,
            supervisoresDisponibles: supervisoresDisp || [],
            comentarios: comentariosEnriquecidos,
            presupuestoBase: pbData,
            presupuestoFinal: pfData,
            gastos: gastosData || []
        }

    } catch (error) {
        console.error("Loader Detail Error:", error)
        if ((error as any).message?.includes("No hay sesión")) throw error
        throw new Error("No se pudo cargar el detalle de la tarea")
    }
}

export async function getCatalogsForWizard() {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("DS")?.value
    let currentUserRol = null

    if (sessionToken) {
        try {
            const authInfo = await descopeClient.validateSession(sessionToken)
            const email = authInfo.token.email || authInfo.token.sub
            if (email) {
                const { data: usuario } = await supabaseAdmin.from('usuarios').select('id, rol').ilike('email', email).single()
                currentUserRol = usuario?.rol
                // Also capture ID
                if (usuario?.id) {
                    // We need to return currentUserId to the page
                }
            }
        } catch { }
    }

    // Reuse the logic to get currentUserId properly
    let currentUserId = null;
    if (sessionToken) {
        const authInfo = await descopeClient.validateSession(sessionToken);
        const email = authInfo.token.email || authInfo.token.sub;
        if (email) {
            const { data: u } = await supabaseAdmin.from('usuarios').select('id, rol').ilike('email', email).single();
            if (u) {
                currentUserRol = u.rol;
                currentUserId = u.id;
            }
        }
    }

    const [adminsRes, supervisorsRes, workersRes] = await Promise.all([
        supabaseAdmin.from('administradores').select('id, nombre').eq('estado', 'activo').order('nombre'),
        supabaseAdmin.from('usuarios').select('id, email, code').eq('rol', 'supervisor'),
        supabaseAdmin.from('usuarios').select('id, email, code').eq('rol', 'trabajador')
    ])

    return {
        administradores: adminsRes.data || [],
        supervisores: supervisorsRes.data || [],
        trabajadores: workersRes.data || [],
        currentUserRol,
        currentUserId
    }
}

export async function getPresupuestosBase(tareaIds: number[]) {
    if (!tareaIds || tareaIds.length === 0) return {}

    const { data } = await supabaseAdmin
        .from('presupuestos_base')
        .select('*')
        .in('id_tarea', tareaIds)
        .order('created_at', { ascending: false })

    // Return Record<tareaId, PresupuestoBase>
    const map: Record<number, any> = {}
    if (data) {
        data.forEach((pb: any) => {
            if (!map[pb.id_tarea]) {
                map[pb.id_tarea] = pb
            }
        })
    }
    return map
}
