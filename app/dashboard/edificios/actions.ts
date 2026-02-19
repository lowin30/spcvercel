'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { validateSessionAndGetUser } from '@/lib/auth-bridge'
import { revalidatePath } from 'next/cache'
import { sanitizeText, cleanCuit } from '@/lib/utils'

/**
 * EDIFICIOS ACTIONS v108.0 (Server-Side con supabaseAdmin)
 * Usa supabaseAdmin (Service Role) para INSERT/UPDATE.
 * Auth via validateSessionAndGetUser() (Descope).
 */

/**
 * Crea un nuevo edificio con sanitización estricta.
 */
export async function createBuilding(data: {
    nombre: string
    direccion?: string | null
    estado: string // "activo" | "en_obra" | "finalizado" | "inactivo"
    id_administrador: string | number | null // Puede venir como string "0" o number
    cuit?: string | null
    mapa_url?: string | null
    latitud?: string | number | null
    longitud?: string | number | null
}) {
    // Validar sesión con Descope (reemplaza supabase.auth.getUser())
    let user
    try {
        user = await validateSessionAndGetUser()
    } catch {
        return { success: false, error: 'No autorizado' }
    }

    if (user.rol !== 'admin') {
        return { success: false, error: 'Solo admins pueden crear edificios' }
    }

    try {
        // Sanitización Estricta (Protocolo v3.3)
        const nombreLimpio = sanitizeText(data.nombre)
        const direccionLimpia = data.direccion ? sanitizeText(data.direccion) : null

        // El CUIT ya tiene su propia func de limpieza pero sanitizeText no hace daño
        const cuitLimpio = data.cuit ? cleanCuit(data.cuit) : null

        // Normalizar administrador
        let adminId = null
        if (data.id_administrador && data.id_administrador !== "0" && data.id_administrador !== 0) {
            adminId = Number(data.id_administrador)
        }

        const { data: newBuilding, error } = await supabaseAdmin.from('edificios').insert({
            nombre: nombreLimpio,
            direccion: direccionLimpia,
            estado: data.estado,
            id_administrador: adminId,
            cuit: cuitLimpio,
            mapa_url: data.mapa_url || null,
            latitud: data.latitud ? Number(data.latitud) : null,
            longitud: data.longitud ? Number(data.longitud) : null,
            // 'code' se genera automáticamente en DB
        }).select().single()

        if (error) throw error

        revalidatePath('/dashboard/edificios')
        return { success: true, building: newBuilding }

    } catch (e: any) {
        console.error("Error creating building:", e)
        return { success: false, error: e.message }
    }
}

/**
 * Actualiza un edificio existente con sanitización.
 */
export async function updateBuilding(id: number, data: {
    nombre: string
    direccion?: string | null
    estado: string
    id_administrador: string | number | null
    cuit?: string | null
    mapa_url?: string | null
    latitud?: string | number | null
    longitud?: string | number | null
}) {
    // Validar sesión con Descope
    let user
    try {
        user = await validateSessionAndGetUser()
    } catch {
        return { success: false, error: 'No autorizado' }
    }

    if (user.rol !== 'admin') {
        return { success: false, error: 'Solo admins pueden actualizar edificios' }
    }

    try {
        // Sanitización Estricta
        const nombreLimpio = sanitizeText(data.nombre)
        const direccionLimpia = data.direccion ? sanitizeText(data.direccion) : null
        const cuitLimpio = data.cuit ? cleanCuit(data.cuit) : null

        let adminId = null
        if (data.id_administrador && data.id_administrador !== "0" && data.id_administrador !== 0) {
            adminId = Number(data.id_administrador)
        }

        const { error } = await supabaseAdmin.from('edificios').update({
            nombre: nombreLimpio,
            direccion: direccionLimpia,
            estado: data.estado,
            id_administrador: adminId,
            cuit: cuitLimpio,
            mapa_url: data.mapa_url || null,
            latitud: data.latitud ? Number(data.latitud) : null,
            longitud: data.longitud ? Number(data.longitud) : null,
        }).eq('id', id)

        if (error) throw error

        revalidatePath('/dashboard/edificios')
        revalidatePath(`/dashboard/edificios/${id}`)
        return { success: true }

    } catch (e: any) {
        console.error("Error updating building:", e)
        return { success: false, error: e.message }
    }
}
