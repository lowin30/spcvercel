"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AssignSupervisorForm } from "@/components/assign-supervisor-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface AssignSupervisorClientProps {
    taskId: string
    tarea: { id: number; titulo: string }
    supervisorActual: any
    supervisores: any[]
}

export function AssignSupervisorClient({ taskId, tarea, supervisorActual, supervisores }: AssignSupervisorClientProps) {
    const router = useRouter()

    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <Button
                    variant="ghost"
                    size="sm"
                    className="mr-2"
                    onClick={() => router.push(`/dashboard/tareas/${taskId}`)}
                >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Volver a la tarea
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">Asignar supervisor a tarea</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Asignar supervisor a: {tarea.titulo}</CardTitle>
                    <CardDescription>Selecciona el supervisor que estará a cargo de esta tarea</CardDescription>
                </CardHeader>
                <CardContent>
                    <AssignSupervisorForm
                        taskId={taskId}
                        currentSupervisorId={supervisorActual?.id_supervisor || null}
                        supervisors={supervisores || []}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
