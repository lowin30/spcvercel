"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, Building2, User, FileText, Zap, Plus, DollarSign } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { getEdificiosAction, getDepartamentosAction } from "@/app/dashboard/tareas/actions"
import { createExpressProjectPBAction, getCatalogosPBExpress } from "@/app/dashboard/presupuestos-base/actions-pb-express"
import { QuickDeptCreateForm } from "@/components/quick-dept-create-form"
import { MultiSelect } from "@/components/ui/multi-select"

interface WizardExpressPBProps {
    onSuccess: () => void
}

const STEPS = [
    { id: 1, title: 'Origen', icon: Building2 },
    { id: 2, title: 'Detalles', icon: FileText },
    { id: 3, title: 'Finanzas PB', icon: DollarSign }
]

export function WizardExpressPB({ onSuccess }: WizardExpressPBProps) {
    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true)

    // Catálogos
    const [administradores, setAdministradores] = useState<{ id: string; nombre: string }[]>([])
    const [supervisores, setSupervisores] = useState<{ id: string; email: string }[]>([])
    const [edificios, setEdificios] = useState<{ id: string; nombre: string }[]>([])
    const [departamentos, setDepartamentos] = useState<{ id: string; codigo: string }[]>([])

    // Estado del Formulario Tarea Express
    const [adminId, setAdminId] = useState("")
    const [edificioId, setEdificioId] = useState("")
    const [deptoIds, setDeptoIds] = useState<string[]>([]) // Usamos array para ser compatible con MultiSelect visualmente
    const [titulo, setTitulo] = useState("")
    const [descripcion, setDescripcion] = useState("")
    const [supervisorId, setSupervisorId] = useState("")

    // Estado del PM (Presupuesto Base)
    const [materiales, setMateriales] = useState("")
    const [manoObra, setManoObra] = useState("")
    const [notaPb, setNotaPb] = useState("")

    // UI States
    const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false)

    const totalCalculado = (Number.parseInt(materiales) || 0) + (Number.parseInt(manoObra) || 0)

    // Cargar Catálogos Iniciales
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoadingCatalogs(true)
            const res = await getCatalogosPBExpress()
            if (res.success && res.data) {
                setAdministradores(res.data.administradores)
                setSupervisores(res.data.supervisores)
            }
            setIsLoadingCatalogs(false)
        }
        loadInitialData()
    }, [])

    const fetchDepartamentos = async (edId: string) => {
        if (!edId) return
        const res = await getDepartamentosAction(parseInt(edId))
        if (res.success) {
            setDepartamentos(res.data.map((d: any) => ({ ...d, id: d.id.toString() })))
        }
    }

    // Cargar Edificios al cambiar Admin
    useEffect(() => {
        if (!adminId) {
            setEdificios([])
            setEdificioId("")
            return
        }
        const loadEdificios = async () => {
            const res = await getEdificiosAction(parseInt(adminId))
            if (res.success) {
                setEdificios(res.data.map((e: any) => ({ ...e, id: e.id.toString() })))
            }
        }
        loadEdificios()
    }, [adminId])

    // Cargar Deptos al cambiar Edificio
    useEffect(() => {
        if (!edificioId) {
            setDepartamentos([])
            setDeptoIds([])
            return
        }
        fetchDepartamentos(edificioId)
    }, [edificioId])

    // Auto-generar título
    useEffect(() => {
        if (edificioId) {
            const ed = edificios.find(e => e.id === edificioId)
            const deptoCode = departamentos.find(d => deptoIds.includes(d.id))?.codigo

            let newTitle = ed?.nombre || ""
            if (deptoCode) newTitle += ` - ${deptoCode}`

            // Si el usuario no ha editado manualmente o solo está autocompletando
            if (!titulo || titulo.startsWith(ed?.nombre || '')) {
                setTitulo(newTitle)
            }
        }
    }, [edificioId, deptoIds, edificios, departamentos])

    // Navigation
    const nextStep = () => {
        if (currentStep === 1) {
            if (!adminId || !edificioId) {
                toast.error("Administrador y Edificio son obligatorios para comenzar.")
                return
            }
        }
        if (currentStep === 2) {
            if (!titulo || !descripcion) {
                toast.error("El Título y la Descripción detallada son requeridos.")
                return
            }
        }
        setCurrentStep(prev => prev + 1)
    }

    const prevStep = () => setCurrentStep(prev => prev - 1)

    // Submit Atómico
    const handleSubmit = async () => {
        if (!materiales || !manoObra) {
            toast.error("Debes presupuestar montos válidos para Materiales y Mano de Obra (pueden ser 0).")
            return
        }

        setIsSubmitting(true)
        try {
            const res = await createExpressProjectPBAction({
                id_administrador: adminId,
                id_edificio: edificioId,
                id_departamento: deptoIds.length > 0 ? deptoIds[0] : undefined, // Express PBs by default link one depto currently in action signature
                titulo: titulo,
                descripcion: descripcion,
                id_supervisor: supervisorId || undefined,
                materiales: Number.parseInt(materiales) || 0,
                mano_obra: Number.parseInt(manoObra) || 0,
                nota_pb: notaPb
            })

            if (res.success) {
                toast.success("¡Proyecto Express Creado Exitosamente! (Tarea + Presupuesto Atómico)")
                onSuccess()
            } else {
                throw new Error(res.message)
            }
        } catch (error: any) {
            toast.error(error.message || "Fallo crítico en la creación del Proyecto Express.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderStep1_Origen = () => (
        <div className="space-y-5">
            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground ml-1">
                    <User className="h-4 w-4" /> Consorcio / Administración *
                </Label>
                <Select value={adminId} onValueChange={(v) => { setAdminId(v); setEdificioId(""); setDeptoIds([]) }} disabled={isSubmitting}>
                    <SelectTrigger className="h-12 sm:h-14 text-base sm:text-lg bg-muted/20 border-muted-foreground/20 shadow-sm rounded-xl focus:ring-primary/30">
                        <SelectValue placeholder="Selecciona Administración" />
                    </SelectTrigger>
                    <SelectContent>
                        {administradores.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground ml-1">
                    <Building2 className="h-4 w-4" /> Edificio Afectado *
                </Label>
                <Select value={edificioId} onValueChange={(v) => { setEdificioId(v); setDeptoIds([]) }} disabled={!adminId || isSubmitting}>
                    <SelectTrigger className="h-12 sm:h-14 text-base sm:text-lg bg-muted/20 border-muted-foreground/20 shadow-sm rounded-xl focus:ring-primary/30">
                        <SelectValue placeholder={adminId ? "Elige un Edificio" : "Espera Consorcio"} />
                    </SelectTrigger>
                    <SelectContent>
                        {edificios.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* Inception UI: Departamentos */}
            <div className="space-y-2 p-3 sm:p-4 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/10 to-transparent blur-xl rounded-full" />
                <Label className="text-sm font-semibold text-primary/80 ml-1">Ubicación Precisa (Sector/Depto)</Label>
                <div className="flex gap-2 items-start relative z-10 w-full">
                    <MultiSelect
                        className="flex-grow min-h-[48px] sm:min-h-[56px] bg-background/80 backdrop-blur-sm border-primary/20 rounded-xl"
                        options={departamentos.map(d => ({ value: d.id, label: d.codigo }))}
                        selected={deptoIds}
                        onChange={(v) => {
                            // Simulamos single select pero usando control MultiSelect para UI
                            if (v.length > 1) v = [v[v.length - 1]]
                            setDeptoIds(v)
                        }}
                        placeholder={departamentos.length > 0 ? "Selecciona Sector" : "Cargando sectores..."}
                        disabled={!edificioId || isSubmitting}
                    />

                    <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 border-dashed border-primary/40 text-primary hover:bg-primary/10 hover:border-primary rounded-xl transition-all shadow-sm"
                                disabled={!edificioId}
                                title="Crear sector faltante rápidamente"
                            >
                                <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Nuevo Sector / Departamento</DialogTitle>
                                <DialogDescription>
                                    Añade la unidad al edificio actual y úsala de inmediato en tu presupuesto.
                                </DialogDescription>
                            </DialogHeader>

                            <QuickDeptCreateForm
                                edificioId={parseInt(edificioId)}
                                onCancel={() => setIsDeptDialogOpen(false)}
                                onSuccess={(newId, newCode) => {
                                    setIsDeptDialogOpen(false)
                                    // Refresh the list immediately and select the new dept
                                    setDepartamentos(prev => {
                                        const newList = [...prev, { id: newId.toString(), codigo: newCode }]
                                        return newList
                                    })
                                    setDeptoIds([newId.toString()])
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="space-y-2 pt-2">
                <Label className="text-sm font-semibold text-muted-foreground ml-1">Delegar a Supervisor (Opcional)</Label>
                <Select value={supervisorId} onValueChange={setSupervisorId} disabled={isSubmitting}>
                    <SelectTrigger className="h-12 sm:h-14 bg-muted/20 border-muted-foreground/20 rounded-xl">
                        <SelectValue placeholder="Propio u Otro (Solo para referenciar la tarea)" />
                    </SelectTrigger>
                    <SelectContent>
                        {supervisores.map(s => <SelectItem key={s.id} value={s.id}>{s.email}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )

    const renderStep2_Detalles = () => (
        <div className="space-y-5">
            <div className="space-y-1 bg-gradient-to-r from-muted/50 to-muted/20 p-4 rounded-xl shadow-inner border border-muted-foreground/10 text-sm">
                <span className="font-bold text-foreground block mb-1">Contexto de la Tarea:</span>
                <span className="text-muted-foreground">{edificios.find(e => e.id === edificioId)?.nombre} {deptoIds.length > 0 ? `👉 Sec/Dpto: ${departamentos.find(d => d.id === deptoIds[0])?.codigo}` : ''}</span>
            </div>

            <div className="space-y-2">
                <Label className="text-sm font-semibold ml-1">Denominación del Proyecto (Título) *</Label>
                <Input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej: Trabajos en Azotea..."
                    disabled={isSubmitting}
                    className="h-12 sm:h-14 text-base sm:text-lg font-bold bg-muted/10 border-muted-foreground/30 shadow-sm rounded-xl focus-visible:ring-primary/50"
                />
            </div>

            <div className="space-y-2">
                <Label className="text-sm font-semibold ml-1">Descripción de la Misión *</Label>
                <Textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Detalla exactamente qué trabajos estimarás a nivel técnico y estratégico... (El Título genera el PB, la Descripción guía a los trabajadores)"
                    disabled={isSubmitting}
                    rows={6}
                    className="text-base resize-none bg-muted/10 border-muted-foreground/30 shadow-sm rounded-xl p-4 leading-relaxed focus-visible:ring-primary/50"
                />
            </div>
        </div>
    )

    const renderStep3_Finanzas = () => (
        <div className="space-y-6">
            <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 shadow-inner relative overflow-hidden mb-8">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                
                <p className="text-sm font-extrabold text-primary/80 uppercase tracking-[0.2em] mb-3 relative z-10 flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Estimación PB Total
                </p>
                <h2 className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 drop-shadow-sm relative z-10">
                    ${totalCalculado.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                    <Label htmlFor="mat" className="text-sm font-semibold ml-1 text-muted-foreground">Materiales ($) *</Label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            id="mat"
                            type="number"
                            value={materiales}
                            onChange={(e) => setMateriales(e.target.value)}
                            disabled={isSubmitting}
                            min="0"
                            className="h-14 sm:h-16 pl-10 text-lg sm:text-xl font-bold rounded-xl shadow-sm border-muted-foreground/20 bg-background"
                            placeholder="0"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="mo" className="text-sm font-semibold ml-1 text-muted-foreground">Mano de Obra ($) *</Label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            id="mo"
                            type="number"
                            value={manoObra}
                            onChange={(e) => setManoObra(e.target.value)}
                            disabled={isSubmitting}
                            min="0"
                            className="h-14 sm:h-16 pl-10 text-lg sm:text-xl font-bold rounded-xl shadow-sm border-muted-foreground/20 bg-background"
                            placeholder="0"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2 pt-2">
                <Label className="text-sm font-semibold ml-1">Notas Ejecutivas (Staff Interno)</Label>
                <Textarea
                    value={notaPb}
                    onChange={(e) => setNotaPb(e.target.value)}
                    placeholder="Anotaciones de margen de riesgo, proveedores clave, o recordatorios de estrategia..."
                    rows={4}
                    disabled={isSubmitting}
                    className="resize-none rounded-xl border-muted-foreground/20 bg-muted/10 p-4"
                />
            </div>
        </div>
    )

    // Initial Loading State
    if (isLoadingCatalogs) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground w-full">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Cargando consorcios de administración...</p>
            </div>
        )
    }

    return (
        <div className="w-full mt-2">
            {/* Progress Stepper Visual Premium */}
            <div className="flex justify-between mb-10 mt-4 relative px-2 sm:px-8">
                <div className="absolute top-1/2 left-8 right-8 h-1.5 bg-muted/40 -z-10 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-primary/50 to-primary transition-all duration-500 ease-in-out origin-left"
                        style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                    />
                </div>
                {STEPS.map((step) => {
                    const isActive = step.id === currentStep
                    const isCompleted = step.id < currentStep
                    const Icon = step.icon

                    return (
                        <div key={step.id} className="flex flex-col items-center bg-background px-2 relative">
                            <div
                                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-[3px] sm:border-4 transition-all duration-500 shadow-sm
                                 ${isActive ? 'border-primary bg-primary text-white scale-110 shadow-lg shadow-primary/40 ring-4 ring-primary/20' :
                                        isCompleted ? 'border-primary bg-primary text-white' : 'border-muted bg-background/80 backdrop-blur text-muted-foreground'}`}
                            >
                                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                            <span className={`text-[10px] sm:text-xs mt-3 font-bold uppercase tracking-widest absolute -bottom-7 sm:-bottom-8 text-center w-32 left-1/2 -translate-x-1/2 transition-colors duration-300
                                ${isActive ? 'text-primary' : 'text-muted-foreground/60'}`}>
                                {step.title}
                            </span>
                        </div>
                    )
                })}
            </div>

            <Card className="border-0 shadow-2xl overflow-hidden relative rounded-2xl bg-card border border-muted-foreground/10 ring-1 ring-black/5 dark:ring-white/5">
                {/* Decorative Glowing Effect */}
                <div className="absolute top-0 right-0 p-32 bg-primary/5 blur-3xl opacity-50 rounded-full pointer-events-none" />

                {/* Loading Overlay */}
                {isSubmitting && (
                    <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-md rounded-2xl flex items-center justify-center flex-col text-primary font-bold gap-6">
                        <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-primary" />
                        <p className="animate-pulse text-lg tracking-wide uppercase">Fabricando Sistema God Mode...</p>
                    </div>
                )}


                <CardContent className="pt-8 sm:pt-10 px-4 sm:px-8 min-h-[400px] sm:min-h-[380px] relative z-10 w-full overflow-x-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {currentStep === 1 && renderStep1_Origen()}
                            {currentStep === 2 && renderStep2_Detalles()}
                            {currentStep === 3 && renderStep3_Finanzas()}
                        </motion.div>
                    </AnimatePresence>
                </CardContent>

                <CardFooter className="flex flex-col-reverse sm:flex-row gap-3 border-t border-muted/30 pt-6 px-4 sm:px-8 bg-muted/5 w-full justify-between pb-6 relative z-10">
                    <Button
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto h-14 sm:h-12 rounded-xl border-muted-foreground/20 font-semibold hover:bg-muted/50"
                        onClick={prevStep}
                        disabled={currentStep === 1 || isSubmitting}
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" /> Regresar
                    </Button>

                    {currentStep < 3 ? (
                        <Button onClick={nextStep} size="lg" className="w-full sm:w-auto h-14 sm:h-12 rounded-xl font-bold bg-zinc-900 border-2 border-transparent hover:border-zinc-700 text-white shadow-lg hover:shadow-xl dark:bg-zinc-100 dark:text-zinc-900 dark:hover:border-zinc-300 transition-all">
                            Continuar <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="w-full sm:w-auto h-14 sm:h-12 rounded-xl font-black bg-gradient-to-br from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-primary-foreground shadow-xl shadow-primary/30 ring-1 ring-primary/50 transition-all">
                            <Zap className="mr-2 h-5 w-5 fill-current" /> Confirmar Lanzamiento
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}
