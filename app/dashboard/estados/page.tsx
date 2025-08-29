import { createServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import EstadosClientPage from './estados-client'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

function LoadingComponent() {
  return (
    <div className="container mx-auto py-6 md:py-10 space-y-8">
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando estados...</span>
      </div>
    </div>
  )
}

export default async function EstadosPage() {
  const supabase = createServerClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: userData, error: userError } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', session.user.id)
    .single()

  if (userError || userData?.rol !== 'admin') {
    redirect('/dashboard')
  }

  const [ 
    tareaResponse, 
    presupuestosResponse, 
    facturasResponse, 
    conteoTareasResponse, 
    conteoPresupuestosResponse, 
    conteoFacturasResponse 
  ] = await Promise.all([
    supabase.from('estados_tareas').select('*').order('orden', { ascending: true }),
    supabase.from('estados_presupuestos').select('*').order('orden', { ascending: true }),
    supabase.from('estados_facturas').select('*').order('orden', { ascending: true }),
    supabase.rpc('contar_tareas_por_estado'),
    supabase.rpc('contar_presupuestos_por_estado'),
    supabase.rpc('contar_facturas_por_estado')
  ])

  // Manejo de errores (opcional, pero recomendado)
  if (tareaResponse.error) console.error("Error al cargar estados de tareas:", tareaResponse.error)
  if (presupuestosResponse.error) console.error("Error al cargar estados de presupuestos:", presupuestosResponse.error)
  if (facturasResponse.error) console.error("Error al cargar estados de facturas:", facturasResponse.error)
  if (conteoTareasResponse.error) console.error("Error al cargar conteo de tareas:", conteoTareasResponse.error)
  if (conteoPresupuestosResponse.error) console.error("Error al cargar conteo de presupuestos:", conteoPresupuestosResponse.error)
  if (conteoFacturasResponse.error) console.error("Error al cargar conteo de facturas:", conteoFacturasResponse.error)

  return (
    <Suspense fallback={<LoadingComponent />}>
      <EstadosClientPage
        estadosTareas={tareaResponse.data || []}
        estadosPresupuestos={presupuestosResponse.data || []}
        estadosFacturas={facturasResponse.data || []}
        conteoTareas={conteoTareasResponse.data || []}
        conteoPresupuestos={conteoPresupuestosResponse.data || []}
        conteoFacturas={conteoFacturasResponse.data || []}
      />
    </Suspense>
  )
}
