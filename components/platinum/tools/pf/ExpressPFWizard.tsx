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

import { getEdificiosAction, getDepartamentosAction, saveBudgetAction } from "@/app/dashboard/tareas/actions"
import { createExpressProjectAction } from "@/app/dashboard/presupuestos-finales/actions-express"
import { QuickDeptCreateForm } from "@/components/quick-dept-create-form"
import { MultiSelect } from "@/components/ui/multi-select"

interface ExpressPFWizardProps {
    administradores: { id: string; nombre: string }[]
    supervisores: { id: string; email: string }[]
    productos: any[]
    onSuccess: (pfId: number) => void
}

const STEPS = [
    { id: 1, title: 'Origen', icon: Building2 },
    { id: 2, title: 'Detalles', icon: FileText },
    { id: 3, title: 'Ítems PF', icon: DollarSign }
]

export function ExpressPFWizard({ administradores, supervisores, productos, onSuccess }: ExpressPFWizardProps) {
    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form State (Task/PB)
    const [adminId, setAdminId] = useState("")
    const [edificioId, setEdificioId] = useState("")
    const [deptoIds, setDeptoIds] = useState<string[]>([])
    const [titulo, setTitulo] = useState("")
    const [descripcion, setDescripcion] = useState("")
    const [supervisorId, setSupervisorId] = useState("")

    // Financial State (Atomic PB - used for the auto-created PB)
    const [materialesPB, setMaterialesPB] = useState("0")
    const [manoObraPB, setManoObraPB] = useState("0")

    // Items State (The real PF data)
    const [items, setItems] = useState<any[]>([])
    const [newItem, setNewItem] = useState({ descripcion: '', cantidad: 1, precio: 0 })

    // Cascaded Data
    const [edificios, setEdificios] = useState<{ id: string; nombre: string }[]>([])
    const [departamentos, setDepartamentos] = useState<{ id: string; codigo: string }[]>([])

    // UI States
    const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false)

    const totalPF = items.reduce((acc, item) => acc + (item.cantidad * item.precio), 0)

    // Load Buildings when Admin changes
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

    // Load Depts when Building changes
    useEffect(() => {
        if (!edificioId) {
            setDepartamentos([])
            setDeptoIds([])
            return
        }
        const loadDepto = async () => {
            const res = await getDepartamentosAction(parseInt(edificioId))
            if (res.success) {
                setDepartamentos(res.data.map((d: any) => ({ ...d, id: d.id.toString() })))
            }
        }
        loadDepto()
    }, [edificioId])

    // Auto-generate title
    useEffect(() => {
        if (edificioId) {
            const ed = edificios.find(e => e.id === edificioId)
            const deptoCode = departamentos.find(d => deptoIds.includes(d.id))?.codigo

            let newTitle = ed?.nombre || ""
            if (deptoCode) newTitle += ` - ${deptoCode}`

            if (!titulo || titulo.startsWith(ed?.nombre || '')) {
                setTitulo(newTitle)
            }
        }
    }, [edificioId, deptoIds, edificios, departamentos])

    // Navigation
    const nextStep = () => {
        if (currentStep === 1) {
            if (!adminId || !edificioId) {
                toast.error("Administrador y Edificio son obligatorios.")
                return
            }
        }
        if (currentStep === 2) {
            if (!titulo || !descripcion) {
                toast.error("Título y Descripción son obligatorios.")
                return
            }
        }
        setCurrentStep(prev => prev + 1)
    }

    const prevStep = () => setCurrentStep(prev => prev - 1)

    // Submit Action
    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            // Step 1: Create Task + PB (Atomic)
            // We use the PF totals as the PB estimate for consistency
            const totalMaterialesFromItems = items.reduce((acc, item) => (item.es_material || item.producto_id) ? acc + (item.cantidad * item.precio) : acc, 0)
            const totalManoObraFromItems = items.reduce((acc, item) => !(item.es_material || item.producto_id) ? acc + (item.cantidad * item.precio) : acc, 0)

            const res = await createExpressProjectAction({
                id_administrador: adminId,
                id_edificio: edificioId,
                id_departamento: deptoIds.length > 0 ? deptoIds[0] : undefined,
                titulo: titulo,
                descripcion: descripcion,
                id_supervisor: supervisorId || undefined,
                materiales: totalMaterialesFromItems || 0,
                mano_obra: totalManoObraFromItems || 0
            })

            if (!res.success) throw new Error(res.message)

            // Step 2: Create PF linked to this task with items (Code handled by DB trigger)
            const pfRes = await saveBudgetAction({
                tipo: 'final',
                budgetData: {
                    id_tarea: res.taskId!,
                    id_presupuesto_base: res.pbId!,
                    id_administrador: parseInt(adminId),
                    id_edificio: parseInt(edificioId),
                    code: null, // <--- Deja que el trigger de DB genere PF-000000XXX
                    id_estado: 1,
                    total: totalPF,
                    materiales: totalMaterialesFromItems,
                    mano_obra: totalManoObraFromItems,
                    total_base: totalMaterialesFromItems + totalManoObraFromItems,
                    ajuste_admin: 0,
                    observaciones_admin: null
                },
                items: items.map(item => ({
                    ...item,
                    es_material: !!(item.es_material || item.producto_id)
                })),
                isEditing: false,
            })

            if (!pfRes.success) throw new Error(pfRes.message || 'Error al crear PF')

            toast.success("¡Proyecto Express y Presupuesto Final creados!")
            onSuccess(pfRes.data.id)

        } catch (error: any) {
            toast.error(error.message || "Error al crear proyecto")
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderStep1_Origen = () => (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground ml-1">
                    <User className="h-4 w-4" /> Administración *
                </Label>
                <Select value={adminId} onValueChange={(v) => { setAdminId(v); setEdificioId(""); setDeptoIds([]) }}>
                    <SelectTrigger className="h-12 text-base bg-muted/20 border-muted-foreground/20 rounded-xl">
                        <SelectValue placeholder="Selecciona Administración" />
                    </SelectTrigger>
                    <SelectContent>
                        {administradores?.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground ml-1">
                    <Building2 className="h-4 w-4" /> Edificio *
                </Label>
                <Select value={edificioId} onValueChange={(v) => { setEdificioId(v); setDeptoIds([]) }} disabled={!adminId}>
                    <SelectTrigger className="h-12 text-base bg-muted/20 border-muted-foreground/20 rounded-xl">
                        <SelectValue placeholder={adminId ? "Elige un Edificio" : "Elige una Administración primero"} />
                    </SelectTrigger>
                    <SelectContent>
                        {edificios.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <Label className="text-sm font-semibold text-primary/80 ml-1">Sector / Departamento</Label>
                <div className="flex gap-2 mt-1">
                    <MultiSelect
                        className="flex-grow min-h-[48px] bg-background/80"
                        options={departamentos.map(d => ({ value: d.id, label: d.codigo }))}
                        selected={deptoIds}
                        onChange={(v) => {
                            if (v.length > 1) v = [v[v.length - 1]]
                            setDeptoIds(v)
                        }}
                        placeholder={departamentos.length > 0 ? "Selecciona Sector" : "Opcional"}
                        disabled={!edificioId}
                    />
                    <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="h-12 w-12 shrink-0 border-dashed border-primary/40 text-primary rounded-xl" disabled={!edificioId}>
                                <Plus className="h-6 w-6" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nuevo Sector</DialogTitle>
                            </DialogHeader>
                            <QuickDeptCreateForm
                                edificioId={parseInt(edificioId)}
                                onCancel={() => setIsDeptDialogOpen(false)}
                                onSuccess={(id, code) => {
                                    setIsDeptDialogOpen(false)
                                    setDepartamentos(prev => [...prev, { id: id.toString(), codigo: code }])
                                    setDeptoIds([id.toString()])
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground ml-1">Supervisor (Opcional)</Label>
                <Select value={supervisorId} onValueChange={setSupervisorId}>
                    <SelectTrigger className="h-12 bg-muted/20 border-muted-foreground/20 rounded-xl">
                        <SelectValue placeholder="Propio o Supervisor asignado" />
                    </SelectTrigger>
                    <SelectContent>
                        {supervisores?.map(s => <SelectItem key={s.id} value={s.id}>{s.email}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )

    const renderStep2_Detalles = () => (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label className="text-sm font-semibold ml-1">Título del Proyecto *</Label>
                <Input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej: Pintura de fachada - Lado A"
                    className="h-12 text-lg font-bold bg-muted/10 border-muted-foreground/30 rounded-xl"
                />
            </div>

            <div className="space-y-2">
                <Label className="text-sm font-semibold ml-1">Descripción detallada *</Label>
                <Textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Describe el alcance técnico y operativo..."
                    rows={8}
                    className="text-base bg-muted/10 border-muted-foreground/30 rounded-xl p-4 resize-none"
                />
            </div>
        </div>
    )

    const addItem = () => {
        if (!newItem.descripcion || newItem.cantidad <= 0 || newItem.precio <= 0) {
            toast.error("Completá descripción, cantidad y precio del ítem.")
            return
        }
        
        const descLower = newItem.descripcion.toLowerCase()
        const esMaterialAuto = [
          'material', 'materiales', 'suministro', 'insumo', 'equipo', 'herramienta', 'repuesto', 'accesorio'
        ].some(k => descLower.includes(k))

        setItems([...items, { 
            ...newItem, 
            es_material: esMaterialAuto
        }])
        setNewItem({ descripcion: '', cantidad: 1, precio: 0 })
    }

    const removeExtraItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const renderStep3_Items = () => (
        <div className="space-y-6">
            <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-3xl border border-indigo-500/20 shadow-inner text-center">
                <p className="text-[10px] font-black text-indigo-600/60 uppercase tracking-[0.2em] mb-1">Total Presupuesto Final</p>
                <h2 className="text-4xl font-black text-indigo-700">
                    ${totalPF.toLocaleString('es-AR')}
                </h2>
            </div>

            {/* Formulario rápido de items */}
            <div className="bg-card rounded-2xl border p-4 space-y-3 shadow-sm border-indigo-100">
                <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-bold text-indigo-600 uppercase">Agregar Ítem</span>
                </div>
                
                <div className="space-y-3">
                    <div className="relative">
                        <Select onValueChange={(val) => {
                            const prod = productos.find(p => p.id === val)
                            if (prod) {
                                setNewItem({ 
                                    descripcion: `${prod.nombre}${prod.descripcion ? ` - ${prod.descripcion}` : ''}`,
                                    cantidad: 1,
                                    precio: prod.precio
                                })
                            }
                        }}>
                            <SelectTrigger className="h-10 text-xs bg-muted/30 border-dashed border-indigo-200">
                                <SelectValue placeholder="Elegir producto rápido..." />
                            </SelectTrigger>
                            <SelectContent>
                                {productos.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.nombre} (${p.precio})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Input
                        placeholder="Descripción del trabajo o material..."
                        value={newItem.descripcion}
                        onChange={(e) => setNewItem({ ...newItem, descripcion: e.target.value })}
                        className="h-11 bg-muted/10 border-indigo-100"
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground ml-1">Cant.</Label>
                            <Input
                                type="number"
                                placeholder="Cant."
                                value={newItem.cantidad}
                                onChange={(e) => setNewItem({ ...newItem, cantidad: Number(e.target.value) })}
                                className="h-11 bg-muted/10 border-indigo-100"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground ml-1">Precio Unit. ($)</Label>
                            <Input
                                type="number"
                                placeholder="Precio"
                                value={newItem.precio}
                                onChange={(e) => setNewItem({ ...newItem, precio: Number(e.target.value) })}
                                className="h-11 bg-muted/10 border-indigo-100"
                            />
                        </div>
                    </div>

                    <Button 
                        type="button" 
                        onClick={addItem}
                        className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Agregar a Lista
                    </Button>
                </div>
            </div>

            {/* Mini Tabla de Items */}
            <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground ml-1 uppercase">Lista de Ítems ({items.length})</p>
                {items.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed rounded-3xl border-muted/50 text-muted-foreground">
                        <p className="text-xs">No hay ítems agregados aún.</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-indigo-50 rounded-xl shadow-sm group animate-in slide-in-from-right-2">
                                <div className="flex-grow overflow-hidden mr-2">
                                    <p className="text-sm font-bold truncate text-slate-800">{item.descripcion}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {item.cantidad} x ${item.precio.toLocaleString('es-AR')} = 
                                        <span className="font-bold text-slate-700 ml-1">${(item.cantidad * item.precio).toLocaleString('es-AR')}</span>
                                    </p>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => removeExtraItem(idx)}
                                    className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg shrink-0"
                                >
                                    <Plus className="h-4 w-4 rotate-45" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )

    return (
        <div className="w-full">
            {/* Stepper Visual */}
            <div className="flex justify-between mb-8 px-4 relative">
                <div className="absolute top-1/2 left-8 right-8 h-1 bg-muted -z-10 rounded-full">
                    <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                    />
                </div>
                {STEPS.map((step) => {
                    const isActive = step.id === currentStep
                    const isCompleted = step.id < currentStep
                    const Icon = step.icon

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isActive ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/20 text-primary border-primary' : 'bg-background text-muted-foreground border-muted'}`}>
                                <Icon className="h-6 w-6" />
                            </div>
                            <span className={`text-[10px] font-bold uppercase transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{step.title}</span>
                        </div>
                    )
                })}
            </div>

            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm relative overflow-hidden">
                {isSubmitting && (
                    <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="font-bold animate-pulse text-primary tracking-widest uppercase text-sm">Creando Proyecto...</p>
                    </div>
                )}

                <CardContent className="p-6 min-h-[420px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {currentStep === 1 && renderStep1_Origen()}
                            {currentStep === 2 && renderStep2_Detalles()}
                            {currentStep === 3 && renderStep3_Items()}
                        </motion.div>
                    </AnimatePresence>
                </CardContent>

                <CardFooter className="flex justify-between p-6 bg-muted/30 border-t">
                    <Button variant="ghost" onClick={prevStep} disabled={currentStep === 1 || isSubmitting}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
                    </Button>

                    {currentStep < 3 ? (
                        <Button onClick={nextStep} className="bg-primary text-primary-foreground font-bold rounded-xl px-8">
                            Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-gradient-to-r from-primary to-blue-600 text-white font-black rounded-xl px-10 shadow-lg">
                            <Zap className="mr-2 h-4 w-4 fill-current" /> Lanzar Proyecto
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}
