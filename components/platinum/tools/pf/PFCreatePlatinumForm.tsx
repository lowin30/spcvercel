"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
    LayoutDashboard, Building2, Package, Hammer, 
    Plus, Send, Loader2, ReceiptText, Trash2, 
    ArrowLeft, Calculator, Wand2, Zap, Tag, Check
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import { saveBudgetAction } from "@/app/dashboard/tareas/actions"
import { ItemPresupuestoModal } from "@/components/item-presupuesto-modal"
import Link from "next/link"

interface PFCreatePlatinumFormProps {
    task: any
    catalogs: any
    initialPb?: any
    initialData?: any // Datos del presupuesto final para edición
}

export function PFCreatePlatinumForm({ task, catalogs, initialPb, initialData }: PFCreatePlatinumFormProps) {
    const router = useRouter()
    const [isSaving, setIsSaving] = useState(false)
    
    // Inicialización inteligente para edición
    const [items, setItems] = useState<any[]>(initialData?.items || [])
    const [observaciones, setObservaciones] = useState(initialData?.observaciones_admin || "")
    const [descuentoMonto, setDescuentoMonto] = useState<number>(initialData?.descuento_monto || 0)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Totales calculados en tiempo real
    const totalMateriales = items.filter(i => i.es_material).reduce((s, i) => s + (i.cantidad * i.precio), 0)
    const totalManoObra = items.filter(i => !i.es_material).reduce((s, i) => s + (i.cantidad * i.precio), 0)
    const descuentoSugerido = Math.round(totalManoObra * 0.10) // helper 10% de MO
    const totalFinal = Math.max(0, totalMateriales + totalManoObra - descuentoMonto)

    const handleAddItem = (item: any) => {
        setItems([...items, { ...item, id: crypto.randomUUID() }])
    }

    const removeItem = (id: number | string) => {
        setItems(items.filter(i => i.id !== id))
    }

    const updateItem = (id: number | string, field: string, value: any) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
    }

    const handleClonarDeBase = () => {
        if (!initialPb || !initialPb.items_json) {
            toast.error("no hay ítems en el presupuesto base para clonar.")
            return
        }
        const clonedItems = initialPb.items_json.map((i: any) => ({
            descripcion: i.descripcion,
            cantidad: i.cantidad || 1,
            precio: i.precio || 0,
            es_material: i.es_material ?? !!i.es_producto ?? true,
            id: crypto.randomUUID()
        }))
        setItems([...items, ...clonedItems])
        toast.success(`${clonedItems.length} ítems clonados del presupuesto base.`)
    }

    const handleSave = async () => {
        if (items.length === 0) {
            toast.error("debes agregar al menos un ítem al presupuesto.")
            return
        }

        setIsSaving(true)
        try {
            const res = await saveBudgetAction({
                tipo: 'final',
                isEditing: !!initialData,
                budgetId: initialData?.id,
                budgetData: {
                    id_tarea: task.id,
                    id_presupuesto_base: initialData?.id_presupuesto_base || initialPb?.id || null,
                    id_administrador: task.id_administrador,
                    id_edificio: task.id_edificio,
                    total: totalFinal,
                    materiales: totalMateriales,
                    mano_obra: totalManoObra,
                    descuento_monto: descuentoMonto,
                    observaciones_admin: observaciones,
                    id_estado: initialData?.id_estado || 1 // Mantener estado actual si es edición o 1 (Borrador) si es nuevo
                },
                items: items.map(i => ({
                    id: i.id && typeof i.id === 'number' ? i.id : undefined, // Importante para la sincronización de la server action
                    descripcion: i.descripcion,
                    cantidad: i.cantidad,
                    precio: i.precio,
                    es_material: i.es_material,
                    producto_id: i.producto_id || null
                }))
            })

            if (res.success) {
                toast.success(initialData ? "presupuesto final actualizado con éxito." : "presupuesto final creado con éxito.")
                router.push(`/dashboard/tareas/${task.id}`)
                router.refresh()
            } else {
                toast.error(res.message || "error al guardar el presupuesto.")
            }
        } catch (e: any) {
            toast.error(e.message)
        } finally {
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="space-y-6 max-w-4xl mx-auto pb-20 p-4 sm:p-6">
                
                {/* Header Platinum Contextual */}
                <div className="flex items-center justify-between gap-4 bg-card p-4 rounded-3xl border border-border shadow-sm">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-accent text-muted-foreground">
                            <Link href={`/dashboard/tareas/${task?.id || ''}`}>
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div>
                            <h2 className="text-xl font-black text-foreground tracking-tight italic">
                                {initialData ? `editando ${initialData.code}` : (task?.titulo || 'nuevo presupuesto')}
                            </h2>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                                <Building2 className="h-3 w-3" />
                                {task?.nombre_edificio || 'edificio no identificado'}
                            </div>
                        </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">total estimado</span>
                        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">
                            {formatCurrency(totalFinal)}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Editor de Ítems (Lado Izquierdo) */}
                    <div className="lg:col-span-2 space-y-4">
                        <Card className="bg-card border-border shadow-2xl overflow-hidden rounded-3xl">
                            <CardHeader className="border-b border-border/50 bg-secondary/30">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-black flex items-center gap-2 text-muted-foreground">
                                        <ReceiptText className="h-4 w-4 text-indigo-500" />
                                        desglose de ítems
                                    </CardTitle>
                                    {initialPb && (
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-7 text-[10px] font-black border-border hover:bg-accent text-muted-foreground gap-1.5"
                                            onClick={handleClonarDeBase}
                                        >
                                            <Wand2 className="h-3 w-3" />
                                            clonar base
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border">
                                    {items.length === 0 ? (
                                        <div className="p-12 text-center space-y-4">
                                            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto ring-1 ring-border">
                                                <Package className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-muted-foreground">no hay ítems cargados</p>
                                                <p className="text-[11px] text-muted-foreground uppercase tracking-tight mt-1">presioná el botón "+" para empezar</p>
                                            </div>
                                        </div>
                                    ) : (
                                        items.map((item, idx) => (
                                            <div key={item.id || idx} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 group hover:bg-secondary/40 transition-all">
                                                <div className="flex items-start gap-3 min-w-0 w-full sm:flex-1">
                                                    <span className="text-[9px] font-mono text-muted-foreground bg-secondary/80 px-1.5 py-0.5 rounded mt-1.5 shrink-0">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <Textarea 
                                                            value={item.descripcion}
                                                            onChange={(e) => updateItem(item.id, 'descripcion', e.target.value)}
                                                            rows={3}
                                                            className="text-sm font-bold bg-transparent border-none p-0 focus-visible:ring-0 focus-visible:bg-secondary/30 transition-all text-foreground resize-none min-h-[60px] w-full"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-none border-border/20">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateItem(item.id, 'es_material', !item.es_material)}
                                                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase transition-all active:scale-95 border border-transparent ${
                                                                item.es_material 
                                                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/20' 
                                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/20'
                                                            }`}
                                                        >
                                                            {item.es_material ? <Package className="h-2.5 w-2.5" /> : <Hammer className="h-2.5 w-2.5" />}
                                                            {item.es_material ? 'material' : 'servicio'}
                                                            <div className={`h-2.5 w-2.5 rounded-sm border border-current flex items-center justify-center ml-0.5 ${item.es_material ? 'bg-blue-500/20' : 'bg-transparent'}`}>
                                                                {item.es_material && <Check className="h-2 w-2 stroke-[4px]" />}
                                                            </div>
                                                        </button>

                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <Input 
                                                                type="number"
                                                                value={item.cantidad}
                                                                onChange={(e) => updateItem(item.id, 'cantidad', parseFloat(e.target.value) || 0)}
                                                                className="h-6 w-10 sm:w-12 text-[10px] font-bold text-center bg-secondary/50 border-none focus-visible:ring-1 focus-visible:ring-indigo-500/30"
                                                            />
                                                            <span className="text-[10px] font-bold">x</span>
                                                            <div className="relative">
                                                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">$</span>
                                                                <Input 
                                                                    type="number"
                                                                    value={item.precio}
                                                                    onChange={(e) => updateItem(item.id, 'precio', parseFloat(e.target.value) || 0)}
                                                                    className="h-6 w-20 sm:w-24 text-[10px] font-bold pl-4 bg-secondary/50 border-none focus-visible:ring-1 focus-visible:ring-indigo-500/30"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                                            {formatCurrency(item.cantidad * item.precio)}
                                                        </p>
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className="h-8 w-8 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-full"
                                                            onClick={() => removeItem(item.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                
                                <div className="p-4 bg-secondary/20 border-t border-border/50">
                                    <Button 
                                        onClick={() => setIsModalOpen(true)}
                                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-[0.98] border-none"
                                    >
                                        <Plus className="h-5 w-5 mr-2 stroke-[3px]" />
                                        AGREGAR ÍTEM
                                    </Button>

                                    <ItemPresupuestoModal
                                        open={isModalOpen}
                                        setOpen={setIsModalOpen}
                                        productosInyectados={catalogs?.productos || []}
                                        onSave={(item: any) => {
                                            setItems([...items, { ...item, id: crypto.randomUUID() }])
                                            setIsModalOpen(false)
                                        }}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border rounded-3xl overflow-hidden">
                            <CardContent className="p-4 space-y-3">
                                <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest px-1">observaciones administrativas</label>
                                <Textarea 
                                    placeholder="notas internas, aclaraciones sobre materiales o tiempos..."
                                    className="bg-secondary/30 border-border text-foreground text-sm min-h-[100px] focus:ring-1 focus:ring-indigo-500/50"
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Resumen Financiero (Lado Derecho) */}
                    <div className="space-y-4">
                        <Card className="bg-card border-border shadow-2xl rounded-3xl overflow-hidden">
                            <CardHeader className="bg-secondary/30 border-b border-border/50">
                                <CardTitle className="text-sm font-black text-muted-foreground flex items-center gap-2">
                                    <Calculator className="h-4 w-4 text-emerald-500" />
                                    resumen final
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="space-y-4">
                                    <SummaryRow 
                                        icon={<Package className="h-3 w-3" />} 
                                        label="total materiales" 
                                        value={totalMateriales} 
                                        color="text-blue-600 dark:text-blue-400"
                                    />
                                    <SummaryRow 
                                        icon={<Hammer className="h-3 w-3" />} 
                                        label="mano de obra" 
                                        value={totalManoObra} 
                                        color="text-amber-600 dark:text-amber-400"
                                    />

                                    {/* campo de descuento — visible solo cuando hay mano de obra */}
                                    {totalManoObra > 0 && (
                                        <div className="pt-3 border-t border-border/50 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                                    <Tag className="h-3 w-3 text-rose-500" />
                                                    descuento
                                                </span>
                                                {descuentoSugerido > 0 && descuentoMonto === 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setDescuentoMonto(descuentoSugerido)}
                                                        className="text-[9px] font-black text-rose-500/70 hover:text-rose-500 underline underline-offset-2 transition-colors"
                                                    >
                                                        aplicar 10% ({formatCurrency(descuentoSugerido)})
                                                    </button>
                                                )}
                                                {descuentoMonto > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setDescuentoMonto(0)}
                                                        className="text-[9px] font-black text-muted-foreground hover:text-rose-500 underline underline-offset-2 transition-colors"
                                                    >
                                                        quitar descuento
                                                    </button>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">$</span>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={totalManoObra}
                                                    value={descuentoMonto || ''}
                                                    onChange={(e) => {
                                                        const v = Math.round(parseFloat(e.target.value) || 0)
                                                        setDescuentoMonto(Math.min(v, totalManoObra))
                                                    }}
                                                    placeholder="0"
                                                    className="pl-7 h-9 bg-secondary/50 border-none text-sm font-black focus-visible:ring-1 focus-visible:ring-rose-500/30 text-rose-600 dark:text-rose-400"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-border space-y-1 text-right">
                                        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">total del presupuesto</p>
                                        <p className="text-3xl font-black text-foreground tracking-tighter">
                                            {formatCurrency(totalFinal)}
                                        </p>
                                        {descuentoMonto > 0 && (
                                            <p className="text-[10px] text-rose-500 font-bold">
                                                descuento aplicado: -{formatCurrency(descuentoMonto)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <Button 
                                    className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-base rounded-2xl shadow-lg shadow-indigo-500/10 transition-all active:scale-[0.98] group"
                                    onClick={handleSave}
                                    disabled={isSaving || items.length === 0}
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    ) : (
                                        <Send className="h-5 w-5 mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    )}
                                    GUARDAR PRESUPUESTO
                                </Button>
                                
                                <p className="text-[9px] text-muted-foreground text-center uppercase font-bold px-4 leading-normal">
                                    al guardar el presupuesto se creará un registro granular en la base de datos permitiendo futuras auditorías
                                </p>
                            </CardContent>
                        </Card>

                        {/* Info de Tarea Contextual */}
                        <div className="p-5 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 space-y-3">
                            <div className="flex items-center gap-2 text-indigo-500">
                                <Zap className="h-4 w-4" />
                                <span className="text-[11px] font-black uppercase tracking-widest">adn de la tarea</span>
                            </div>
                            <div className="space-y-2">
                                <InfoField label="id tarea" value={`#${task?.id || '?'}`} />
                                <InfoField label="administrador" value={task?.nombre_administrador || 'S/A'} />
                                <InfoField label="referencia pb" value={initialPb?.code || 'sin base asignada'} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function SummaryRow({ icon, label, value, color }: any) {
    return (
        <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-2">
                {icon}
                {label}
            </span>
            <span className={`font-black tracking-tight ${color}`}>{formatCurrency(value)}</span>
        </div>
    )
}

function InfoField({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tighter">{label}</span>
            <span className="text-sm font-black text-foreground truncate">{value}</span>
        </div>
    )
}
