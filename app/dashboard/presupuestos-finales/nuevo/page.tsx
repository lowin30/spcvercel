import { redirect } from "next/navigation"
import { validateSessionAndGetUser } from "@/lib/auth-bridge"
import { getTaskForFinalBudgetAction } from "@/app/dashboard/tareas/actions"
import { loadPFCatalogs } from "@/app/dashboard/presupuestos-finales/loader-unified"
import { PFCreatePlatinumForm } from "@/components/platinum/tools/pf/PFCreatePlatinumForm"

export const dynamic = 'force-dynamic'

export default async function NuevoPresupuestoFinalPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await validateSessionAndGetUser()
  
  if (user.rol !== "admin") {
    redirect("/dashboard")
  }

  const resolvedParams = await searchParams;
  const taskId = resolvedParams.id_tarea ? parseInt(resolvedParams.id_tarea as string) : null;

  // 1. Cargar Datos de Tarea (Bridge Protocol - Super Vista vista_tareas_admin)
  let taskData = null;
  if (taskId) {
    const res = await getTaskForFinalBudgetAction(taskId);
    if (res.success) taskData = res.data;
  }

  // 2. Cargar Catálogos para el Wizard
  const catalogs = await loadPFCatalogs();

  if (!taskData && taskId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-card rounded-3xl border border-border shadow-2xl">
        <h1 className="text-xl font-black text-card-foreground mb-2 italic tracking-tighter">tarea no encontrada</h1>
        <p className="text-sm text-muted-foreground">no pudimos recuperar los datos de la tarea #{taskId}.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 animate-in fade-in duration-500">
      <PFCreatePlatinumForm 
        task={taskData} 
        catalogs={catalogs}
        initialPb={taskData?.finanzas_json?.pb || null}
      />
    </div>
  )
}
