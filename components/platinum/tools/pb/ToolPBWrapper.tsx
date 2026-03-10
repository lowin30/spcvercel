"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FormularioPBPlatinum } from "./FormularioPBPlatinum"
import { WizardExpressPB } from "./WizardExpressPB"
import { createClient } from "@/lib/supabase-client"
import { getTareasSinPBAction } from "@/app/dashboard/presupuestos-base/actions-pb-express"
import { Loader2, Zap, LayoutDashboard, Wand2 } from "lucide-react"

export function ToolPBWrapper({ onPresupuestoCreado }: { onPresupuestoCreado?: () => void }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isOpen, setIsOpen] = useState(false)
    const [mode, setMode] = useState<"crear" | "editar" | null>(null)

    // States for dynamic data
    const [tareasDisponibles, setTareasDisponibles] = useState<any[]>([])
    const [isLoadingTareas, setIsLoadingTareas] = useState(false)
    const [presupuestoEditData, setPresupuestoEditData] = useState<any>(null)
    const [isLoadingEdit, setIsLoadingEdit] = useState(false)

    const action = searchParams.get('action')
    const editPb = searchParams.get('edit-pb')
    const idTareaParam = searchParams.get('id_tarea')

    // Listeners para abrir el Modal y Cargar Datos perezosamente
    useEffect(() => {
        if (action === 'crear-pb') {
            setMode("crear")
            setIsOpen(true)
            fetchTareasDisponibles()
        } else if (editPb) {
            setMode("editar")
            setIsOpen(true)
            fetchEditData(editPb)
        } else {
            setIsOpen(false)
            setMode(null)
            // reset clean
            setPresupuestoEditData(null)
        }
    }, [action, editPb])

    const fetchTareasDisponibles = async () => {
        setIsLoadingTareas(true)
        const res = await getTareasSinPBAction()
        if (res.success) {
            setTareasDisponibles(res.data)
        }
        setIsLoadingTareas(false)
    }

    const fetchEditData = async (id: string) => {
        setIsLoadingEdit(true)
        const supabase = createClient()
        const { data } = await supabase.from('presupuestos_base').select('*').eq('id', parseInt(id)).single()
        if (data) {
            setPresupuestoEditData(data)
        }
        setIsLoadingEdit(false)
    }

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            closeTool()
        }
    }

    const closeTool = () => {
        setIsOpen(false)
        const params = new URLSearchParams(searchParams.toString())
        params.delete('action')
        params.delete('edit-pb')
        params.delete('id_tarea')

        // Router push actualiza la URL en silencio y no destruye estados innecesarios
        router.push(`?${params.toString()}`, { scroll: false })

        if (onPresupuestoCreado) {
            onPresupuestoCreado()
        }

        router.refresh()
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[90vh] overflow-y-auto p-0 border border-primary/10 shadow-2xl rounded-2xl bg-gradient-to-b from-background to-muted/10">
                <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b p-4 sm:p-6 pb-4">
                    <DialogHeader>
                        <DialogTitle className="text-xl sm:text-2xl font-black flex items-center gap-2">
                            {mode === "editar" ? (
                                <>Editar Estimación PB</>
                            ) : (
                                <><Zap className="h-6 w-6 text-primary" /> <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">God Mode: Presupuesto Base</span></>
                            )}
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            {mode === "editar"
                                ? "Modifique los parámetros del costo estimado para este proyecto."
                                : "Sistema Inteligente de Generación de Proyectos y Presupuestos Atómicos."}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-4 sm:p-6 pt-2">
                    {mode === "crear" && (
                        <Tabs defaultValue="normal" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 rounded-xl bg-muted/50 p-1">
                                <TabsTrigger value="normal" className="rounded-lg text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                                    <LayoutDashboard className="w-4 h-4 mr-2 hidden sm:inline-block" /> Enlazar Tarea
                                </TabsTrigger>
                                <TabsTrigger value="express" className="rounded-lg text-xs sm:text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
                                    <Wand2 className="w-4 h-4 mr-2 hidden sm:inline-block" /> Magic Express
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="normal">
                                {isLoadingTareas ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6" /></div>
                                ) : (
                                    <FormularioPBPlatinum
                                        tareas={tareasDisponibles}
                                        onSuccess={closeTool}
                                        initialTareaId={idTareaParam || undefined}
                                    />
                                )}
                            </TabsContent>

                            <TabsContent value="express">
                                <WizardExpressPB onSuccess={closeTool} />
                            </TabsContent>
                        </Tabs>
                    )}

                    {mode === "editar" && (
                        <div className="mt-2">
                            {isLoadingEdit ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6" /></div>
                            ) : presupuestoEditData ? (
                                <FormularioPBPlatinum
                                    tareas={[]} // No necesita porque ya está enlazado en modo edit
                                    presupuesto={presupuestoEditData}
                                    onSuccess={closeTool}
                                    isReadOnly={presupuestoEditData.estado_operativo && presupuestoEditData.estado_operativo !== 'pendiente'}
                                />
                            ) : (
                                <div className="text-center text-red-500 p-4">Error al cargar datos del presupuesto.</div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
