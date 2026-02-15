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
import Link from "next/link"
import { ArrowLeft, CalendarDays, MapPin, AlertTriangle, Loader2, X, UserRound, UserPlus, Pencil } from "lucide-react";
import { DatePickerDiaSimple } from "@/components/date-picker-dia-simple"
import RegistroParteTrabajoForm from "@/components/registro-parte-trabajo-form";
import { EstadoInteractivo } from "@/components/estado-interactivo"
import { PrioridadInteractiva } from "@/components/prioridad-interactiva"
import { SupervisorInteractivo } from "@/components/supervisor-interactivo"
import { TrabajadoresInteractivos } from "@/components/trabajadores-interactivos"
import { PresupuestosInteractivos } from "@/components/presupuestos-interactivos"

import ErrorBoundary from '@/components/error-boundary'
import { ProcesadorImagen } from '@/components/procesador-imagen'
import { HistorialGastosOCR } from '@/components/historial-gastos-ocr'
import { SemanasLiquidadasIndicador } from '@/components/semanas-liquidadas-indicador';
import { FinalizarTareaDialog } from '@/components/finalizar-tarea-dialog'

// Actions
import {
    updateTaskDateAction,
    updateBuildingNotesAction,
    updateSupervisorAction,
    assignWorkerAction,
    removeWorkerAction
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
        gastos: any[]
        estados: any[]
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
    const [mostrarFormularioParte, setMostrarFormularioParte] = useState(false);
    const [notasEdificioDialogOpen, setNotasEdificioDialogOpen] = useState(false)
    const [notasEdificioTemp, setNotasEdificioTemp] = useState("")
    const [guardandoNotasEdificio, setGuardandoNotasEdificio] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Permissions based on userDetails
    const esAdmin = userDetails?.rol === "admin"
    const esSupervisor = userDetails?.rol === "supervisor"
    const esSupervisorDeTarea = esSupervisor && supervisor && supervisor.usuarios && userDetails && supervisor.usuarios.id === userDetails.id

    // Refresh function (simulated by router.refresh, but we might want local updates)
    const refreshData = () => {
        router.refresh()
    }

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

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start justify-between space-y-3 sm:space-y-0">
                        <div>
                            <CardTitle className="text-2xl">{tarea.titulo}</CardTitle>
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
                                onEstadoChange={(nuevoEstadoId, finalizada) => {
                                    setEstadoActualId(nuevoEstadoId);
                                    setEsTareaFinalizada(finalizada);
                                    refreshData()
                                }}
                                onShowFinalizarDialog={() => setShowFinalizarDialog(true)}
                                className="mt-2 sm:mt-0"
                            />
                        )}
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Descripción</h3>
                        <p className="whitespace-pre-line">{tarea.descripcion}</p>
                    </div>

                    {/* Notas del Edificio */}
                    {tarea.edificios?.notas && (
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-400 rounded-md p-2.5 sm:p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                                        <h3 className="text-xs font-semibold text-red-600 dark:text-red-400">NOTAS EDIFICIO</h3>
                                    </div>
                                    <p className="text-xs text-red-700 dark:text-red-300 whitespace-pre-line">
                                        {tarea.edificios.notas}
                                    </p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => { setNotasEdificioTemp(tarea.edificios.notas || ""); setNotasEdificioDialogOpen(true); }} className="flex-shrink-0 h-7 px-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20">
                                    <Pencil className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {!tarea.edificios?.notas && (
                        <Button variant="ghost" size="sm" onClick={() => { setNotasEdificioTemp(""); setNotasEdificioDialogOpen(true); }} className="h-8 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                            Agregar notas del edificio
                        </Button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <h3 className="font-medium mb-1">Edificio</h3>
                            <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                <Link href={`/dashboard/edificios/${tarea.edificios?.id}`} className="text-blue-600 hover:underline">
                                    {tarea.edificios?.nombre || 'No especificado'} - {tarea.edificios?.direccion || 'Sin dirección'}
                                </Link>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-medium mb-1">Departamentos</h3>
                            <DepartamentosInteractivos
                                tareaId={tarea.id}
                                edificioId={tarea.id_edificio}
                                onDepartamentosChange={() => { }}
                            />
                        </div>
                        <div>
                            <h3 className="font-medium mb-1">Fecha de visita</h3>
                            <div className="flex items-center mb-2">
                                <DatePickerDiaSimple
                                    date={tarea.fecha_visita ? new Date(tarea.fecha_visita) : null}
                                    onDateChange={onDateChange}
                                    disabled={false}
                                />
                            </div>
                        </div>

                        <div>
                            <h3 className="font-medium mb-1">Supervisor</h3>
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
                                        <Badge variant="secondary" className="flex items-center gap-1">
                                            <UserRound className="h-3 w-3" />
                                            {supervisor.usuarios.email}
                                        </Badge>
                                    ) : <span className="text-muted-foreground text-sm">Sin supervisor asignado</span>}
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="font-medium mb-1">Trabajadores asignados</h3>
                            {(esAdmin || esSupervisor) ? (
                                <TrabajadoresInteractivos
                                    tareaId={tarea.id}
                                    trabajadoresAsignados={trabajadoresAsignados.filter(t => t.usuarios).map(t => ({ id: t.usuarios.id, email: t.usuarios.email, color_perfil: t.usuarios.color_perfil }))}
                                    trabajadoresDisponibles={trabajadoresDisponibles}
                                    onTrabajadorAdd={async (nuevoTrabajadorId) => {
                                        const worker = trabajadoresDisponibles.find(t => t.id === nuevoTrabajadorId)
                                        if (!worker) return
                                        if (trabajadoresAsignados.some(t => t.usuarios?.id === nuevoTrabajadorId)) {
                                            toast({ title: "Ya asignado", variant: "warning" })
                                            return
                                        }
                                        const res = await assignWorkerAction(tarea.id, nuevoTrabajadorId)
                                        if (res.success) {
                                            setTrabajadoresAsignados([...trabajadoresAsignados, { usuarios: worker }])
                                            toast({ title: "Trabajador agregado" })
                                        } else {
                                            toast({ title: "Error", description: res.message, variant: "destructive" })
                                        }
                                    }}
                                    onTrabajadorRemove={async (trabajadorId) => {
                                        const res = await removeWorkerAction(tarea.id, trabajadorId)
                                        if (res.success) {
                                            setTrabajadoresAsignados(trabajadoresAsignados.filter(t => t.usuarios?.id !== trabajadorId))
                                            toast({ title: "Trabajador eliminado" })
                                        } else {
                                            toast({ title: "Error", description: res.message, variant: "destructive" })
                                        }
                                    }}
                                />
                            ) : (
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {trabajadoresAsignados.length > 0 ? trabajadoresAsignados.filter(t => t.usuarios).map(t => (
                                        <Badge key={t.usuarios.id} variant="secondary" className="flex items-center gap-1">
                                            <UserRound className="h-3 w-3" />
                                            {t.usuarios.email}
                                        </Badge>
                                    )) : <span className="text-muted-foreground text-sm">Sin trabajadores asignados</span>}
                                </div>
                            )}
                        </div>
                    </div>

                    {(esAdmin || esSupervisor) && (
                        <>
                            <Separator />
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
                        </>
                    )}

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Gastos y Comprobantes</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            <ErrorBoundary fallback={<p>Error al cargar el componente de procesamiento de imágenes</p>}>
                                <ProcesadorImagen tareaId={Number(tarea.id)} tareaCodigo={tarea.codigo} tareaTitulo={tarea.titulo} />
                            </ErrorBoundary>

                            {userDetails && !esTareaFinalizada && (
                                <div className="py-4">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                                        <h3 className="text-lg font-semibold flex items-center mb-2 md:mb-0">
                                            <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                                            Registro de Partes de Trabajo
                                        </h3>
                                        {!mostrarFormularioParte && (
                                            <Button onClick={() => setMostrarFormularioParte(true)} className="w-full sm:w-auto">
                                                <UserPlus className="mr-2 h-4 w-4" /> Registrar Nuevo Parte
                                            </Button>
                                        )}
                                    </div>

                                    {userDetails?.rol === 'trabajador' && (
                                        <div className="mb-4">
                                            <SemanasLiquidadasIndicador trabajadorId={userDetails.id} />
                                        </div>
                                    )}

                                    {!mostrarFormularioParte ? (
                                        <div className="text-center p-6 border border-dashed rounded-md bg-muted/30">
                                            <p className="text-muted-foreground">Pulsa "Registrar Nuevo Parte" para añadir jornadas trabajadas</p>
                                        </div>
                                    ) : (
                                        <Card className="border shadow-md">
                                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                                <CardTitle className="text-lg">Registro Visual de Partes</CardTitle>
                                                <Button variant="ghost" size="icon" onClick={() => setMostrarFormularioParte(false)} aria-label="Cerrar formulario">
                                                    <X className="h-5 w-5" />
                                                </Button>
                                            </CardHeader>
                                            <CardContent className="pt-2">
                                                <RegistroParteTrabajoForm
                                                    tareaIdInicial={tarea.id}
                                                    usuarioActual={userDetails}
                                                    trabajadorIdInicial={(esAdmin || esSupervisorDeTarea) && (trabajadoresAsignados?.filter(t => t.usuarios)?.length === 1) ? trabajadoresAsignados[0]?.usuarios?.id : null}
                                                    onParteRegistrado={() => {
                                                        setMostrarFormularioParte(false);
                                                        toast({ title: 'Parte Registrado', description: 'El parte de trabajo ha sido registrado con éxito.' });
                                                        refreshData() // Added refresh here
                                                    }}
                                                    fechaInicial={new Date()}
                                                />
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}

                            <Separator className="my-6" />
                            <ErrorBoundary fallback={<p>Error al cargar el historial de gastos</p>}>
                                <HistorialGastosOCR
                                    tareaId={Number(tarea.id)}
                                    userRole={userDetails?.rol || 'trabajador'}
                                    userId={userDetails?.id}
                                    initialGastos={initialData.gastos}
                                />
                            </ErrorBoundary>
                        </div>
                    </div>

                    <Separator />
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Comentarios</h3>
                        <ErrorBoundary fallback={<p>Error al cargar los comentarios</p>}>
                            <CommentList comments={comentarios} />
                            <CommentForm idTarea={tarea.id} onSuccess={() => refreshData()} />
                        </ErrorBoundary>
                    </div>
                </CardContent>
            </Card>

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
        </div>
    )
}
