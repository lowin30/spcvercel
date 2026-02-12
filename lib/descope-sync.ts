"use server"

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface DescopeUserData {
    email: string
    name?: string
    phone?: string
}

/**
 * sincroniza datos del usuario desde descope a la tabla local de supabase.
 * usa service role para bypass de RLS.
 * patron: descope = llave, supabase = permisos + datos.
 */
export async function syncDescopeUser(userData: DescopeUserData) {
    try {
        if (!supabaseUrl || !serviceKey) {
            console.error('spc: variables de entorno supabase no configuradas')
            return { ok: false, error: 'config' }
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        })

        const email = userData.email?.toLowerCase().trim()
        if (!email) {
            console.error('spc: email vacio en sync')
            return { ok: false, error: 'no_email' }
        }

        // buscar usuario existente por email
        const { data: existingUser } = await supabase
            .from('usuarios')
            .select('id, email, nombre, telefono')
            .eq('email', email)
            .maybeSingle()

        const now = new Date().toISOString()
        const nombre = userData.name || email.split('@')[0]
        const telefono = userData.phone || null

        if (existingUser) {
            // actualizar datos + last_login
            const updates: Record<string, unknown> = { last_login: now }
            if (nombre && nombre !== existingUser.nombre) updates.nombre = nombre
            if (telefono && telefono !== existingUser.telefono) updates.telefono = telefono

            await supabase
                .from('usuarios')
                .update(updates)
                .eq('id', existingUser.id)

            console.log('spc: usuario sincronizado', email)
            return { ok: true, action: 'updated', userId: existingUser.id }
        } else {
            // crear nuevo usuario
            const { data: newUser, error } = await supabase
                .from('usuarios')
                .insert({
                    email,
                    nombre,
                    telefono,
                    rol: 'trabajador',
                    activo: true,
                    last_login: now
                })
                .select('id')
                .single()

            if (error) {
                console.error('spc: error creando usuario', error.message)
                return { ok: false, error: error.message }
            }

            console.log('spc: usuario creado', email)
            return { ok: true, action: 'created', userId: newUser?.id }
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'desconocido'
        console.error('spc: error en sync descope', msg)
        return { ok: false, error: msg }
    }
}
