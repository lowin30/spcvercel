'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { sanitizeText, cleanCuit } from '@/lib/utils'

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
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
    )

    // Validar sesión
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'No autorizado' }
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

        const { data: newBuilding, error } = await supabase.from('edificios').insert({
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
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'No autorizado' }
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

        const { error } = await supabase.from('edificios').update({
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
