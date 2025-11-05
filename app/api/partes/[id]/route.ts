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

async function getSupabaseSSR() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return { error: 'Supabase URL o ANON KEY no configurados' as const }
  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })
  return { supabase, supabaseUrl }
}

async function getAdminClient(supabaseUrl?: string) {
  const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY
  if (!url || !serviceKey) return { error: 'Service role o URL no configurados en el servidor' as const }
  return { admin: createAdminClient(url, serviceKey) }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    if (!id || Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const { tipo_jornada } = body || {}
    if (tipo_jornada !== 'dia_completo' && tipo_jornada !== 'medio_dia') {
      return NextResponse.json({ error: 'tipo_jornada inválido' }, { status: 400 })
    }

    const { supabase, supabaseUrl, error: ssrErr } = await getSupabaseSSR()
    if (ssrErr || !supabase || !supabaseUrl) return NextResponse.json({ error: ssrErr || 'Error SSR' }, { status: 500 })

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 })
    const userId = session.user.id

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, rol')
      .eq('id', userId)
      .maybeSingle()
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 })

    const { admin, error: adminErr } = await getAdminClient(supabaseUrl)
    if (adminErr || !admin) return NextResponse.json({ error: adminErr || 'Error admin' }, { status: 500 })

    const { data: parte, error: parteErr } = await admin
      .from('partes_de_trabajo')
      .select('id, id_tarea, id_trabajador, fecha, tipo_jornada')
      .eq('id', id)
      .maybeSingle()
    if (parteErr || !parte) return NextResponse.json({ error: 'Parte no encontrado' }, { status: 404 })

    const esAdmin = usuario.rol === 'admin'
    const esSupervisor = usuario.rol === 'supervisor'
    const esTrabajador = usuario.rol === 'trabajador'

    if (!esAdmin && !esSupervisor && !esTrabajador) return NextResponse.json({ error: 'Rol no autorizado' }, { status: 403 })

    if (esTrabajador && parte.id_trabajador !== userId) {
      return NextResponse.json({ error: 'No puedes modificar partes de otros trabajadores' }, { status: 403 })
    }

    if (esSupervisor) {
      const { data: supOk } = await admin
        .from('supervisores_tareas')
        .select('id')
        .eq('id_tarea', parte.id_tarea)
        .eq('id_supervisor', userId)
        .maybeSingle()
      if (!supOk) return NextResponse.json({ error: 'No estás asignado como supervisor de esta tarea' }, { status: 403 })
    }

    if (!esAdmin) {
      const { data: trabOk } = await admin
        .from('trabajadores_tareas')
        .select('id')
        .eq('id_tarea', parte.id_tarea)
        .eq('id_trabajador', parte.id_trabajador)
        .maybeSingle()
      if (!trabOk) return NextResponse.json({ error: 'Trabajador no asignado a la tarea' }, { status: 403 })
    }

    if (!inCurrentWeek(parte.fecha as unknown as string)) {
      return NextResponse.json({ error: 'Fuera de ventana de edición' }, { status: 423 })
    }

    const { data: otros } = await admin
      .from('partes_de_trabajo')
      .select('id, tipo_jornada')
      .eq('id_trabajador', parte.id_trabajador)
      .eq('fecha', parte.fecha)
      .neq('id', parte.id)

    const sumaOtros = (otros || []).reduce((acc, p: any) => acc + (p.tipo_jornada === 'dia_completo' ? 1 : 0.5), 0)
    const valorNuevo = tipo_jornada === 'dia_completo' ? 1 : 0.5
    if (sumaOtros + valorNuevo > 1) {
      return NextResponse.json({ error: 'Capacidad diaria excedida' }, { status: 409 })
    }

    const { error: updErr } = await admin
      .from('partes_de_trabajo')
      .update({ tipo_jornada })
      .eq('id', parte.id)
    if (updErr) {
      const msg = updErr.message || 'No se pudo actualizar'
      const code = (updErr as any)?.code || ''
      const isCapacity = code === '23514' || msg.toLowerCase().includes('capacidad diaria excedida')
      return NextResponse.json({ error: msg }, { status: isCapacity ? 409 : 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    if (!id || Number.isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const { supabase, supabaseUrl, error: ssrErr } = await getSupabaseSSR()
    if (ssrErr || !supabase || !supabaseUrl) return NextResponse.json({ error: ssrErr || 'Error SSR' }, { status: 500 })

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 })
    const userId = session.user.id

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, rol')
      .eq('id', userId)
      .maybeSingle()
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 })

    const { admin, error: adminErr } = await getAdminClient(supabaseUrl)
    if (adminErr || !admin) return NextResponse.json({ error: adminErr || 'Error admin' }, { status: 500 })

    const { data: parte, error: parteErr } = await admin
      .from('partes_de_trabajo')
      .select('id, id_tarea, id_trabajador, fecha')
      .eq('id', id)
      .maybeSingle()
    if (parteErr || !parte) return NextResponse.json({ error: 'Parte no encontrado' }, { status: 404 })

    const esAdmin = usuario.rol === 'admin'
    const esSupervisor = usuario.rol === 'supervisor'
    const esTrabajador = usuario.rol === 'trabajador'

    if (!esAdmin && !esSupervisor && !esTrabajador) return NextResponse.json({ error: 'Rol no autorizado' }, { status: 403 })

    if (esTrabajador && parte.id_trabajador !== userId) {
      return NextResponse.json({ error: 'No puedes eliminar partes de otros trabajadores' }, { status: 403 })
    }

    if (esSupervisor) {
      const { data: supOk } = await admin
        .from('supervisores_tareas')
        .select('id')
        .eq('id_tarea', parte.id_tarea)
        .eq('id_supervisor', userId)
        .maybeSingle()
      if (!supOk) return NextResponse.json({ error: 'No estás asignado como supervisor de esta tarea' }, { status: 403 })
    }

    if (!esAdmin) {
      const { data: trabOk } = await admin
        .from('trabajadores_tareas')
        .select('id')
        .eq('id_tarea', parte.id_tarea)
        .eq('id_trabajador', parte.id_trabajador)
        .maybeSingle()
      if (!trabOk) return NextResponse.json({ error: 'Trabajador no asignado a la tarea' }, { status: 403 })
    }

    if (!inCurrentWeek(parte.fecha as unknown as string)) {
      return NextResponse.json({ error: 'Fuera de ventana de edición' }, { status: 423 })
    }

    const { error: delErr } = await admin
      .from('partes_de_trabajo')
      .delete()
      .eq('id', parte.id)
    if (delErr) return NextResponse.json({ error: delErr.message || 'No se pudo eliminar' }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error del servidor' }, { status: 500 })
  }
}
