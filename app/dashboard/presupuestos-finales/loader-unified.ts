'use server'

import { createServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"

/**
 * ToolPFPlatinum — Unified Loader
 * Carga todo lo necesario para el hub PF en un solo fetch paralelo.
 */

export type PFHubData = {
    presupuesto: any
    items: any[]
    facturas: any[]
    facturasItems: Record<number, any[]> // { facturaId: items[] }
}

/**
 * Carga un PF completo con sus items y facturas derivadas.
 * Solo admin puede ver facturas.
 */
export async function loadPFHub(pfId: number): Promise<PFHubData | null> {
    console.log(`[PF Loader] Loading Hub for ID: ${pfId}`);
    const user = await validateSessionAndGetUser()
    if (user.rol !== 'admin') {
        console.warn(`[PF Loader] User role '${user.rol}' is not admin. Access denied.`);
        return null
    }

    const [pfRes, itemsRes, facturasRes] = await Promise.all([
        // 1. Cabecera del PF con relaciones
        supabaseAdmin
            .from('presupuestos_finales')
            .select(`
                *,
                tareas(
                    id, titulo, code, id_edificio, 
                    edificios(nombre, cuit),
                    supervisores_tareas(id_supervisor, usuarios!inner(email))
                ),
                estados_presupuestos:id_estado(id, nombre, color, codigo),
                presupuestos_base:id_presupuesto_base(id, code, total, aprobado)
            `)
            .eq('id', pfId)
            .single(),

        // 2. Items del PF
        supabaseAdmin
            .from('items')
            .select('*')
            .eq('id_presupuesto', pfId)
            .order('id', { ascending: true }),

        // 3. Facturas derivadas
        supabaseAdmin
            .from('facturas')
            .select(`
                id, code, total, created_at, nombre, enviada, fecha_envio, pagada, fecha_pago,
                datos_afip, afip_numero, total_pagado, saldo_pendiente,
                id_estado_nuevo, tiene_ajustes, ajustes_aprobados,
                estados_facturas:id_estado_nuevo(id, nombre, color, codigo)
            `)
            .eq('id_presupuesto_final', pfId)
            .order('created_at', { ascending: true }),
    ])

    if (pfRes.error || !pfRes.data) {
        console.error(`[PF Loader] Error loading PF head (ID: ${pfId}):`, pfRes.error || 'Record not found')
        return null
    }

    console.log(`[PF Loader] PF Head found: ${pfRes.data.code}`);

    // 4. Cargar items de cada factura en paralelo
    const facturasItems: Record<number, any[]> = {}
    if (facturasRes.data && facturasRes.data.length > 0) {
        const itemsPromises = facturasRes.data.map(f =>
            supabaseAdmin
                .from('items_factura')
                .select('id, descripcion, cantidad, precio_unitario, subtotal_item, es_material')
                .eq('id_factura', f.id)
                .order('id', { ascending: true })
        )
        const results = await Promise.all(itemsPromises)
        facturasRes.data.forEach((f, i) => {
            facturasItems[f.id] = results[i].data || []
        })
    }

    return {
        presupuesto: pfRes.data,
        items: itemsRes.data || [],
        facturas: facturasRes.data || [],
        facturasItems,
    }
}

/**
 * Carga los catálogos necesarios para crear/editar un PF.
 */
export async function loadPFCatalogs() {
    const user = await validateSessionAndGetUser()
    if (user.rol !== 'admin') return null

    const [adminsRes, edificiosRes, productosRes, supervisoresRes] = await Promise.all([
        supabaseAdmin.from('administradores').select('id, nombre').order('nombre'),
        supabaseAdmin.from('edificios').select('id, nombre, id_administrador').order('nombre'),
        supabaseAdmin.from('productos').select('*').order('nombre'),
        supabaseAdmin.from('usuarios').select('id, email').eq('rol', 'supervisor').order('email'),
    ])

    return {
        administradores: (adminsRes.data || []).map(a => ({ id: a.id.toString(), nombre: a.nombre })),
        edificios: edificiosRes.data || [],
        productos: productosRes.data || [],
        supervisores: (supervisoresRes.data || []).map(s => ({ id: s.id, email: s.email })),
    }
}

/**
 * Busca tareas que ya tienen PB aprobado y NO tienen PF creado aún.
 */
export async function getTareasConPBAprobadoSinPF() {
    const user = await validateSessionAndGetUser()
    if (user.rol !== 'admin') return []

    // Buscar tareas con PB aprobado que no tengan PF
    const { data: tareasPB, error } = await supabaseAdmin
        .from('presupuestos_base')
        .select(`
            id,
            code,
            total,
            id_tarea,
            tareas!inner(id, titulo, code, id_edificio, id_administrador, edificios(nombre))
        `)
        .eq('aprobado', true)
        .order('created_at', { ascending: false })

    if (error || !tareasPB) return []

    // Filtrar las que YA tienen un PF
    const tareaIds = tareasPB.map(pb => pb.id_tarea).filter(Boolean)
    if (tareaIds.length === 0) return tareasPB

    const { data: pfExistentes } = await supabaseAdmin
        .from('presupuestos_finales')
        .select('id_tarea')
        .in('id_tarea', tareaIds)

    const tareasConPF = new Set((pfExistentes || []).map(pf => pf.id_tarea))

    return tareasPB.filter(pb => !tareasConPF.has(pb.id_tarea))
}
