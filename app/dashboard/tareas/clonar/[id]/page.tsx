import { createServerClient } from "@/lib/supabase-server"
import { TaskWizard } from "@/components/tasks/task-wizard"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

interface ClonarTareaPageProps {
    params: {
        id: string
    }
}

export default async function ClonarTareaPage({ params }: ClonarTareaPageProps) {
    const supabase = await createServerClient()
    const taskId = parseInt(params.id)

    if (isNaN(taskId)) {
        return notFound()
    }

    // 1. Fetch Task Data
    const { data: task, error } = await supabase
        .from('tareas')
        .select(`
      *,
      supervisores_tareas(id_supervisor),
      departamentos_tareas(id_departamento)
    `)
        .eq('id', taskId)
        .single()

    if (error || !task) {
        console.error("Error fetching task for clone:", error)
        return notFound()
    }

    // 2. Fetch Supervisor ID
    const sourceSupervisorId = task.supervisores_tareas?.[0]?.id_supervisor || ""

    // 3. Prepare Default Values
    const deptosIds = task.departamentos_tareas?.map((d: any) => d.id_departamento.toString()) || []

    const defaultValues = {
        id_administrador: task.id_administrador?.toString() || "",
        id_edificio: task.id_edificio?.toString() || "",
        departamentos_ids: deptosIds,

        // Título vacío para forzar autogeneración limpia (Edificio + Deptos)
        titulo: "",

        // Reset inputs
        descripcion: "",
        prioridad: "media",
        id_supervisor: sourceSupervisorId, // HERENCIA DE SUPERVISOR
        id_asignado: "",
        fecha_visita: null,
        id_estado_nuevo: "1"
    }

    return (
        <div className="space-y-6 container mx-auto py-6 max-w-3xl">
            <div className="flex items-center mb-6">
                <Link href="/dashboard/tareas">
                    <Button variant="ghost" size="sm" className="mr-2">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Clonar Tarea</h1>
                    <p className="text-sm text-muted-foreground">Definiendo nueva fase basada en #{task.id} ({task.code})</p>
                </div>
            </div>

            <TaskWizard
                defaultValues={defaultValues}
            />
        </div>
    )
}
