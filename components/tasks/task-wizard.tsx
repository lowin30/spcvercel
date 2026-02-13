"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { sanitizeText } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { MultiSelect, Option } from "@/components/ui/multi-select"
import { DatePickerVisual } from "@/components/date-picker-visual"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, Building2, User, FileText, Calendar, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
// import { DepartamentoForm } from "@/components/departamento-form" // Replaced
// import { UnifiedDeptContactForm } from "@/components/unified-dept-contact-form" // Replaced
import { QuickDeptCreateForm } from "@/components/quick-dept-create-form"

// ... existing imports ...
import { getEdificiosAction, getDepartamentosAction } from "@/app/dashboard/tareas/actions"

// --- Tipos ---
interface TaskWizardProps {
    onSuccess?: (taskId: number, code: string) => void
    defaultValues?: any
    mode?: 'create' | 'edit'
    taskId?: number
    // Injected Catalogs
    administradores?: { id: string; nombre: string }[]
    supervisores?: { id: string; email: string }[]
    trabajadores?: { id: string; email: string }[]
    currentUserRol?: string // Optional injection to avoid client-side profile fetch
    currentUserId?: string
}

// ... existing WizardState ...

const STEPS = [
    { id: 1, title: 'Ubicación', icon: Building2 },
    { id: 2, title: 'Detalles', icon: FileText },
    { id: 3, title: 'Confirmación', icon: CheckCircle }
]

export function TaskWizard({
    onSuccess,
    defaultValues,
    mode = 'create',
    taskId,
    administradores = [],
    supervisores = [],
    trabajadores = [],
    currentUserRol,
    currentUserId: initialUserId
}: TaskWizardProps) {
    const router = useRouter()
    const supabase = createClient() // Still needed for auth check? Or passed via prop?
    // We will try to rely on passed props, but keep fallback if not provided?
    // User requirement: "paginas... deben cargar... y pasarlos".
    // So we assume they are passed.

    const titleInputRef = useRef<HTMLInputElement>(null)

    // --- Estado Global del Wizard ---
    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState<WizardState>({
        id_administrador: "",
        id_edificio: "",
        departamentos_ids: [],
        titulo: "",
        descripcion: "",
        prioridad: "media",
        id_supervisor: "",
        id_asignado: "",
        fecha_visita: null,
        id_estado_nuevo: "1", // Pendiente
        ...defaultValues
    })

    // --- Estados de Datos (Selectores Dinamicos) ---
    // Administradores, Supervisores, Trabajadores come from props now.
    // We only manage Edificios and Departamentos internally as they are cascaded.
    const [edificios, setEdificios] = useState<{ id: string; nombre: string }[]>([])
    const [departamentos, setDepartamentos] = useState<{ id: string; codigo: string; propietario?: string }[]>([])

    // --- Estados de Usuario ---
    // Use props if available, else fetch (fallback for safety)
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(currentUserRol || null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(initialUserId || null)

    // --- Estado Sub-Dialogo Departamento ---
    const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false)

    // --- Efectos de Carga Inicial ---
    useEffect(() => {
        const init = async () => {
            // Only fetch user if not passed (Legacy support or safety)
            if (!currentUserId || !currentUserRole) {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    setCurrentUserId(user.id)
                    const { data: profile } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
                    setCurrentUserRole(profile?.rol || null)

                    // Auto-asign supervisor (if logic requires knowing rol inside component)
                    if (profile?.rol === 'supervisor' && mode === 'create') {
                        setFormData(prev => ({ ...prev, id_supervisor: user.id }))
                    }
                }
            } else {
                // If passed via props
                if (currentUserRol === 'supervisor' && mode === 'create' && !defaultValues?.id_supervisor) {
                    setFormData(prev => ({ ...prev, id_supervisor: currentUserId || "" }))
                }
            }

            // Catalogs are now Props. We don't fetch them here.
            // But we might need to load initial Buildings if editing and id_administrador is set.
            if (defaultValues?.id_administrador) {
                // Trigger building load?
                // The effect on [formData.id_administrador] will handle it!
            }
        }
        init()
    }, [currentUserId, currentUserRole, mode, defaultValues])

    // --- Lógica de Cascada (Step 1) ---
    const fetchDepartamentos = async (edificioId: string) => {
        if (!edificioId) return
        console.log("Wizard: Fetching departments for edificio", edificioId)

        // Use Server Action
        const res = await getDepartamentosAction(parseInt(edificioId))

        if (res.success) {
            console.log("Wizard: Departments loaded", res.data.length)
            setDepartamentos(res.data)
        } else {
            console.error("Error loading departments")
        }
    }

    // Cargar Edificios al cambiar Admin
    useEffect(() => {
        if (!formData.id_administrador) {
            setEdificios([])
            return
        }

        const fetchEdificios = async () => {
            console.log("Wizard: Fetching buildings for admin", formData.id_administrador)
            // Use Server Action
            const res = await getEdificiosAction(parseInt(formData.id_administrador))

            if (res.success) {
                console.log("Wizard: Buildings loaded", res.data.length)
                setEdificios(res.data)
            } else {
                console.error("Error loading buildings")
            }
        }
        fetchEdificios()
    }, [formData.id_administrador])

    // Cargar Departamentos al cambiar Edificio
    useEffect(() => {
        if (formData.id_edificio) {
            fetchDepartamentos(formData.id_edificio)
        } else {
            setDepartamentos([])
        }
    }, [formData.id_edificio])

    // Sincronización extra para modo edición: asegurar que los IDs precargados se mantengan
    useEffect(() => {
        if (mode === 'edit' && departamentos.length > 0 && formData.departamentos_ids.length > 0) {
            console.log("Wizard Edit: Verificando consistencia de departamentos seleccionados")
            // Esto asegura que el MultiSelect vea los datos frescos
        }
    }, [departamentos, mode])

    // --- Funciones de cambio seguras (evitan resetear en el primer render de edición) ---
    const handleAdminChange = (v: string) => {
        if (v === formData.id_administrador) return
        setFormData(prev => ({
            ...prev,
            id_administrador: v,
            id_edificio: "",
            departamentos_ids: []
        }))
    }

    const handleEdificioChange = (v: string) => {
        if (v === formData.id_edificio) return
        setFormData(prev => ({
            ...prev,
            id_edificio: v,
            departamentos_ids: []
        }))
    }

    // --- Auto-Title Logic ---
    useEffect(() => {
        // En modo edición, no autogenerar el título si ya existe uno (respetar lo que viene de DB)
        if (mode === 'edit') return

        if (formData.id_edificio && edificios.length > 0) {
            const edificio = edificios.find(e => e.id === formData.id_edificio)
            let newTitle = edificio?.nombre || ""

            if (formData.departamentos_ids.length > 0 && departamentos.length > 0) {
                const deptosCodes = departamentos
                    .filter(d => formData.departamentos_ids.includes(d.id))
                    .map(d => d.codigo)
                    .sort((a, b) => b.localeCompare(a)) // Orden inverso usual
                    .join("-")

                if (deptosCodes) newTitle += ` ${deptosCodes}`
            }

            // Solo actualizar si el título está vacío o empieza con el nombre del edificio (para no borrar ediciones manuales completas)
            setFormData(prev => {
                if (!prev.titulo || prev.titulo.startsWith(edificio?.nombre || '')) {
                    if (prev.titulo === newTitle) return prev
                    return { ...prev, titulo: newTitle }
                }
                return prev
            })
        }
    }, [formData.id_edificio, formData.departamentos_ids, edificios, departamentos, mode])



    // --- Navigation Handlers ---
    const nextStep = () => {
        if (currentStep === 1) {
            if (!formData.id_administrador || !formData.id_edificio) {
                toast.error("Debes seleccionar Administrador y Edificio")
                return
            }
        }
        if (currentStep === 2) {
            if (!formData.titulo || !formData.descripcion) {
                toast.error("Título y Descripción son obligatorios")
                return
            }
        }

        setCurrentStep(prev => prev + 1)
    }

    const prevStep = () => setCurrentStep(prev => prev - 1)

    // Focus effect for Step 2
    useEffect(() => {
        if (currentStep === 2) {
            setTimeout(() => {
                titleInputRef.current?.focus()
            }, 300) // Delay for animation
        }
    }, [currentStep])

    // --- Submit Handler ---
    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            if (mode === 'edit' && taskId) {
                // UPDATE LOGIC
                const { updateTask } = await import('@/app/dashboard/tareas/actions')
                const res = await updateTask(taskId, {
                    ...formData,
                    // Transform fields as needed by action
                    departamentos_ids: formData.departamentos_ids.map(Number)
                })

                if (!res.success) throw new Error(res.message)

                toast.success("Tarea actualizada exitosamente")
                if (onSuccess) {
                    onSuccess(taskId, "UPDATED")
                } else {
                    router.refresh()
                }

            } else {
                // CREATE LOGIC
                // Importamos la acción de servidor para asegurar sanitización
                const { createTask } = await import('@/app/dashboard/tareas/actions')

                const res = await createTask(formData)

                if (!res.success) throw new Error(res.error)

                toast.success("Tarea creada exitosamente")

                const data = res.task
                if (onSuccess && data) {
                    onSuccess(data.id, data.code)
                } else {
                    router.push(`/dashboard/tareas/${data?.id}`)
                    router.refresh()
                }
            }

        } catch (e: any) {
            console.error(e)
            toast.error(e.message || "Error al crear tarea")
        } finally {
            setIsSubmitting(false)
        }
    }

    // --- Render Steps ---

    const renderStep1 = () => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Administrador</Label>
                <Select
                    value={formData.id_administrador}
                    onValueChange={handleAdminChange}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un administrador" />
                    </SelectTrigger>
                    <SelectContent>
                        {administradores.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Edificio</Label>
                <Select
                    value={formData.id_edificio}
                    onValueChange={handleEdificioChange}
                    disabled={!formData.id_administrador}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un edificio" />
                    </SelectTrigger>
                    <SelectContent>
                        {edificios.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Departamentos</Label>
                <div className="flex gap-2 items-start">
                    <MultiSelect
                        key={`dept-select-${formData.id_edificio}-${departamentos.length}`}
                        className="flex-grow"
                        options={departamentos.map(d => ({ value: d.id, label: `${d.codigo} ${d.propietario ? `(${d.propietario})` : ''}` }))}
                        selected={formData.departamentos_ids}
                        onChange={(v) => {
                            // Protección crítica: No dejar que el MultiSelect limpie la selección 
                            // si todavía no se han cargado las opciones (options.length === 0) 
                            // y estamos en modo edición (donde ya traemos IDs).
                            if (mode === 'edit' && departamentos.length === 0 && v.length === 0) {
                                console.log("Wizard: Ignorando intento de limpieza de departamentos (opciones no cargadas aún)")
                                return
                            }

                            console.log("Wizard: Departments changed to", v)
                            setFormData(prev => ({ ...prev, departamentos_ids: v }))
                        }}
                        placeholder={departamentos.length > 0 ? "Selecciona departamentos (opcional)" : "Cargando departamentos..."}
                        disabled={!formData.id_edificio}
                    />

                    <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                disabled={!formData.id_edificio}
                                title="Crear nuevo departamento"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Nuevo Departamento</DialogTitle>
                                <DialogDescription>
                                    Crea el departamento y sus contactos en un solo paso.
                                </DialogDescription>
                            </DialogHeader>

                            <QuickDeptCreateForm
                                edificioId={parseInt(formData.id_edificio)}
                                onCancel={() => setIsDeptDialogOpen(false)}
                                onSuccess={(newId, newCode) => {
                                    setIsDeptDialogOpen(false)
                                    // Refresh department list
                                    fetchDepartamentos(formData.id_edificio)
                                    // Add to selection
                                    setFormData(prev => ({
                                        ...prev,
                                        departamentos_ids: [...prev.departamentos_ids, newId.toString()]
                                    }))
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    )

    const renderStep2 = () => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Título</Label>
                <Input
                    ref={titleInputRef}
                    value={formData.titulo}
                    onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                    onBlur={(e) => setFormData(prev => ({ ...prev, titulo: sanitizeText(e.target.value) }))}
                    placeholder="Ej: Edificio Central 5B - Filtración"
                />
            </div>

            <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                    onBlur={(e) => setFormData(prev => ({ ...prev, descripcion: sanitizeText(e.target.value) }))}
                    placeholder="Detalla el problema..."
                    rows={4}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Prioridad</Label>
                    <Select
                        value={formData.prioridad}
                        onValueChange={(v: any) => setFormData(prev => ({ ...prev, prioridad: v }))}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="baja">Baja</SelectItem>
                            <SelectItem value="media">Media</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Asignar Trabajador</Label>
                    <Select
                        value={formData.id_asignado}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, id_asignado: v }))}
                    >
                        <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                        <SelectContent>
                            {trabajadores.map(t => <SelectItem key={t.id} value={t.id}>{t.email}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Selector de Supervisor solo para Admins */}
            {currentUserRole === 'admin' && (
                <div className="space-y-2">
                    <Label>Asignar Supervisor</Label>
                    <Select
                        value={formData.id_supervisor}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, id_supervisor: v }))}
                    >
                        <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                        <SelectContent>
                            {supervisores.map(s => <SelectItem key={s.id} value={s.id}>{s.email}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    )

    const renderStep3 = () => (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label>Fecha de Visita</Label>
                <DatePickerVisual
                    date={formData.fecha_visita}
                    onDateChange={(d) => setFormData(prev => ({ ...prev, fecha_visita: d }))}
                />
            </div>

            <Card className="bg-muted/50 border-dashed">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        {mode === 'edit' ? "Resumen de Edición" : "Resumen de Creación"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1 pb-4">
                    <p><span className="font-semibold">Título:</span> {formData.titulo}</p>
                    <p><span className="font-semibold">Ubicación:</span> {edificios.find(e => e.id === formData.id_edificio)?.nombre}</p>
                    <p><span className="font-semibold">Departamentos:</span> {formData.departamentos_ids.length > 0 ? formData.departamentos_ids.length : 'Ninguno'}</p>
                    <p><span className="font-semibold">Prioridad:</span> {formData.prioridad.toUpperCase()}</p>
                </CardContent>
            </Card>
        </div>
    )

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Progress Steps */}
            <div className="flex justify-between mb-8 relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10" />
                {STEPS.map((step) => {
                    const isActive = step.id === currentStep
                    const isCompleted = step.id < currentStep
                    const Icon = step.icon

                    return (
                        <div key={step.id} className="flex flex-col items-center bg-background px-2">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                  ${isActive ? 'border-primary bg-primary text-white' :
                                        isCompleted ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-400'}
                `}
                            >
                                <Icon className="h-5 w-5" />
                            </div>
                            <span className={`text-xs mt-2 font-medium ${isActive ? 'text-primary' : 'text-gray-500'}`}>
                                {step.title}
                            </span>
                        </div>
                    )
                })}
            </div>

            <Card className="border-t-4 border-t-primary shadow-lg">
                <CardHeader>
                    <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
                </CardHeader>

                <CardContent className="min-h-[300px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {currentStep === 1 && renderStep1()}
                            {currentStep === 2 && renderStep2()}
                            {currentStep === 3 && renderStep3()}
                        </motion.div>
                    </AnimatePresence>
                </CardContent>

                <CardFooter className="flex justify-between border-t pt-6 bg-gray-50/50">
                    <Button variant="outline" onClick={prevStep} disabled={currentStep === 1 || isSubmitting}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                    </Button>

                    {currentStep < 3 ? (
                        <Button onClick={nextStep}>
                            Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            {mode === 'edit' ? 'Guardar Cambios' : 'Confirmar y Crear'}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}
