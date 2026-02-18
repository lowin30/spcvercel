import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import {
  getTaskForFinalBudgetAction,
  getPresupuestoBaseForCloneAction,
  getBudgetStaticDataAction
} from "@/app/dashboard/tareas/actions"
import { BudgetForm } from "@/components/budget-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function NewBudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; id_tarea?: string; id_padre?: string }>
}) {
  // 1. Seguridad Blindada (Bridge Protocol)
  const user = await validateSessionAndGetUser()
  if (user.rol !== 'admin' && user.rol !== 'supervisor') {
    redirect("/dashboard?error=acceso_denegado")
  }

  // 2. Parámetros
  const params = await searchParams
  const tipo = params.tipo === "final" ? "final" : "base"
  const idTarea = params.id_tarea
  const idPadre = params.id_padre

  if (!idTarea) {
    return (
      <div className="container mx-auto py-6 text-center">
        <p className="text-destructive font-medium">Falta el ID de la Tarea para crear el presupuesto.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/dashboard/presupuestos">Volver</Link>
        </Button>
      </div>
    )
  }

  // 3. Fetching Paralelo (Velocidad "Mobile First")
  const [taskRes, baseRes, staticRes] = await Promise.all([
    getTaskForFinalBudgetAction(parseInt(idTarea)),
    idPadre ? getPresupuestoBaseForCloneAction(parseInt(idPadre)) : Promise.resolve({ success: true, data: null }),
    getBudgetStaticDataAction()
  ])

  if (!taskRes.success || !taskRes.data) return notFound()

  const tarea = taskRes.data
  const base = baseRes.success ? baseRes.data : null
  const catalogos = staticRes.data || { administradores: [], edificios: [], productos: [] }

  // 4. Inyección de Datos (El "Lego" completo para universalidad)
  const initialData = {
    tipo: tipo,
    id_tarea: parseInt(idTarea),
    id_presupuesto_base: base?.id || null,
    titulo: `${tipo === 'final' ? 'Presupuesto Final' : 'Presupuesto Base'} - ${tarea.titulo}`,
    id_edificio: tarea.id_edificio,
    id_administrador: tarea.id_administrador || tarea.edificios?.id_administrador,
    // Totales y items listos
    materiales: base?.materiales || 0,
    mano_obra: base?.mano_obra || 0,
    total: base?.total || 0,
    items: base?.items || []
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 max-w-5xl mx-auto pb-20">
      {/* Header Móvil */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/tareas/${idTarea}`}>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Nuevo Presupuesto {tipo === 'final' ? 'Final' : 'Base'}
          </h1>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {tarea.edificios?.nombre || 'Sin edificio'} - {tarea.titulo}
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="p-12 text-center animate-pulse text-muted-foreground">Inicializando editor seguro...</div>}>
        <BudgetForm
          tipo={tipo}
          initialData={initialData}
          userId={user.id}
          listas={catalogos}
          // Para retrocompatibilidad mientras refactorizamos el componente
          tareas={[tarea]}
          tareaSeleccionada={tarea}
          idTarea={idTarea}
          presupuestoBase={base}
          itemsBase={base?.items}
        />
      </Suspense>
    </div>
  )
}
