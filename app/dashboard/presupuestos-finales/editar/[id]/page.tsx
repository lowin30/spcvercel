import { redirect } from "next/navigation"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { getTaskForFinalBudgetAction } from "@/app/dashboard/tareas/actions"
import { loadPFCatalogs } from "@/app/dashboard/presupuestos-finales/loader-unified"
import { PFCreatePlatinumForm } from "@/components/platinum/tools/pf/PFCreatePlatinumForm"
import { getPresupuestoFinalById } from "../../[id]/loader"

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarPresupuestoFinalPage({ params }: Props) {
  const user = await validateSessionAndGetUser()
  
  if (user.rol !== "admin") {
    redirect("/dashboard")
  }

  const { id } = await params
  
  // 1. Cargar el presupuesto final completo (Bridge Protocol - Bypass RLS)
  const budgetRes = await getPresupuestoFinalById(id)
  
  if (!budgetRes || !budgetRes.presupuesto) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-card rounded-3xl border border-border shadow-2xl">
        <h1 className="text-xl font-black text-card-foreground mb-2 italic tracking-tighter">presupuesto no encontrado</h1>
        <p className="text-sm text-muted-foreground">no pudimos recuperar los datos del presupuesto #{id}.</p>
      </div>
    )
  }

  const { presupuesto, items } = budgetRes

  // 2. Cargar Datos de Tarea vinculada
  let taskData = null
  if (presupuesto.id_tarea) {
    const taskRes = await getTaskForFinalBudgetAction(presupuesto.id_tarea)
    if (taskRes.success) taskData = taskRes.data
  }

  // 3. Cargar Catálogos para el Wizard
  const catalogs = await loadPFCatalogs()

  return (
    <div className="container mx-auto py-6 animate-in fade-in duration-500">
      <PFCreatePlatinumForm 
        task={taskData} 
        catalogs={catalogs}
        initialPb={presupuesto.presupuestos_base}
        initialData={{
          ...presupuesto,
          items // Inyectamos los items cargados por el loader
        }}
      />
    </div>
  )
}
