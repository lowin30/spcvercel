import "server-only"
import { createServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { validateSessionAndGetUser } from "@/lib/auth-bridge"

import { executeSecureQuery } from "@/lib/rls-error-handler"

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
    // Agregaciones Atómicas (Modo Dios)
    trabajadores_json?: any[]
    supervisores_json?: any[]
    departamentos_json?: any[]
    finanzas_json?: any // Solo Admin
    gastos_json?: any // Solo Supervisor
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
    try {
        const usuario = await validateSessionAndGetUser()
        const { id: userId, rol } = usuario;

        // 1. Instanciamos el cliente User-bound (NO admin) para aprovechar el RLS V2
        const supabase = await createServerClient();
        if (!supabase) throw new Error("No Supabase Client");

        // 3. Query principal normalizada
        // RLS y PostgreSQL se encargan de filtar la base según el rol ahora.
        let query = supabase
            .from('vista_tareas_completa')
            .select('*')
            .order('created_at', { ascending: false });

        // 5. Aplicar Filtros Dinámicos (Search Params)
        if (filters) {
            if (!filters.estado || filters.estado === '_todos_') {
                const view = filters.view || 'activas';
                switch (view) {
                    case 'activas':
                        query = query.in('id_estado_nuevo', [1, 2, 3, 5, 6, 8, 10]).eq('finalizada', false);
                        break;
                    case 'enviadas':
                        query = query.eq('id_estado_nuevo', 4);
                        break;
                    case 'finalizadas':
                        query = query.or('id_estado_nuevo.in.(7,9),finalizada.eq.true');
                        break;
                }
            }

            if (filters.id_administrador && filters.id_administrador !== '_todos_') {
                query = query.eq('id_administrador', filters.id_administrador)
            }
            if (filters.id_edificio && filters.id_edificio !== '_todos_') {
                query = query.eq('id_edificio', filters.id_edificio)
            }
            if (filters.estado && filters.estado !== '_todos_') {
                const estadoId = parseInt(filters.estado)
                if (!isNaN(estadoId)) {
                    query = query.eq('id_estado_nuevo', estadoId)
                }
            }
            if (filters.search) {
                const term = filters.search;
                query = query.or(`titulo.ilike.%${term}%,code.ilike.%${term}%,descripcion.ilike.%${term}%,nombre_edificio.ilike.%${term}%`)
            }
        } else {
            query = query.in('id_estado_nuevo', [1, 2, 3, 5, 6, 8, 10]).eq('finalizada', false);
        }

        // 🛡️ Envolver en el Escudo RLS (Captura silenciosa 42501)
        const result = await executeSecureQuery(query);

        if (!result.success) {
            console.warn("🛡️ Pilot RLS Blocked Tareas query para user:", userId);
            // El usuario carece de los permisos RLS indicados
            return [];
        }

        return result.data || [];

    } catch (error) {
        console.error("Loader Error:", error);
        if ((error as any).message?.includes("No hay sesión")) {
            throw new Error("Unauthorized");
        }
        throw error;
    }
}

export async function getTareasCounts(filters?: TareasFilterParams) {
    try {
        const usuario = await validateSessionAndGetUser()
        if (!usuario) return { activas: 0, enviadas: 0, finalizadas: 0, todas: 0 }

        const { id: userId, rol } = usuario

        // Reutilizamos la lógica de filtrado base (sin el filtro de 'view' ni 'estado')
        let query = supabaseAdmin
            .from('vista_tareas_completa')
            .select('id_estado_nuevo, finalizada');

        // Aplicamos seguridad por rol
        if (rol === 'admin') {
            query = query.neq('id_estado_nuevo', 9)
        } else if (rol === 'supervisor') {
            const { data: asignaciones } = await supabaseAdmin
                .from('supervisores_tareas')
                .select('id_tarea')
                .eq('id_supervisor', userId)
            const ids = asignaciones?.map(a => a.id_tarea) || []
            if (ids.length > 0) query = query.in('id', ids)
            else return { activas: 0, enviadas: 0, finalizadas: 0, todas: 0 }
        } else if (rol === 'trabajador') {
            const { data: asignaciones } = await supabaseAdmin
                .from('trabajadores_tareas')
                .select('id_tarea')
                .eq('id_trabajador', userId)
            const ids = asignaciones?.map(a => a.id_tarea) || []
            if (ids.length > 0) query = query.in('id', ids)
            else return { activas: 0, enviadas: 0, finalizadas: 0, todas: 0 }
        }

        // Aplicamos filtros globales (admin, edificio, supervisor, search)
        if (filters) {
            if (filters.id_administrador && filters.id_administrador !== '_todos_') {
                query = query.eq('id_administrador', filters.id_administrador)
            }
            if (filters.id_edificio && filters.id_edificio !== '_todos_') {
                query = query.eq('id_edificio', filters.id_edificio)
            }
            if (filters.id_supervisor && filters.id_supervisor !== '_todos_') {
                const { data: tSup } = await supabaseAdmin
                    .from('supervisores_tareas')
                    .select('id_tarea')
                    .eq('id_supervisor', filters.id_supervisor)
                const ids = tSup?.map(t => t.id_tarea) || []
                if (ids.length > 0) query = query.in('id', ids)
                else return { activas: 0, enviadas: 0, finalizadas: 0, todas: 0 }
            }
            if (filters.search) {
                query = query.or(`titulo.ilike.%${filters.search}%,code.ilike.%${filters.search}%,descripcion.ilike.%${filters.search}%,nombre_edificio.ilike.%${filters.search}%`)
            }
        }

        const { data: tareas } = await query

        if (!tareas) return { activas: 0, enviadas: 0, finalizadas: 0, todas: 0 }

        // Agrupamos y contamos en JS (eficiente para el volumen esperado)
        const counts = {
            activas: 0,
            enviadas: 0,
            finalizadas: 0,
            todas: tareas.length
        }

        tareas.forEach(t => {
            const id = t.id_estado_nuevo
            // Si el supervisor la marcó como finalizada, va a "finalizadas" sin importar el estado
            if (t.finalizada === true) {
                counts.finalizadas++
            } else if ([1, 2, 3, 5, 6, 8, 10].includes(id)) {
                counts.activas++
            } else if (id === 4) {
                counts.enviadas++
            } else if ([7, 9].includes(id)) {
                counts.finalizadas++
            }
        })

        return counts
    } catch (e) {
        console.error("Error calculating counts:", e)
        return { activas: 0, enviadas: 0, finalizadas: 0, todas: 0 }
    }
}

// Helper para tareas candidatas a presupuesto final (Optimización pendiente a SQL)
export async function getTareasParaPresupuesto() {
    /**
     * @description Retorna tareas activas que aún no tienen un presupuesto final asignado.
     * @note Candidato a ser una vista SQL dedicada para eliminar el filtrado 'NOT IN' en el cliente.
     */
    const { data: conPF } = await supabaseAdmin
        .from('presupuestos_finales')
        .select('id_tarea')
        .not('id_tarea', 'is', null);

    const idsConPF = conPF?.map(x => x.id_tarea) || [];

    let query = supabaseAdmin
        .from('tareas')
        .select('*')
        .neq('id_estado_nuevo', 9);

    if (idsConPF.length > 0) {
        query = query.not('id', 'in', `(${idsConPF.join(',')})`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

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
            .limit(50);
        return data || [];
    }
    return [];
}


export async function getTareaDetail(id: string) {
    try {
        const usuario = await validateSessionAndGetUser()
        if (!usuario) throw new Error("Usuario no encontrado")

        const tareaId = parseInt(id)
        if (isNaN(tareaId)) throw new Error("ID de tarea inválido")

        const supabase = await createServerClient();
        const rol = usuario.rol;

        // 1. DETERMINAR VISTA SEGÚN ROL (Silo de Seguridad)
        // Supervisores usan vista_tareas_completa (igual que el listado).
        // RLS V2 filtra por supervisores_tareas.id_supervisor = auth.uid().
        // Los filtros de estado (Activas/Finalizadas) viven en el JS (tabs), no en la vista.
        let primaryView = "vista_tareas_completa";
        if (rol === 'admin') primaryView = "vista_tareas_admin";

        // 2. CARGA ATÓMICA (Tarea Detallada + Comentarios Enriquecidos + Catálogos + Gastos)
        const [tareaRes, comentariosRes, estadosRes, supervisoresDispRes, workersDispRes, depsDispRes, contactosRes, gastosDirectRes] = await Promise.all([
            // La joya de la corona: Datos de la tarea + Finanzas/Gastos inyectados por el SQL
            supabase.from(primaryView).select("*").eq("id", tareaId).single(),

            // Comentarios ya enriquecidos con autor (Zero-Join logic)
            supabaseAdmin.from("vista_comentarios_detallada").select("*").eq("id_tarea", tareaId).order("created_at", { ascending: false }),

            // Catálogos necesarios para interacción
            supabaseAdmin.from("estados_tareas").select("*").order("orden"),
            supabaseAdmin.from("usuarios").select("id, email, color_perfil, code").eq("rol", "supervisor"),
            supabaseAdmin.from("usuarios").select("id, email, color_perfil, configuracion_trabajadores!inner(activo)").eq("rol", "trabajador").eq("configuracion_trabajadores.activo", true),

            // Contexto de la tarea
            supabaseAdmin.from("departamentos").select("id, codigo, propietario, edificio_id"),
            supabaseAdmin.from("contactos").select("id, numero:telefono, nombre_contacto:nombreReal, departamento_id, id_padre"),

            // Gastos directos (visibles para todos los roles, sin depender de gastos_json embebido)
            supabaseAdmin.from("gastos_tarea").select("*, usuarios(email, color_perfil)").eq("id_tarea", tareaId).or('liquidado.is.null,liquidado.eq.false,and(liquidado.eq.true,tipo_gasto.eq.material)').order("created_at", { ascending: false })
        ]);

        if (tareaRes.error || !tareaRes.data) throw new Error("Tarea no encontrada");
        const tareaData = tareaRes.data;

        // 3. EXTRACCIÓN DE DATOS INYECTADOS (Modo Dios)

        // A. Finanzas (Solo Admin)
        let pbData = null;
        let pfFinal = null;
        if (rol === 'admin' && (tareaData as any).finanzas_json) {
            const finanzas = (tareaData as any).finanzas_json;
            pbData = finanzas.pb;
            pfFinal = finanzas.pf;
            if (pfFinal) {
                pfFinal.tiene_facturas = finanzas.tiene_facturas;
                pfFinal.facturas_pagadas = finanzas.facturas_pagadas;
            }
        }
        // B. Gastos y PB (Supervisor)
        else if (rol === 'supervisor' && (tareaData as any).gastos_json) {
            const gastosContext = (tareaData as any).gastos_json;
            pbData = gastosContext.pb;
            // El supervisor no ve PF
        }

        // 4. MAPEO DE TRABAJADORES (Legacy Compatibility)
        const trabajadoresAsignados = (tareaData.trabajadores_json || []).map((t: any) => ({
            usuarios: {
                id: t.id,
                email: t.nombre,
                color_perfil: t.color_perfil || null
            }
        }));

        // 5. TRADUCCIÓN A FORMATO LEGACY (Para no romper el Detail View)
        const tareaLegacy = {
            ...tareaData,
            edificios: {
                id: tareaData.id_edificio,
                nombre: tareaData.nombre_edificio,
                direccion: tareaData.direccion_edificio,
                cuit: null,
                notas: null
            }
        };

        // 6. FILTRADO DE CATÁLOGOS CONTEXTUALES
        const departamentosEdificio = depsDispRes.data?.filter(d => (d as any).edificio_id === tareaData.id_edificio) || [];

        // Obtener IDs de departamentos vinculados a la tarea para filtrado selectivo de teléfonos
        const deptIdsVinculados = (tareaData.departamentos_json || []).map((d: any) => Number(d.id_departamento));

        const contactosEdificio = contactosRes.data?.filter(c => {
            const contact = c as any;
            const esMismoEdificio = contact.id_padre === tareaData.id_edificio;

            // Un contacto es pertinente si:
            // 1. Pertenece a un departamento vinculado a la tarea
            // 2. O es un contacto "global" (null) PERO tiene un nombre identificado (ej: Portería, Admin)
            const tieneNombre = contact.nombre_contacto && contact.nombre_contacto.trim() !== "";
            const esDeDeptoVinculado = deptIdsVinculados.includes(Number(contact.departamento_id));
            const esGlobalConIdentidad = contact.departamento_id === null && tieneNombre;

            return esMismoEdificio && (esDeDeptoVinculado || esGlobalConIdentidad);
        }) || [];

        // 7. HIDRATACIÓN ATÓMICA DEL SUPERVISOR (NEW - Modo Dios)
        let supervisorData = null;
        if (tareaData.supervisores_json && tareaData.supervisores_json.length > 0) {
            const s = tareaData.supervisores_json[0];
            supervisorData = {
                usuarios: {
                    id: s.id,
                    email: s.email,
                    nombre: s.nombre,
                    color_perfil: s.color_perfil
                }
            };
        }

        return {
            tarea: tareaLegacy,
            userDetails: usuario,
            supervisor: supervisorData,
            trabajadoresAsignados,
            trabajadoresDisponibles: workersDispRes.data?.map(t => ({ id: t.id, email: t.email, color_perfil: t.color_perfil })) || [],
            supervisoresDisponibles: supervisoresDispRes.data || [],
            comentarios: comentariosRes.data?.map(c => ({
                ...c,
                usuarios: {
                    id: c.id_usuario,
                    email: c.email_autor,
                    nombre: c.nombre_autor,
                    code: c.codigo_autor,
                    color_perfil: c.color_autor
                }
            })) || [],
            presupuestoBase: pbData,
            presupuestoFinal: pfFinal,
            gastos: gastosDirectRes.data || [],
            estados: estadosRes.data || [],
            departamentosDisponibles: departamentosEdificio,
            contactos: contactosEdificio
        };

    } catch (error) {
        console.error("Loader Detail Error [God Mode Phase 3]:", error)
        throw new Error("No se pudo cargar el detalle atómico de la tarea")
    }
}

export async function getCatalogsForWizard() {
    let currentUserRol = null;
    let currentUserId = null;

    try {
        const usuario = await validateSessionAndGetUser();
        if (usuario) {
            currentUserRol = usuario.rol;
            currentUserId = usuario.id;
        }
    } catch (e) {
        console.error("Error validando sesion en catalogos:", e);
    }

    const [adminsRes, supervisorsRes, workersRes] = await Promise.all([
        (await createServerClient()).from('administradores').select('id, nombre').eq('estado', 'activo').order('nombre'),
        (await createServerClient()).from('usuarios').select('id, email, code').eq('rol', 'supervisor'),
        (await createServerClient()).from('usuarios').select('id, email, code').eq('rol', 'trabajador')
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
