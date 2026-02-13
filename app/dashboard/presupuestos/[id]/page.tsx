import { createSsrServerClient } from '@/lib/ssr-server'
import { PresupuestoDetail } from '@/components/presupuestos/presupuesto-detail'
import { notFound, redirect } from 'next/navigation'

export default async function PresupuestoPage({
  params
}: {
  params: { id: string }
}) {
  const supabase = await createSsrServerClient()
  const { id } = params

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // 1. Obtener detalles del usuario (para permisos)
  const { data: userDetails, error: userError } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", session.user.id)
    .single()

  if (userError) {
    console.error("Error al obtener usuario:", userError)
    // Podríamos mostrar error o redirigir, pero dejamos la UI manejarlo si es undefined
  }

  // 2. Estrategia de carga unificada (Final -> Base)

  // Intento 1: Presupuesto Final
  let { data: presupuestoFinal, error: errorFinal } = await supabase
    .from("presupuestos_finales")
    .select(`
      *,
      estados_presupuestos:id_estado (id, nombre, color, codigo),
      tareas:id_tarea (id, titulo, descripcion, edificios:id_edificio (id, nombre))
    `)
    .eq("id", id)
    .single()

  let presupuesto = null

  if (presupuestoFinal) {
    presupuesto = { ...presupuestoFinal, tipo: "final" }
  } else {
    // Intento 2: Presupuesto Base
    // Solo buscamos base si no encontramos final (evita doble query si funciona el primero)
    const { data: presupuestoBase, error: errorBase } = await supabase
      .from("presupuestos_base")
      .select(`
         *,
         tareas:id_tarea (id, titulo, descripcion, edificios:id_edificio (id, nombre))
       `)
      .eq("id", id)
      .single()

    if (presupuestoBase) {
      presupuesto = { ...presupuestoBase, tipo: "base" }
    }
  }

  if (!presupuesto) {
    return notFound()
  }

  return (
    <div className='container mx-auto py-6'>
      <PresupuestoDetail
        presupuesto={presupuesto}
        userDetails={userDetails}
      />
    </div>
  )
}



