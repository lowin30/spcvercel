import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function inCurrentWeek(fecha: string) {
  const today = new Date()
  const day = today.getDay()
  const mondayOffset = (day + 6) % 7
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - mondayOffset)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  const d = new Date(`${fecha}T00:00:00`)
  return d >= start && d <= end
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { id_tarea, id_trabajador, fecha, tipo_jornada } = body || {}

    if (!id_tarea || !id_trabajador || !fecha || !tipo_jornada) {
      return NextResponse.json({ error: 'Faltan datos requeridos', debug: { id_tarea, id_trabajador, fecha, tipo_jornada } }, { status: 400 })
    }
    if (tipo_jornada !== 'dia_completo' && tipo_jornada !== 'medio_dia') {
      return NextResponse.json({ error: 'tipo_jornada inválido' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase URL o ANON KEY no configurados' }, { status: 500 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {
          // No-op en Route Handlers; NextResponse.cookies debe usarse para escribir
        },
        remove() {
          // No-op en Route Handlers
        },
      },
    })

    // Sesión de usuario
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 })
    }

    const userId = session.user.id

    // Obtener rol del usuario
    const { data: usuario, error: userErr } = await supabase
      .from('usuarios')
      .select('id, rol')
      .eq('id', userId)
      .maybeSingle()

    if (userErr || !usuario) {
      return NextResponse.json({ error: 'No se pudo obtener el usuario actual' }, { status: 500 })
    }

    const esAdmin = usuario.rol === 'admin'
    const esSupervisor = usuario.rol === 'supervisor'
    const esTrabajador = usuario.rol === 'trabajador'

    // Validaciones de permisos
    if (!esAdmin && !esSupervisor && !esTrabajador) {
      return NextResponse.json({ error: 'Rol no autorizado' }, { status: 403 })
    }

    // Si es supervisor, debe estar asignado a la tarea (admin omite)
    if (esSupervisor && !esAdmin) {
      const { data: supOk } = await supabase
        .from('supervisores_tareas')
        .select('id')
        .eq('id_tarea', id_tarea)
        .eq('id_supervisor', userId)
        .maybeSingle()
      if (!supOk) {
        return NextResponse.json({ error: 'No estás asignado como supervisor de esta tarea' }, { status: 403 })
      }
    }

    // El trabajador debe estar asignado a la tarea (admin omite)
    if (!esAdmin) {
      const { data: trabOk } = await supabase
        .from('trabajadores_tareas')
        .select('id')
        .eq('id_tarea', id_tarea)
        .eq('id_trabajador', id_trabajador)
        .maybeSingle()
      if (!trabOk) {
        return NextResponse.json({ error: 'El trabajador no está asignado a esta tarea' }, { status: 403 })
      }
    }

    // Si es trabajador, sólo puede registrar para sí mismo
    if (esTrabajador && id_trabajador !== userId) {
      return NextResponse.json({ error: 'No puedes registrar partes para otros trabajadores' }, { status: 403 })
    }

    // Validación básica de fecha y ventana semanal (el cliente ya bloquea)
    if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
    }
    if (!inCurrentWeek(fecha)) {
      return NextResponse.json({ error: 'Fuera de ventana de registro' }, { status: 423 })
    }

    // Usar Service Role para insertar (bypass RLS) tras validaciones
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY

    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Service role o URL no configurados en el servidor' }, { status: 500 })
    }

    const admin = createAdminClient(supabaseUrl, serviceKey)

    // Capacidad diaria: suma de partes del trabajador en esa fecha (todas las tareas) <= 1
    const { data: existentes, error: existErr } = await admin
      .from('partes_de_trabajo')
      .select('id, tipo_jornada')
      .eq('id_trabajador', id_trabajador)
      .eq('fecha', fecha)
    if (existErr) {
      return NextResponse.json({ error: existErr.message || 'No se pudo validar capacidad diaria' }, { status: 400 })
    }
    const suma = (existentes || []).reduce((acc: number, p: any) => acc + (p.tipo_jornada === 'dia_completo' ? 1 : 0.5), 0)
    const valorNuevo = tipo_jornada === 'dia_completo' ? 1 : 0.5
    if (suma + valorNuevo > 1) {
      return NextResponse.json({ error: 'Capacidad diaria excedida' }, { status: 409 })
    }

    const insertPayload = {
      id_tarea: Number(id_tarea),
      id_trabajador: id_trabajador,
      fecha,
      tipo_jornada,
      id_registrador: userId,
    }

    const { data: inserted, error: insertError } = await admin
      .from('partes_de_trabajo')
      .insert(insertPayload)
      .select('id, id_tarea, id_trabajador, fecha, tipo_jornada, id_registrador')
      .single()

    if (insertError) {
      const msg = insertError.message || 'No se pudo registrar el parte'
      const code = (insertError as any)?.code || ''
      const isCapacity = code === '23514' || msg.toLowerCase().includes('capacidad diaria excedida')
      return NextResponse.json({ error: msg }, { status: isCapacity ? 409 : 400 })
    }

    return NextResponse.json({ ok: true, parte: inserted })
  } catch (e: any) {
    console.error('Error en API /api/partes/registrar:', e)
    return NextResponse.json({ error: e?.message || 'Error del servidor' }, { status: 500 })
  }
}
