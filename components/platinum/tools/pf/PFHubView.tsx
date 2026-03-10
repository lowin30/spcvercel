"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    FileText, Building2, Calendar, DollarSign, Wallet,
    ChevronDown, ChevronUp, ReceiptText, Send, CheckCircle,
    ExternalLink, Loader2, Plus, Trash2, Hammer, Package,
    Pencil, Check, X, User, Zap
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { formatDate } from "@/lib/date-utils"
import { toast } from "sonner"
import { marcarPresupuestoComoEnviado } from "@/app/dashboard/presupuestos-finales/actions"
import { convertirPresupuestoADosFacturas } from "@/app/dashboard/presupuestos-finales/actions-factura"
import { saveBudgetAction, updateTask, updateSupervisorAction } from "@/app/dashboard/tareas/actions"
import type { PFHubData } from "@/app/dashboard/presupuestos-finales/loader-unified"
import { FacturasPreview } from "./FacturasPreview"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import Link from "next/link"

interface PFHubViewProps {
    data: PFHubData
    catalogs: any
    onClose: () => void
    onDataChange: () => void
}

export function PFHubView({ data, catalogs, onClose, onDataChange }: PFHubViewProps) {
    const { presupuesto: pf, items, facturas, facturasItems } = data
    const [isActioning, setIsActioning] = useState(false)
    const [expandedSection, setExpandedSection] = useState<string>("items")
    const [newItem, setNewItem] = useState({ descripcion: '', cantidad: 1, precio: 0 })
    
    // Metadata Edit states
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [tempTitle, setTempTitle] = useState(pf.tareas?.titulo || '')
    const [isEditingSup, setIsEditingSup] = useState(false)

    // Item Edit state
    const [editingIdx, setEditingIdx] = useState<number | null>(null)
    const [editItem, setEditItem] = useState<any>(null)

    const totalMateriales = items.filter((i: any) => i.es_material).reduce((s: number, i: any) => s + (i.cantidad * i.precio), 0)
    const totalManoObra = items.filter((i: any) => !i.es_material).reduce((s: number, i: any) => s + (i.cantidad * i.precio), 0)
    const totalCalculado = totalMateriales + totalManoObra

    const estadoNombre = pf.estados_presupuestos?.nombre || 'Borrador'
    const estadoColor = pf.estados_presupuestos?.color || '#6b7280'
    const estadoCodigo = pf.estados_presupuestos?.codigo?.toLowerCase() || 'borrador'
    const tieneFacturas = facturas.length > 0

    const handleSaveBudget = async (updatedItems: any[]) => {
        setIsActioning(true)
        try {
            // Recalculate totals based on new items
            const newMat = updatedItems.filter((i: any) => i.es_material).reduce((s: number, i: any) => s + (i.cantidad * i.precio), 0)
            const newMO = updatedItems.filter((i: any) => !i.es_material).reduce((s: number, i: any) => s + (i.cantidad * i.precio), 0)
            const newTotal = newMat + newMO

            const res = await saveBudgetAction({
                tipo: 'final',
                isEditing: true,
                budgetId: pf.id,
                budgetData: {
                    id_tarea: pf.id_tarea,
                    id_presupuesto_base: pf.id_presupuesto_base,
                    id_administrador: pf.id_administrador,
                    id_edificio: pf.id_edificio,
                    total: newTotal,
                    materiales: newMat,
                    mano_obra: newMO,
                    total_base: newTotal,
                    ajuste_admin: pf.ajuste_admin || 0,
                    observaciones_admin: pf.observaciones_admin,
                    id_estado: pf.id_estado,
                    code: pf.code
                },
                items: updatedItems.map(item => ({
                    ...item,
                    id_presupuesto: pf.id
                }))
            })

            if (res.success) {
                onDataChange()
            } else {
                toast.error(res.message || 'Error al guardar cambios')
            }
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setIsActioning(false)
        }
    }

    const handleAddItem = async () => {
        if (!newItem.descripcion || newItem.cantidad <= 0 || newItem.precio <= 0) {
            toast.error("Completá descripción, cantidad y precio.")
            return
        }

        const descLower = newItem.descripcion.toLowerCase()
        const esMaterialAuto = [
          'material', 'materiales', 'suministro', 'insumo', 'equipo', 'herramienta', 'repuesto', 'accesorio'
        ].some(k => descLower.includes(k))

        const updatedItems = [...items, { ...newItem, es_material: esMaterialAuto }]
        await handleSaveBudget(updatedItems)
        setNewItem({ descripcion: '', cantidad: 1, precio: 0 })
    }

    const handleRemoveItem = async (idx: number) => {
        if (!confirm('¿Eliminar este ítem?')) return
        const updatedItems = items.filter((_: any, i: number) => i !== idx)
        await handleSaveBudget(updatedItems)
    }

    const handleUpdateItem = async () => {
        if (!editItem) return
        const updatedItems = [...items]
        updatedItems[editingIdx!] = editItem
        await handleSaveBudget(updatedItems)
        setEditingIdx(null)
        setEditItem(null)
    }

    const handleUpdateTitle = async () => {
        if (!tempTitle || tempTitle === pf.tareas?.titulo) {
            setIsEditingTitle(false)
            return
        }
        setIsActioning(true)
        try {
            const res = await updateTask(pf.id_tarea, { titulo: tempTitle })
            if (res.success) {
                toast.success("Título actualizado")
                onDataChange()
                setIsEditingTitle(false)
            } else toast.error(res.message)
        } catch (e: any) { toast.error(e.message) }
        finally { setIsActioning(false) }
    }

    const handleUpdateSupervisor = async (email: string) => {
        setIsActioning(true)
        try {
            const res = await updateSupervisorAction(pf.id_tarea, email)
            if (res.success) {
                toast.success("Supervisor actualizado")
                onDataChange()
                setIsEditingSup(false)
            } else toast.error(res.message)
        } catch (e: any) { toast.error(e.message) }
        finally { setIsActioning(false) }
    }

    const handleMarcarEnviado = async () => {
        if (!confirm('¿Marcar este presupuesto como enviado?')) return
        setIsActioning(true)
        try {
            const res = await marcarPresupuestoComoEnviado(pf.id)
            if (res.success) { toast.success(res.message); onDataChange() }
            else toast.error(res.message || 'Error')
        } catch (e: any) { toast.error(e.message) }
        finally { setIsActioning(false) }
    }

    const handleGenerarFacturas = async () => {
        if (!confirm('¿Generar facturas para este presupuesto?')) return
        setIsActioning(true)
        try {
            const res = await convertirPresupuestoADosFacturas(pf.id)
            if (res.success) { toast.success(res.message || 'Facturas generadas'); onDataChange() }
            else toast.error(res.message || 'Error al generar facturas')
        } catch (e: any) { toast.error(e.message) }
        finally { setIsActioning(false) }
    }

    return (
        <div className="pb-24">
            {/* ─── Cabecera PF ─── */}
            <div className="px-5 py-4 space-y-4 border-b bg-gradient-to-b from-indigo-50/50 to-transparent dark:from-indigo-950/20">
                {/* Título y estado */}
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                        {isEditingTitle ? (
                            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                <Input 
                                    className="h-8 text-sm font-bold bg-white" 
                                    value={tempTitle}
                                    onChange={(e) => setTempTitle(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle()}
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleUpdateTitle} disabled={isActioning}>
                                    <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500" onClick={() => { setTempTitle(pf.tareas?.titulo); setIsEditingTitle(false) }}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <p 
                                className="text-base font-black tracking-tight truncate cursor-pointer hover:text-indigo-600 transition-colors group flex items-center gap-2"
                                onClick={() => setIsEditingTitle(true)}
                            >
                                {pf.tareas?.titulo || 'Sin título'}
                                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                            </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Building2 className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{pf.tareas?.edificios?.nombre || 'Sin edificio'}</span>
                            </div>
                            
                            {/* Supervisor Inline Edit */}
                            <div className="flex items-center gap-1.5 group cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setIsEditingSup(!isEditingSup)}>
                                <User className="h-3 w-3 flex-shrink-0" />
                                {isEditingSup ? (
                                    <Select 
                                        defaultValue={pf.tareas?.supervisores_tareas?.[0]?.usuarios?.email} 
                                        onValueChange={handleUpdateSupervisor}
                                    >
                                        <SelectTrigger className="h-5 text-[10px] w-auto border-none p-0 bg-transparent text-indigo-600 font-bold focus:ring-0">
                                            <SelectValue placeholder="Elegir..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="null">Sin asignar</SelectItem>
                                            {catalogs?.supervisores?.map((s: any) => (
                                                <SelectItem key={s.id} value={s.email}>{s.email}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <span className="flex items-center gap-1">
                                        {pf.tareas?.supervisores_tareas?.[0]?.usuarios?.email || 'S/S'}
                                        <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <Badge
                        style={{ backgroundColor: estadoColor, color: 'white' }}
                        className="border-0 shadow-sm text-[10px] font-bold flex-shrink-0"
                    >
                        {estadoNombre}
                    </Badge>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-3 gap-2">
                    <KpiPill icon={<Package className="h-3 w-3" />} label="Materiales" value={formatCurrency(totalMateriales)} color="blue" />
                    <KpiPill icon={<Hammer className="h-3 w-3" />} label="Mano de Obra" value={formatCurrency(totalManoObra)} color="amber" />
                    <KpiPill icon={<DollarSign className="h-3 w-3" />} label="Total" value={formatCurrency(totalCalculado)} color="green" isPrimary />
                </div>

                {/* Info Row */}
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(pf.created_at)}
                    </span>
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{pf.code || `PF-${pf.id}`}</span>
                    {pf.aprobado && <Badge className="bg-green-600 text-white border-0 text-[8px] h-4">Aprobado ✓</Badge>}
                </div>
            </div>

            {/* ─── Sección Ítems ─── */}
            <CollapsibleSection
                title={`Ítems (${items.length})`}
                icon={<ReceiptText className="h-4 w-4 text-indigo-500" />}
                isExpanded={expandedSection === "items"}
                onToggle={() => setExpandedSection(expandedSection === "items" ? "" : "items")}
                badge={items.length}
            >
                {/* Quick Add Form */}
                <div className="mb-4 space-y-3 p-3 bg-muted/40 rounded-2xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-2 mb-1 px-1">
                        <Zap className="h-3 w-3 text-indigo-500" />
                        <span className="text-[10px] font-black text-indigo-600 uppercase">Carga Rápida</span>
                    </div>

                    <div className="space-y-3">
                        <Select onValueChange={(val) => {
                            const prod = catalogs?.productos?.find((p: any) => p.id === val)
                            if (prod) {
                                setNewItem({ 
                                    descripcion: `${prod.nombre}${prod.descripcion ? ` - ${prod.descripcion}` : ''}`,
                                    cantidad: 1,
                                    precio: prod.precio
                                })
                            }
                        }}>
                            <SelectTrigger className="h-9 text-xs bg-white border-dashed border-indigo-200">
                                <SelectValue placeholder="Catálogo de productos..." />
                            </SelectTrigger>
                            <SelectContent>
                                {catalogs?.productos?.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-bold text-xs">{p.nombre} (${p.precio})</span>
                                            {p.descripcion && <span className="text-[10px] text-muted-foreground line-clamp-1">{p.descripcion}</span>}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Textarea
                            placeholder="Descripción del ítem..."
                            value={newItem.descripcion}
                            onChange={(e) => setNewItem({ ...newItem, descripcion: e.target.value })}
                            className="text-xs bg-white min-h-[60px]"
                            rows={3}
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                                <Label className="text-[10px] text-muted-foreground w-8 shrink-0">Cant.</Label>
                                <Input
                                    type="number"
                                    value={newItem.cantidad}
                                    onChange={(e) => setNewItem({ ...newItem, cantidad: Number(e.target.value) })}
                                    className="h-8 text-xs bg-white"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-[10px] text-muted-foreground w-8 shrink-0">Precio</Label>
                                <Input
                                    type="number"
                                    value={newItem.precio}
                                    onChange={(e) => setNewItem({ ...newItem, precio: Number(e.target.value) })}
                                    className="h-8 text-xs bg-white"
                                />
                            </div>
                        </div>

                        <Button 
                            size="sm" 
                            className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                            onClick={handleAddItem}
                            disabled={isActioning}
                        >
                            {isActioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                            Agregar Ítem
                        </Button>
                    </div>
                </div>

                {items.length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                            <Plus className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground">No hay ítems aún.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map((item: any, idx: number) => (
                            <div key={item.id || idx}>
                                {editingIdx === idx ? (
                                    <div className="p-3 rounded-xl border-2 border-indigo-500 bg-white shadow-md animate-in zoom-in-95 duration-200 space-y-3">
                                        <Textarea 
                                            value={editItem.descripcion} 
                                            onChange={(e) => setEditItem({...editItem, descripcion: e.target.value})}
                                            className="text-xs font-bold min-h-[60px]"
                                            rows={3}
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex items-center gap-2">
                                                <Label className="text-[10px] w-8">Cant.</Label>
                                                <Input 
                                                    type="number" 
                                                    value={editItem.cantidad} 
                                                    onChange={(e) => setEditItem({...editItem, cantidad: Number(e.target.value)})}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Label className="text-[10px] w-8">Precio</Label>
                                                <Input 
                                                    type="number" 
                                                    value={editItem.precio} 
                                                    onChange={(e) => setEditItem({...editItem, precio: Number(e.target.value)})}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" className="flex-1 h-8 bg-indigo-600 text-white font-bold" onClick={handleUpdateItem} disabled={isActioning}>
                                                Guardar
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-8" onClick={() => setEditingIdx(null)}>
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <ItemCard 
                                        item={item} 
                                        index={idx} 
                                        onDelete={() => handleRemoveItem(idx)}
                                        onEdit={() => {
                                            setEditingIdx(idx)
                                            setEditItem({...item})
                                        }}
                                        isActioning={isActioning}
                                    />
                                )}
                            </div>
                        ))}
                        {/* Item Total Footer */}
                        <div className="flex justify-between items-center p-3 bg-primary/5 rounded-xl mt-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total</span>
                            <span className="text-lg font-black tracking-tighter text-primary">
                                {formatCurrency(totalCalculado)}
                            </span>
                        </div>
                        {/* No more edit link here, editing is inline */}
                    </div>
                )}
            </CollapsibleSection>

            {/* ─── Sección Facturas ─── */}
            <CollapsibleSection
                title={`Facturas (${facturas.length})`}
                icon={<Wallet className="h-4 w-4 text-emerald-500" />}
                isExpanded={expandedSection === "facturas"}
                onToggle={() => setExpandedSection(expandedSection === "facturas" ? "" : "facturas")}
                badge={facturas.length}
            >
                {tieneFacturas ? (
                    <FacturasPreview facturas={facturas} facturasItems={facturasItems} />
                ) : (
                    <div className="text-center py-8 space-y-3">
                        <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto">
                            <Wallet className="h-6 w-6 text-emerald-500/50" />
                        </div>
                        <p className="text-sm text-muted-foreground">Sin facturas generadas.</p>
                        {items.length > 0 && estadoCodigo !== 'borrador' && (
                            <Button
                                size="sm"
                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={handleGenerarFacturas}
                                disabled={isActioning}
                            >
                                {isActioning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ReceiptText className="h-4 w-4 mr-1" />}
                                Generar Facturas
                            </Button>
                        )}
                    </div>
                )}
            </CollapsibleSection>

            {/* ─── Sticky Bottom Actions ─── */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/90 backdrop-blur-xl border-t p-4 safe-area-inset-bottom">
                <div className="flex gap-2 max-w-lg mx-auto">
                    {estadoCodigo === 'borrador' && items.length > 0 && (
                        <Button
                            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all"
                            onClick={handleMarcarEnviado}
                            disabled={isActioning}
                        >
                            {isActioning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Enviar Presupuesto
                        </Button>
                    )}
                    {!tieneFacturas && pf.aprobado && items.length > 0 && (
                        <Button
                            className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg active:scale-[0.98] transition-all"
                            onClick={handleGenerarFacturas}
                            disabled={isActioning}
                        >
                            {isActioning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
                            Generar Facturas
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        className="h-12 rounded-xl px-4"
                        asChild
                    >
                        <Link href={`/dashboard/presupuestos-finales/${pf.id}`}>
                            <ExternalLink className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}

/* ─── Helper Components ─── */

function KpiPill({ icon, label, value, color, isPrimary }: any) {
    const colors: any = {
        blue: "bg-blue-50/80 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300",
        amber: "bg-amber-50/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
        green: "bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
    }
    return (
        <div className={`p-2.5 rounded-xl ${colors[color]} ${isPrimary ? 'ring-1 ring-emerald-500/30' : ''} transition-all`}>
            <div className="flex items-center gap-1 mb-1">
                {icon}
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">{label}</span>
            </div>
            <p className={`font-black tracking-tight ${isPrimary ? 'text-base' : 'text-sm'}`}>{value}</p>
        </div>
    )
}

function ItemCard({ 
    item, index, onDelete, onEdit, isActioning 
}: { 
    item: any; index: number; onDelete?: () => void; onEdit?: () => void; isActioning?: boolean 
}) {
    const subtotal = (item.cantidad || 0) * (item.precio || 0)

    return (
        <div 
            className="p-3 rounded-xl border border-muted-foreground/10 bg-card hover:bg-muted/20 transition-all group relative cursor-pointer"
            onClick={onEdit}
        >
            <div className="flex justify-between items-start gap-2">
                <div className="flex items-start gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 mt-0.5 flex-shrink-0">
                        {index + 1}
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold pr-12 whitespace-pre-wrap">{item.descripcion}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{item.cantidad}</span>
                            <span>×</span>
                            <span>{formatCurrency(item.precio)}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                    {item.es_material ? (
                        <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-none text-[8px] h-4">
                            MAT
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-[8px] h-4 border-muted-foreground/20">
                            SRV
                        </Badge>
                    )}
                    <p className="text-sm font-black text-primary tracking-tight">
                        {formatCurrency(subtotal)}
                    </p>
                </div>
            </div>

            {/* Hover Actions */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg"
                        onClick={(e) => { e.stopPropagation(); onEdit() }}
                        disabled={isActioning}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                )}
                {onDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg"
                        onClick={(e) => { e.stopPropagation(); onDelete() }}
                        disabled={isActioning}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
        </div>
    )
}

function CollapsibleSection({ title, icon, children, isExpanded, onToggle, badge }: {
    title: string
    icon: React.ReactNode
    children: React.ReactNode
    isExpanded: boolean
    onToggle: () => void
    badge?: number
}) {
    return (
        <div className="border-b last:border-b-0">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors active:bg-muted/50"
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-sm font-bold">{title}</span>
                    {badge !== undefined && badge > 0 && (
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {isExpanded && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    )
}
