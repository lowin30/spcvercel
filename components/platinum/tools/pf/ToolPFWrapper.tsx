"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Zap, LinkIcon, Wand2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { loadPFHub, loadPFCatalogs, getTareasConPBAprobadoSinPF, type PFHubData } from "@/app/dashboard/presupuestos-finales/loader-unified"
import { ExpressPFWizard } from "./ExpressPFWizard"
import { PFHubView } from "./PFHubView"

export function ToolPFWrapper({ onPresupuestoChange }: { onPresupuestoChange?: () => void }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isOpen, setIsOpen] = useState(false)
    const [mode, setMode] = useState<"crear" | "editar" | null>(null)

    // Data states
    const [hubData, setHubData] = useState<PFHubData | null>(null)
    const [catalogs, setCatalogs] = useState<any>(null)
    const [tareasDisponibles, setTareasDisponibles] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // After Express: transition to edit mode with the new PF id
    const [expressCreatedPfId, setExpressCreatedPfId] = useState<number | null>(null)

    const action = searchParams.get('action')
    const editPf = searchParams.get('edit-pf')
    const currentTaskId = searchParams.get('id_tarea')

    // Listen to URL params
    useEffect(() => {
        if (action === 'crear-pf') {
            setMode("crear")
            setIsOpen(true)
            loadCrearData()
        } else if (editPf) {
            setMode("editar")
            setIsOpen(true)
            loadEditData(parseInt(editPf))
        } else {
            setIsOpen(false)
            setMode(null)
            setHubData(null)
            setExpressCreatedPfId(null)
        }
    }, [action, editPf])

    // Express created a PF → switch to edit mode
    useEffect(() => {
        if (expressCreatedPfId) {
            setIsLoading(true) // <-- Set loading immediately
            setMode("editar")
            loadEditData(expressCreatedPfId)
        }
    }, [expressCreatedPfId])

    const loadCrearData = async () => {
        setIsLoading(true)
        try {
            const [cats, tareas] = await Promise.all([
                loadPFCatalogs(),
                getTareasConPBAprobadoSinPF()
            ])
            setCatalogs(cats)
            setTareasDisponibles(tareas || [])
        } finally {
            setIsLoading(false)
        }
    }

    const loadEditData = async (pfId: number) => {
        setIsLoading(true)
        try {
            const [data, cats] = await Promise.all([
                loadPFHub(pfId),
                loadPFCatalogs()
            ])
            setHubData(data)
            setCatalogs(cats)
        } finally {
            setIsLoading(false)
        }
    }

    const closeTool = useCallback(() => {
        setIsOpen(false)
        setHubData(null)
        setExpressCreatedPfId(null)
        const params = new URLSearchParams(searchParams.toString())
        params.delete('action')
        params.delete('edit-pf')
        router.push(`?${params.toString()}`, { scroll: false })
        if (onPresupuestoChange) onPresupuestoChange()
        router.refresh()
    }, [searchParams, router, onPresupuestoChange])

    const handleExpressSuccess = (pfId: number) => {
        // Persist in URL to avoid state conflicts and allow refresh
        const params = new URLSearchParams(searchParams.toString())
        params.delete('action')
        params.set('edit-pf', pfId.toString())
        router.push(`?${params.toString()}`, { scroll: false })

        // Also set local state for immediate transition feedback
        setExpressCreatedPfId(pfId)
    }

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && closeTool()}>
            <SheetContent
                side="bottom"
                className="h-[95dvh] rounded-t-3xl border-t-2 border-primary/20 p-0 overflow-hidden bg-gradient-to-b from-background to-muted/5"
            >
                {/* Sticky Header */}
                <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b px-5 py-4 safe-area-inset-top">
                    <SheetHeader className="text-left">
                        <SheetTitle className="text-lg font-black flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                                <Zap className="h-4 w-4 text-white" />
                            </div>
                            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                {mode === "editar" ? "Hub Financiero" : "Nuevo Presupuesto Final"}
                            </span>
                        </SheetTitle>
                        <SheetDescription className="text-xs text-muted-foreground">
                            {mode === "editar"
                                ? "Gestioná tu presupuesto, ítems y facturas en un solo lugar."
                                : "Creá un presupuesto final de forma rápida e inteligente."}
                        </SheetDescription>
                    </SheetHeader>
                </div>

                {/* Content */}
                <div className="overflow-y-auto h-[calc(95dvh-80px)] overscroll-contain">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-16 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground animate-pulse">Cargando datos...</span>
                        </div>
                    ) : mode === "crear" && !expressCreatedPfId ? (
                        <div className="p-5">
                            <Tabs defaultValue={currentTaskId ? "normal" : "express"} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl bg-muted/50 p-1 mb-5">
                                    <TabsTrigger
                                        value="express"
                                        className="rounded-lg text-xs font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                                    >
                                        <Wand2 className="w-4 h-4 mr-1.5" /> Express
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="normal"
                                        className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                                    >
                                        <LinkIcon className="w-4 h-4 mr-1.5" /> Enlazar Tarea
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="express">
                                    <ExpressPFWizard
                                        administradores={catalogs?.administradores || []}
                                        supervisores={catalogs?.supervisores || []}
                                        productos={catalogs?.productos || []}
                                        onSuccess={handleExpressSuccess}
                                    />
                                </TabsContent>

                                <TabsContent value="normal">
                                    <NormalCreateFlow
                                        tareas={tareasDisponibles}
                                        onClose={closeTool}
                                        selectedTareaId={currentTaskId ? parseInt(currentTaskId) : null}
                                    />
                                </TabsContent>
                            </Tabs>
                        </div>
                    ) : mode === "editar" ? (
                        hubData ? (
                            <PFHubView
                                data={hubData}
                                catalogs={catalogs}
                                onClose={closeTool}
                                onDataChange={() => {
                                    if (hubData.presupuesto?.id) {
                                        loadEditData(hubData.presupuesto.id)
                                    }
                                }}
                            />
                        ) : isLoading ? (
                            <div className="flex flex-col items-center justify-center p-16 gap-3 min-h-[400px]">
                                <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                                <div className="text-center">
                                    <p className="text-sm font-bold text-indigo-600 animate-pulse">Generando Hub Financiero...</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">Sincronizando ítems y facturas</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-16 gap-4 text-center">
                                <LinkIcon className="h-12 w-12 text-muted-foreground/30" />
                                <div>
                                    <p className="text-sm font-bold text-foreground">No se pudo cargar el presupuesto</p>
                                    <p className="text-xs text-muted-foreground mt-1">Es posible que no tengas permisos o el registro aún se esté procesando.</p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => expressCreatedPfId && loadEditData(expressCreatedPfId)}
                                        className="text-xs font-bold px-4 py-2 bg-indigo-500 text-white rounded-lg shadow-sm hover:bg-indigo-600 transition-colors"
                                    >
                                        Reintentar Carga
                                    </button>
                                    <button
                                        onClick={closeTool}
                                        className="text-xs font-bold px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="text-center text-muted-foreground p-12">
                            No se encontraron datos.
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}

/* Simple flow to link to an existing task with approved PB */
function NormalCreateFlow({
    tareas,
    onClose,
    selectedTareaId
}: {
    tareas: any[],
    onClose: () => void,
    selectedTareaId?: number | null
}) {
    const router = useRouter()

    if (tareas.length === 0) {
        return (
            <div className="text-center py-10 space-y-3">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                    <LinkIcon className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No hay tareas con PB aprobado sin presupuesto final.</p>
                <p className="text-xs text-muted-foreground/60">Usá el modo Express para crear todo de una vez.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Tareas con PB aprobado ({tareas.length})
            </p>
            {tareas.map((pb: any) => {
                const isSelectedContext = pb.id_tarea === selectedTareaId;

                return (
                    <button
                        key={pb.id}
                        onClick={() => {
                            // Navegación directa — NO llamar onClose() aquí.
                            // onClose() hace su propio router.push() que colisiona con este.
                            // El Sheet se desmonta solo al navegar a otra página.
                            router.push(`/dashboard/presupuestos-finales/nuevo?id_tarea=${pb.id_tarea}`)
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition-all group active:scale-[0.98] ${isSelectedContext
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-indigo-500'
                            : 'border-muted-foreground/10 bg-card hover:bg-muted/30 hover:border-primary/30'
                            }`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <p className={`text-sm font-bold transition-colors ${isSelectedContext ? 'text-indigo-600 dark:text-indigo-400' : 'group-hover:text-primary'}`}>
                                        {pb.tareas?.titulo || 'Sin título'}
                                    </p>
                                    {isSelectedContext && (
                                        <Badge className="bg-indigo-500 text-[9px] h-3.5 px-1 font-black rounded border-none text-white whitespace-nowrap">
                                            ESTA TAREA
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {pb.tareas?.edificios?.nombre || 'Sin edificio'} • PB: {pb.code}
                                </p>
                            </div>
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                ${(pb.total || 0).toLocaleString('es-AR')}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    )
}
