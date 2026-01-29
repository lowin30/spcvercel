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
    searchParams: { [key: string]: string | string[] | undefined }
}

export default async function ClonarTareaPage({ params, searchParams }: ClonarTareaPageProps) {
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

    // --- LÓGICA DE MUTACIÓN DE TÍTULO (SPC v9.5) ---
    // Lista de oficios para remover del título original (Case Insensitive)
    const oficiosParaRemover = [
        "Pintura", "Albañilería", "Plomería", "Electricidad", "Gas",
        "Herrería", "Durlock", "Aire Acondicionado", "Carpintería", "Varios"
    ]

    function escapeRegExp(string: string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    let nuevoTitulo = task.titulo || ""

    // 1. Limpiar oficios anteriores (Soporte básico de acentos para regex simple)
    // Para simplificar, iteramos y reemplazamos variaciones comunes o usamos un replace robusto
    oficiosParaRemover.forEach(oficio => {
        // Crear regex que ignore case y acentos básica (a matches á)
        let pattern = escapeRegExp(oficio)
        pattern = pattern
            .replace(/a/gi, '[aá]')
            .replace(/e/gi, '[eé]')
            .replace(/i/gi, '[ií]')
            .replace(/o/gi, '[oó]')
            .replace(/u/gi, '[uú]')
            // También la versión con acento en el source
            .replace(/á/gi, '[aá]')
            .replace(/é/gi, '[eé]')
            .replace(/í/gi, '[ií]')
            .replace(/ó/gi, '[oó]')
            .replace(/ú/gi, '[uú]')

        const regex = new RegExp(`\\b${pattern}\\b`, 'gi')
        nuevoTitulo = nuevoTitulo.replace(regex, '')
    })

    // 2. Limpiar espacios dobles y trim
    nuevoTitulo = nuevoTitulo.replace(/\s+/g, ' ').trim()

    // 3. Agregar nuevos rubros desde URL
    const rubrosRaw = searchParams?.rubros
    const rubrosParam = typeof rubrosRaw === 'string' ? rubrosRaw.split(',') : []

    if (rubrosParam.length > 0) {
        const nuevosOficios = rubrosParam
            .map(r => r.charAt(0).toUpperCase() + r.slice(1)) // Capitalizar (plomeria -> Plomería)
            .join(' ')

        nuevoTitulo = `${nuevoTitulo} ${nuevosOficios}`.trim()
    }

    // Default Values
    const defaultValues = {
        id_administrador: task.id_administrador?.toString() || "",
        id_edificio: task.id_edificio?.toString() || "",
        departamentos_ids: deptosIds,

        // Título Mutado se asignará abajo al procesar searchParams
        titulo: nuevoTitulo,

        // Descripción automática
        descripcion: `Esta es la continuación de la tarea "${task.titulo}"\n\n${task.descripcion || ""}`,

        prioridad: "media",
        id_supervisor: sourceSupervisorId,
        id_asignado: task.id_asignado?.toString() || "", // HERENCIA DE ASIGNADO
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
