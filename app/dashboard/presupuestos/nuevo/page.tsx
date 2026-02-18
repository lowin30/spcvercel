import { redirect } from "next/navigation"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { BudgetForm } from "@/components/budget-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { getPresupuestoBaseByIdAction, getTasksForBudgetAction } from "../../tareas/actions"

export const dynamic = 'force-dynamic'

export default async function NuevoPresupuestoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; id_tarea?: string; id_padre?: string }>
}) {
  // 1. Identidad Segura (Bridge Protocol)
  const user = await validateSessionAndGetUser()
  const { rol } = user

  // 2. Parámetros
  const params = await searchParams
  const tipo = params.tipo
  const tipoPresupuesto = tipo === "final" ? "final" : "base"
  const idTarea = params.id_tarea || ""
  const idPadre = params.id_padre || ""

  // 3. Validación de Acceso
  if (rol !== "supervisor" && rol !== "admin") {
    redirect("/dashboard")
  }

  if (tipoPresupuesto === "final" && rol !== "admin") {
    redirect("/dashboard/presupuestos")
  }

  // 4. Obtención de Datos (Bridge Action)
  let presupuestoBase = null
  let tareas: any[] = []
  let tareaSingle = null
  let errorMsg = null

  try {
    if (tipoPresupuesto === "final" && idTarea && idPadre) {
      const res = await getPresupuestoBaseByIdAction(Number(idPadre))
      if (res.success) {
        presupuestoBase = res.data
      } else {
        errorMsg = "No se pudo cargar el presupuesto base de referencia."
      }
    } else {
      const resTareas = await getTasksForBudgetAction(idTarea || undefined)
      if (resTareas.success) {
        tareas = resTareas.data || []
        if (idTarea && tareas.length > 0) {
          tareaSingle = tareas[0]
        }
      } else {
        errorMsg = "No se pudieron cargar las tareas necesarias."
      }
    }
  } catch (error) {
    console.error("Error cargando datos para nuevo presupuesto:", error)
    errorMsg = "Error inesperado al cargar datos."
  }

  // 5. Renderizado de Error (si aplica)
  if (errorMsg) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-md bg-destructive/15 p-4 text-center">
          <p className="text-destructive font-medium">{errorMsg}</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/dashboard/presupuestos">Volver a presupuestos</Link>
          </Button>
        </div>
      </div>
    )
  }

  // 6. Vista para Presupuesto Final
  if (tipo === "final" && idTarea && idPadre && presupuestoBase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="mr-2" asChild>
            <Link href={`/dashboard/tareas/${idTarea}`}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver a la Tarea
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo Presupuesto Final</h1>
        </div>

        <BudgetForm
          tipo="final"
          idPadre={idPadre}
          idTarea={idTarea}
          presupuestoBase={presupuestoBase}
          itemsBase={[]} // Se inicializa vacío, el form lo manejará
        />
      </div>
    )
  }

  // 7. Vista para Presupuesto Base o Final sin padre
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" className="mr-2" asChild>
          <Link href={idTarea ? `/dashboard/tareas/${idTarea}` : "/dashboard/presupuestos"}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Nuevo Presupuesto {tipoPresupuesto === "final" ? "Final" : "Base"}
        </h1>
      </div>

      <BudgetForm
        tipo={tipoPresupuesto}
        tareas={tareas}
        tareaSeleccionada={tareaSingle}
        idTarea={idTarea}
      />
    </div>
  )
}
