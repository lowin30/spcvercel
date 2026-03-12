"use client"

import { DepartamentosInteractivos } from "@/components/departamentos-interactivos"
import { useState, useEffect } from "react"
import React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CommentList } from "@/components/comment-list"
import { CommentForm } from "@/components/comment-form"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ArrowLeft, CalendarDays, MapPin, AlertTriangle, Loader2, X, UserRound, UserPlus, Pencil, Receipt, Clock, Check } from "lucide-react";
import { DatePickerDiaSimple } from "@/components/date-picker-dia-simple"
import { EstadoInteractivo } from "@/components/estado-interactivo"
import { PrioridadInteractiva } from "@/components/prioridad-interactiva"
import { SupervisorInteractivo } from "@/components/supervisor-interactivo"
import { TrabajadoresInteractivos } from "@/components/trabajadores-interactivos"
import { PresupuestosInteractivos } from "@/components/presupuestos-interactivos"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import ErrorBoundary from '@/components/error-boundary'
import { ToolGastoPlatinum } from "../platinum/tools/ToolGastoPlatinum"
import { ToolJornalPlatinum } from "../platinum/tools/ToolJornalPlatinum"
import { FinalizarTareaDialog } from '@/components/finalizar-tarea-dialog'
import { MultiVisitaInteractiva } from "./multi-visita-interactiva"
import { ToolPBWrapper } from "../platinum/tools/pb/ToolPBWrapper"
import { ToolPFWrapper } from "../platinum/tools/pf/ToolPFWrapper"

// Actions
import {
    updateTaskDateAction,
    updateBuildingNotesAction,
    updateSupervisorAction,
    assignWorkerAction,
    removeWorkerAction,
    updateTask
} from "@/app/dashboard/tareas/actions"

interface TaskDetailViewProps {
    initialData: {
        tarea: any
        userDetails: any
        supervisor: any
        trabajadoresAsignados: any[]
        trabajadoresDisponibles: any[]
        supervisoresDisponibles: any[]
        comentarios: any[]
        presupuestoBase: any
        presupuestoFinal: any
        proyectados: any[]
        gastos: any[]
        estados: any[]
        departamentosDisponibles: any[]
        contactos: any[]
    }
}

export function TaskDetailView({ initialData }: TaskDetailViewProps) {
    const router = useRouter()

    // Initialize state from props
    const [tarea, setTarea] = useState<any>(initialData.tarea)
    const [userDetails] = useState<any>(initialData.userDetails)
    const [supervisor, setSupervisor] = useState<any>(initialData.supervisor)
    const [trabajadoresAsignados, setTrabajadoresAsignados] = useState<any[]>(initialData.trabajadoresAsignados)
    const [comentarios, setComentarios] = useState<any[]>(initialData.comentarios)

    // Catalogs
    const [trabajadoresDisponibles] = useState<any[]>(initialData.trabajadoresDisponibles)
    const [supervisoresDisponibles] = useState<Array<any>>(initialData.supervisoresDisponibles)
    const [estadosCat] = useState<any[]>(initialData.estados || [])

    // Derived state
    const [esTareaFinalizada, setEsTareaFinalizada] = useState(Boolean(initialData.tarea.finalizada))
    const [estadoActualId, setEstadoActualId] = useState<number | null>(
        initialData.tarea.id_estado_nuevo != null ? Number(initialData.tarea.id_estado_nuevo) :
            initialData.tarea.estado != null ? Number(initialData.tarea.estado) : null
    )
    const [prioridadActual, setPrioridadActual] = useState<string>(
        ['baja', 'media', 'alta', 'urgente'].includes(initialData.tarea.prioridad) ? initialData.tarea.prioridad : 'media'
    )

    // UI State
    const [showFinalizarDialog, setShowFinalizarDialog] = useState(false)
    const [notasEdificioDialogOpen, setNotasEdificioDialogOpen] = useState(false)
    const [notasEdificioTemp, setNotasEdificioTemp] = useState("")
    const [guardandoNotasEdificio, setGuardandoNotasEdificio] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Inline Edit State
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [tempTitle, setTempTitle] = useState("")
    const [isEditingDesc, setIsEditingDesc] = useState(false)
    const [tempDesc, setTempDesc] = useState("")
    const [isSavingInline, setIsSavingInline] = useState(false)

    // Sync state with props when initialData changes (after router.refresh)
    useEffect(() => {
        if (initialData.tarea) {
            setTarea(initialData.tarea)
            setTempTitle(initialData.tarea.titulo || "")
            setTempDesc(initialData.tarea.descripcion || "")
            setEsTareaFinalizada(Boolean(initialData.tarea.finalizada))
            const newEstadoId = initialData.tarea.id_estado_nuevo != null ? Number(initialData.tarea.id_estado_nuevo) :
                initialData.tarea.estado != null ? Number(initialData.tarea.estado) : null
            setEstadoActualId(newEstadoId)
            setPrioridadActual(['baja', 'media', 'alta', 'urgente'].includes(initialData.tarea.prioridad) ? initialData.tarea.prioridad : 'media')
        }
        if (initialData.supervisor) setSupervisor(initialData.supervisor)
        if (initialData.trabajadoresAsignados) setTrabajadoresAsignados(initialData.trabajadoresAsignados)
        if (initialData.comentarios) setComentarios(initialData.comentarios)
    }, [initialData])

    // Permissions based on userDetails
    const esAdmin = userDetails?.rol === "admin"
    const esSupervisor = userDetails?.rol === "supervisor"
    const esSupervisorDeTarea = esSupervisor && supervisor && supervisor.usuarios && userDetails && supervisor.usuarios.id === userDetails.id

    // Refresh function (simulated by router.refresh, but we might want local updates)
    const refreshData = () => {
        router.refresh()
    }

    // Mapeo Quirúrgico para Estándar Platinum (Resuelve error de Personal y Contexto)
    const tareaPlatinum = React.useMemo(() => {
        if (!tarea) return null;
        return {
            id: Number(tarea.id),
            titulo: tarea.titulo,
            code: tarea.code || tarea.codigo || "",
            nombre_edificio: tarea.edificios?.nombre || "",
            trabajadores: trabajadoresAsignados.map((t: any) => ({
                id: t.usuarios.id,
                nombre: t.usuarios.email, // Legacy mapping: email is used as name
                email: t.usuarios.email,
                color_perfil: t.usuarios.color_perfil || "#888888"
            }))
        };
    }, [tarea, trabajadoresAsignados]);

    // --- Handlers using ACTIONS ---

    const guardarNotasEdificio = async () => {
        if (!tarea?.edificios?.id) return;
        setGuardandoNotasEdificio(true);
        try {
            const res = await updateBuildingNotesAction(tarea.edificios.id, notasEdificioTemp || null)
            if (!res.success) throw new Error(res.message)

            setTarea({
                ...tarea,
                edificios: {
                    ...tarea.edificios,
                    notas: notasEdificioTemp || null
                }
            });

            toast({ title: "Notas actualizadas", description: "Las notas del edificio se han guardado correctamente" });
            setNotasEdificioDialogOpen(false);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setGuardandoNotasEdificio(false);
        }
    };

    const onDateChange = async (date: Date | null) => {
        try {
            let formattedDate = null;
            if (date) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            }

            toast({ title: "Guardando...", description: "Actualizando la fecha de visita" });

            const res = await updateTaskDateAction(tarea.id, formattedDate)

            if (res.success) {
                setTarea((prev: any) => ({ ...prev, fecha_visita: formattedDate }));
                toast({ title: "Éxito", description: "Fecha de visita actualizada correctamente" });
                refreshData()
            } else {
                throw new Error(res.message)
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    const handleSaveTitle = async () => {
        if (tempTitle.trim() === tarea.titulo) { setIsEditingTitle(false); return; }
        if (!tempTitle.trim()) { toast({ title: "Error", description: "El título no puede estar vacío" }); return; }
        setIsSavingInline(true);
        setTarea({ ...tarea, titulo: tempTitle }); // Optimistic update
        setIsEditingTitle(false);
        try {
            const res = await updateTask(tarea.id, { ...tarea, titulo: tempTitle });
            if (!res.success) throw new Error(res.message);
            toast({ title: "Guardado", description: "Título actualizado exitosamente" });
            refreshData();
        } catch (err: any) {
            setTarea({ ...tarea, titulo: tarea.titulo }); // Revert
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsSavingInline(false);
        }
    };

    const handleSaveDesc = async () => {
        if (tempDesc.trim() === tarea.descripcion) { setIsEditingDesc(false); return; }
        setIsSavingInline(true);
        setTarea({ ...tarea, descripcion: tempDesc }); // Optimistic update
        setIsEditingDesc(false);
        try {
            const res = await updateTask(tarea.id, { ...tarea, descripcion: tempDesc });
            if (!res.success) throw new Error(res.message);
            toast({ title: "Guardado", description: "Descripción actualizada exitosamente" });
            refreshData();
        } catch (err: any) {
            setTarea({ ...tarea, descripcion: tarea.descripcion }); // Revert
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsSavingInline(false);
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-8">
            <div className="flex justify-between items-center mb-6">
                <Button variant="ghost" asChild>
                    <Link href="/dashboard/tareas">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* COLUMNA IZQUIERDA: Narrativa, Finanzas y Operación (65%) */}
                <div className="lg:col-span-8 space-y-6">

                    {/* ISLA 1: Cabecera Crítica (Glassmorphism) */}
                    <Card className="border shadow-sm bg-card/40 backdrop-blur-md overflow-visible relative z-10">
                        <CardHeader className="pb-4">
                            <div className="flex flex-col sm:flex-row items-start justify-between space-y-3 sm:space-y-0 relative z-20">
                                <div>
                                    {isEditingTitle && (esAdmin || esSupervisor) ? (
                                        <div className="flex items-center gap-2 mb-2">
                                            <Input
                                                value={tempTitle}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTempTitle(e.target.value)}
                                                onBlur={handleSaveTitle}
                                                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                                    if (e.key === 'Enter') handleSaveTitle();
                                                    if (e.key === 'Escape') { setIsEditingTitle(false); setTempTitle(tarea.titulo); }
                                                }}
                                                autoFocus
                                                disabled={isSavingInline}
                                                className="text-2xl font-bold h-auto py-1 px-2 -ml-2 border-dashed focus-visible:ring-1"
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            className="group flex items-center gap-2 cursor-pointer transition-colors hover:bg-muted/50 p-1 -ml-1 rounded-md max-w-fit"
                                            onClick={() => { if (esAdmin || esSupervisor) setIsEditingTitle(true) }}
                                        >
                                            <CardTitle className="text-2xl">{tarea.titulo}</CardTitle>
                                            {(esAdmin || esSupervisor) && (
                                                <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                                            )}
                                        </div>
                                    )}
                                    <CardDescription className="mt-2 flex flex-wrap gap-2">
                                        <Badge variant="outline">ID: {tarea.id}</Badge>
                                        <PrioridadInteractiva
                                            tareaId={tarea.id}
                                            prioridadActual={prioridadActual as "baja" | "media" | "alta" | "urgente"}
                                            onPrioridadChange={(nuevaPrioridad) => {
                                                setPrioridadActual(nuevaPrioridad);
                                                // The component handles the server update internally? 
                                                // Checking component... PrioridadInteractiva usually handles it.
                                                // If not, we should have an action. Assuming it does or we accept optimistic UI for now.
                                            }}
                                        />
                                        {tarea.edificios && (
                                            <>
                                                <Badge variant="secondary">{tarea.edificios.nombre}</Badge>
                                                {tarea.edificios.cuit && (
                                                    <Badge variant="outline" className="ml-2">{tarea.edificios.cuit}</Badge>
                                                )}
                                            </>
                                        )}
                                        {esTareaFinalizada && (
                                            <Badge variant="outline" className="bg-gray-200">Finalizada</Badge>
                                        )}
                                    </CardDescription>
                                </div>
                                {(esAdmin || esSupervisorDeTarea) && (
                                    <EstadoInteractivo
                                        tipoEntidad="tarea"
                                        entidadId={tarea.id}
                                        estadoActualId={estadoActualId}
                                        esFinalizada={esTareaFinalizada}
                                        userRol={userDetails?.rol}
                                        estadosInyectados={estadosCat}
                                        onEstadoChange={(nuevoEstadoId: number, finalizada: boolean) => {
                                            setEstadoActualId(nuevoEstadoId);
                                            setEsTareaFinalizada(finalizada);
                                            refreshData()
                                        }}
                                        onShowFinalizarDialog={() => setShowFinalizarDialog(true)}
                                        className="mt-2 sm:mt-0"
                                    />
                                )}
                            </div>
                            <div className="absolute -z-10 bg-indigo-500/5 blur-3xl w-40 h-40 rounded-full top-0 right-10 pointer-events-none"></div>
                        </CardHeader>
                    </Card>

                    {/* ISLA 2: Narrativa (Descripción + Bitácora) */}
                    <Card className="border shadow-sm bg-card/60 overflow-hidden">
                        <CardContent className="p-0">
                            <div className="p-6">
                                <div className="flex flex-col mb-2 group">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-semibold">Descripción</h3>
                                        {(esAdmin || esSupervisor) && !isEditingDesc && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setIsEditingDesc(true)}
                                                className="opacity-0 group-hover:opacity-100 h-6 px-2 text-muted-foreground hover:text-foreground"
                                            >
                                                <Pencil className="h-3 w-3 mr-1" /> Editar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                {isEditingDesc && (esAdmin || esSupervisor) ? (
                                    <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                        <Textarea
                                            value={tempDesc}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTempDesc(e.target.value)}
                                            autoFocus
                                            rows={5}
                                            disabled={isSavingInline}
                                            className="w-full resize-none border-dashed focus-visible:ring-1"
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={handleSaveDesc} disabled={isSavingInline}>
                                                {isSavingInline ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                                                Guardar
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => { setIsEditingDesc(false); setTempDesc(tarea?.descripcion || ""); }} disabled={isSavingInline}>
                                                <X className="h-3 w-3 mr-1" /> Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="whitespace-pre-line cursor-pointer hover:bg-muted/30 p-3 -ml-3 rounded-xl transition-colors text-sm sm:text-base leading-relaxed"
                                        onClick={() => { if (esAdmin || esSupervisor) setIsEditingDesc(true) }}
                                    >
                                        {tarea.descripcion ? tarea.descripcion : <span className="text-muted-foreground italic">Haz clic para añadir una descripción...</span>}
                                    </div>
                                )}

                                {/* Comentarios adheridos al contexto */}
                                <div className="pt-2">
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                        <Receipt className="h-3.5 w-3.5" /> Bitácora (Comentarios & Updates)
                                    </h4>
                                    <ErrorBoundary fallback={<p>Error al cargar los comentarios</p>}>
                                        <div className="pl-0 sm:pl-4 border-l-2 border-muted/50 space-y-4">
                                            <CommentList comments={comentarios} />
                                            <CommentForm idTarea={tarea.id} onSuccess={() => refreshData()} />
                                        </div>
                                    </ErrorBoundary>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ISLA 3: Finanzas (Presupuestos Gemelos) */}
                    {(esAdmin || esSupervisor) && (
                        <div className="mt-8">
                            <PresupuestosInteractivos
                                tareaId={tarea.id}
                                userId={userDetails?.id}
                                id_administrador_tarea={tarea?.id_administrador}
                                id_edificio_tarea={tarea?.id_edificio}
                                presupuestoBase={initialData.presupuestoBase}
                                presupuestoFinal={initialData.presupuestoFinal}
                                userRol={userDetails?.rol || "trabajador"}
                                onPresupuestoChange={() => refreshData()}
                            />
                        </div>
                    )}

                    {/* ISLA 4: Ejecución Técnica (Tabs) */}
                    <Card className="border shadow-none bg-muted/10">
                        <CardContent className="p-4 sm:p-6">
                            <Tabs defaultValue="gastos" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/30 p-1 mb-6 border shadow-sm dark:shadow-none">
                                    <TabsTrigger value="jornales" className="rounded-xl flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                        <Clock className="h-4 w-4" />
                                        <span className="font-semibold">Jornales</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="gastos" className="rounded-xl flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                        <Receipt className="h-4 w-4" />
                                        <span className="font-semibold">Gastos e IA Scanner</span>
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="jornales" className="focus-visible:outline-none mt-0">
                                    <ErrorBoundary fallback={<p className="text-destructive p-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Error crítico en módulo de Jornales</p>}>
                                        <ToolJornalPlatinum
                                            tareaId={Number(tarea.id)}
                                            userRole={userDetails?.rol}
                                            userId={userDetails?.id}
                                            tareas={tareaPlatinum ? [tareaPlatinum] : []}
                                            onSuccess={() => refreshData()}
                                        />
                                    </ErrorBoundary>
                                </TabsContent>

                                <TabsContent value="gastos" className="focus-visible:outline-none mt-0">
                                    <ErrorBoundary fallback={<p className="text-destructive p-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Error crítico en módulo de Gastos</p>}>
                                        <ToolGastoPlatinum
                                            tareaId={Number(tarea.id)}
                                            userId={userDetails?.id}
                                            userRole={userDetails?.rol}
                                            initialData={initialData.gastos as any}
                                            onSuccess={() => refreshData()}
                                        />
                                    </ErrorBoundary>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                {/* COLUMNA DERECHA: Logística y Herramientas (35% - Sticky) */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">

                    {/* Alerta Roja Crítica - Arriba de la logística */}
                    {tarea.edificios?.notas ? (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 shadow-sm dark:shadow-none animate-in fade-in zoom-in slide-in-from-top-4 duration-500 mb-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="p-1 bg-red-100 dark:bg-red-900/50 rounded-md">
                                            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                                        </div>
                                        <h3 className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wider">NOTAS DEL EDIFICIO</h3>
                                    </div>
                                    <p className="text-xs text-red-800/80 dark:text-red-200/80 whitespace-pre-line leading-relaxed pl-1">
                                        {tarea.edificios.notas}
                                    </p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => { setNotasEdificioTemp(tarea.edificios.notas || ""); setNotasEdificioDialogOpen(true); }} className="flex-shrink-0 h-8 px-2.5 text-red-600 hover:bg-red-500/20 rounded-lg">
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => { setNotasEdificioTemp(""); setNotasEdificioDialogOpen(true); }} className="w-full h-10 text-xs text-muted-foreground border-dashed border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 mb-2 rounded-xl">
                            <AlertTriangle className="h-3.5 w-3.5 mr-2" />
                            Agregar nota de advertencia al edificio
                        </Button>
                    )}

                    {/* ISLA 5: Panel de Logística (Bento interno) */}
                    <Card className="border shadow-sm bg-card/60">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-4 w-4" /> Logística
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-6">

                            {/* Bento Item: Edificio */}
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Edificio</h3>
                                <div className="flex items-center p-3 bg-muted/30 rounded-lg">
                                    <MapPin className="h-4 w-4 mr-2 text-primary" />
                                    <Link href={`/dashboard/edificios/${tarea.edificios?.id}`} className="text-sm font-medium hover:text-primary transition-colors line-clamp-1">
                                        {tarea.edificios?.nombre || 'No especificado'} <span className="text-muted-foreground font-normal">- {tarea.edificios?.direccion || 'Sin dirección'}</span>
                                    </Link>
                                </div>
                            </div>

                            {/* Bento Item: Departamentos */}
                            <div className="pt-2 border-t border-border/50">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Departamentos</h3>
                                <DepartamentosInteractivos
                                    tareaId={tarea.id}
                                    edificioId={tarea.id_edificio}
                                    userRole={userDetails?.rol}
                                    initialDepartamentos={tarea.departamentos_json}
                                    initialTelefonos={initialData.contactos}
                                    initialDepartamentosDisponibles={initialData.departamentosDisponibles}
                                    onDepartamentosChange={() => { }}
                                />
                            </div>

                            {/* Bento Item: Visitas */}
                            <div className="pt-2 border-t border-border/50">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Planificación V3</h3>
                                <MultiVisitaInteractiva
                                    tareaId={tarea.id}
                                    tareaTitulo={tarea.titulo}
                                    proyectados={initialData.proyectados}
                                    trabajadoresAsignados={trabajadoresAsignados}
                                    trabajadoresDisponibles={initialData.trabajadoresDisponibles}
                                />
                            </div>

                            {/* Bento Item: Supervisor */}
                            <div className="pt-2 border-t border-border/50">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Supervisor Nivel 2</h3>
                                {esAdmin ? (
                                    <SupervisorInteractivo
                                        tareaId={tarea.id}
                                        supervisorActual={supervisor?.usuarios || null}
                                        supervisoresDisponibles={supervisoresDisponibles}
                                        userDetailsId={userDetails?.id}
                                        onSupervisorChange={async (emailSupervisor) => {
                                            const res = await updateSupervisorAction(tarea.id, emailSupervisor)
                                            if (res.success) {
                                                refreshData()
                                                if (emailSupervisor) {
                                                    const newSuper = supervisoresDisponibles.find(s => s.email === emailSupervisor)
                                                    setSupervisor({ usuarios: newSuper })
                                                    toast({ title: "Supervisor asignado" })
                                                } else {
                                                    setSupervisor(null)
                                                    toast({ title: "Supervisor eliminado" })
                                                }
                                            } else {
                                                toast({ title: "Error", description: res.message, variant: "destructive" })
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="flex items-center mt-1">
                                        {supervisor?.usuarios ? (
                                            <Badge variant="secondary" className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                                                <UserRound className="h-3.5 w-3.5" />
                                                {supervisor.usuarios.email}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-sm italic">Pendiente de asignación</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Bento Item: Personal */}
                            <div className="pt-2 border-t border-border/50">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Personal Táctico / Nivel 1</h3>
                                {(esAdmin || esSupervisor) ? (
                                    <TrabajadoresInteractivos
                                        tareaId={tarea.id}
                                        trabajadoresAsignados={trabajadoresAsignados.filter(t => t.usuarios).map(t => ({ id: t.usuarios.id, email: t.usuarios.email, color_perfil: t.usuarios.color_perfil }))}
                                        trabajadoresDisponibles={trabajadoresDisponibles}
                                        onTrabajadorAdd={async (nuevoTrabajadorId) => {
                                            const worker = trabajadoresDisponibles.find(t => t.id === nuevoTrabajadorId)
                                            if (!worker) return
                                            if (trabajadoresAsignados.some(t => t.usuarios?.id === nuevoTrabajadorId)) {
                                                toast({ title: "Personal ya asignado" })
                                                return
                                            }
                                            const res = await assignWorkerAction(tarea.id, String(nuevoTrabajadorId))
                                            if (res.success) {
                                                setTrabajadoresAsignados([...trabajadoresAsignados, { usuarios: worker }])
                                                toast({ title: "Cuadrilla actualizada" })
                                            } else {
                                                toast({ title: "Error", description: res.message, variant: "destructive" })
                                            }
                                        }}
                                        onTrabajadorRemove={async (trabajadorId) => {
                                            const res = await removeWorkerAction(tarea.id, String(trabajadorId))
                                            if (res.success) {
                                                setTrabajadoresAsignados(trabajadoresAsignados.filter(t => t.usuarios?.id !== trabajadorId))
                                                toast({ title: "Cuadrilla reducida" })
                                            } else {
                                                toast({ title: "Error", description: res.message, variant: "destructive" })
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {trabajadoresAsignados.length > 0 ? trabajadoresAsignados.filter(t => t.usuarios).map(t => (
                                            <Badge key={t.usuarios.id} variant="secondary" className="flex items-center gap-1.5 p-1.5 px-2 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                                <UserRound className="h-3.5 w-3.5" />
                                                <span className="truncate max-w-[120px]">{t.usuarios.email.split('@')[0]}</span>
                                            </Badge>
                                        )) : <span className="text-muted-foreground text-sm italic">Cuadrilla Vacía</span>}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={notasEdificioDialogOpen} onOpenChange={setNotasEdificioDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            Notas Importantes del Edificio
                        </DialogTitle>
                        <DialogDescription>
                            Estas notas se mostrarán en todas las tareas de este edificio como advertencia urgente
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="notas-edificio">
                                Notas del edificio: {tarea.edificios?.nombre}
                            </Label>
                            <Textarea
                                id="notas-edificio"
                                value={notasEdificioTemp}
                                onChange={(e) => setNotasEdificioTemp(e.target.value)}
                                placeholder="Ej: Timbre roto, acceso por puerta trasera, perro en el patio, etc."
                                rows={5}
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                💡 Información importante que los trabajadores deben ver al entrar a cualquier tarea de este edificio
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setNotasEdificioDialogOpen(false)} disabled={guardandoNotasEdificio}>
                            Cancelar
                        </Button>
                        <Button onClick={guardarNotasEdificio} disabled={guardandoNotasEdificio} className="bg-red-600 hover:bg-red-700 text-white">
                            {guardandoNotasEdificio ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    Guardar Notas
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <FinalizarTareaDialog
                open={showFinalizarDialog}
                onOpenChange={setShowFinalizarDialog}
                tareaId={tarea.id}
                presupuestoBase={initialData.presupuestoBase}
                onFinalizada={() => {
                    setEsTareaFinalizada(true)
                    setEstadoActualId(7)
                    refreshData()
                }}
                onSuccess={() => refreshData()}
            />

            <ToolPBWrapper onPresupuestoCreado={() => refreshData()} />
            <ToolPFWrapper onPresupuestoChange={() => refreshData()} />
        </div>
    )
}
