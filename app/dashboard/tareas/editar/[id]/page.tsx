import React from "react"
import { TaskWizard } from "@/components/tasks/task-wizard"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getCatalogsForWizard, getTareasData } from "../../loader"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { notFound } from "next/navigation"

interface EditarTareaPageProps {
  params: Promise<{ id: string }>
}

export default async function EditarTareaPage({ params: paramsPromise }: EditarTareaPageProps) {
  const { id } = await paramsPromise;

  // 1. Fetch Catalogs (Shared)
  const { administradores, supervisores, trabajadores, currentUserRol } = await getCatalogsForWizard()

  // 2. Fetch Task Data (Single)
  // We need specific task for edit. getTareasData() returns list.
  // We should create getTareaById() in loader or just fetch here for now using Service Role.
  // Ideally loader.ts should have getTareaById(id).
  // But for speed, implementing secure fetch here.

  const { data: task, error } = await supabaseAdmin
    .from('tareas')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !task) {
    notFound();
  }

  // 3. Fetch Relations for Form Pre-fill
  const [
    { data: superRel },
    { data: workRel },
    { data: deptRel }
  ] = await Promise.all([
    supabaseAdmin.from('supervisores_tareas').select('id_supervisor').eq('id_tarea', id).maybeSingle(),
    supabaseAdmin.from('trabajadores_tareas').select('id_trabajador').eq('id_tarea', id).maybeSingle(),
    supabaseAdmin.from('departamentos_tareas').select('id_departamento').eq('id_tarea', id)
  ]);

  // 4. Map to Wizard Format
  const mappedTask = {
    ...task,
    id_administrador: task.id_administrador?.toString() || "",
    id_edificio: task.id_edificio?.toString() || "",
    departamentos_ids: (deptRel || []).map((d: any) => d.id_departamento.toString()),
    id_supervisor: superRel?.id_supervisor || "",
    id_asignado: workRel?.id_trabajador || "",
    id_estado_nuevo: task.id_estado_nuevo?.toString() || "1",
    fecha_visita: task.fecha_visita ? new Date(task.fecha_visita) : null
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/tareas">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver a Tareas
            </Link>
          </Button>
          <h1 className="text-xl font-bold">Editar Tarea: {task?.titulo}</h1>
        </div>
      </div>

      <TaskWizard
        mode="edit"
        taskId={Number(id)}
        defaultValues={mappedTask}
        administradores={administradores}
        supervisores={supervisores}
        trabajadores={trabajadores}
        currentUserRol={currentUserRol || undefined}
      />
    </div>
  );
}
