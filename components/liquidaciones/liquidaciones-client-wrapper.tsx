"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, Loader2, Landmark, ChevronDown, ChevronUp, History, Info, Trash2, Check, X, Edit2 } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { generarPagoLiquidacionesPDF } from '@/lib/pdf-liquidaciones-bulk-generator'
import { LiquidacionDTO, CuentaCorrienteDTO } from '@/app/dashboard/liquidaciones/loader'
import { AdelantoTool } from '@/components/tools/AdelantoTool'
import { createAdelantoAction, deleteAdelantoAction, updateAdelantoAction, deleteLiquidacionAction } from "@/app/dashboard/liquidaciones/actions"
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { motion, AnimatePresence } from 'framer-motion'

interface LiquidacionesClientWrapperProps {
    initialLiquidaciones: LiquidacionDTO[]
    initialCuentaCorriente: CuentaCorrienteDTO | null
    userRole: string
    supervisores?: { id: string; email: string }[]
}

export function LiquidacionesClientWrapper({
    initialLiquidaciones: liquidaciones,
    initialCuentaCorriente,
    userRole,
    supervisores = []
}: LiquidacionesClientWrapperProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [loading, setLoading] = useState(false)
    const [selectedIds, setSelectedIds] = useState<(number | string)[]>([])
    const [expandedAdelantos, setExpandedAdelantos] = useState<number[]>([])
    const [editingAdelantoId, setEditingAdelantoId] = useState<string | null>(null)
    const [editValues, setEditValues] = useState<{ id: string, descripcion: string, monto: number } | null>(null)
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null)

    // Filtros desde URL (Next.js 15 Server-First)
    const supervisorEmail = searchParams.get('supervisor') || '_todos_'
    const estado = searchParams.get('estado') || 'no_pagadas'

    const supabase = createClient()

    const updateFilters = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === '_todos_') {
            params.delete(key)
        } else {
            params.set(key, value)
        }
        router.push(`${pathname}?${params.toString()}`)
        setSelectedIds([]) // Limpiar selección al filtrar
    }

    const formatCurrency = (amount: number | undefined) => {
        if (amount === undefined) return '-'
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const visibleTaskIds = liquidaciones.filter(l => !l.pagada).map(l => l.id)
    const visibleAdvanceIds = initialCuentaCorriente?.detalle_adelantos_json.map(a => a.id) || []
    const allVisibleIds = [...visibleTaskIds, ...visibleAdvanceIds]

    const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.includes(id))
    const isIndeterminate = allVisibleIds.some(id => selectedIds.includes(id)) && !allSelected
    
    // Calculo de totales (Solo impagas seleccionadas)
    const totals = liquidaciones.reduce((acc, liq) => {
        if (selectedIds.includes(liq.id) && !liq.pagada) {
            acc.bruto += (liq.total_supervisor || 0)
        }
        return acc
    }, { bruto: 0 })

    // Nota: El adelanto es por supervisor, no por liquidación. 
    // Si filtramos por supervisor, podemos mostrar el total de adelantos pendientes una sola vez.
    const uniqueSupervisorIds = Array.from(new Set(
        liquidaciones
            .filter(l => selectedIds.includes(l.id))
            .map(l => l.id_usuario_supervisor)
            .filter(Boolean)
    ))

    // Calculo de adelantos granulares (Phase 2.2)
    const totalAdelantosPosibles = initialCuentaCorriente?.total_adelantos_pendientes || 0
    const allAdvancesSelected = visibleAdvanceIds.length > 0 && visibleAdvanceIds.every(id => selectedIds.includes(id))
    
    const totalAdelantosADeducir = (initialCuentaCorriente?.detalle_adelantos_json || [])
        .reduce((acc, curr) => selectedIds.includes(curr.id) ? acc + curr.monto : acc, 0)

    const totalSeleccionadoNeto = totals.bruto - totalAdelantosADeducir

    const toggleSelectAll = (checked: boolean | string) => {
        const isChecked = checked === true || checked === 'indeterminate'
        if (isChecked) {
            setSelectedIds(allVisibleIds)
        } else {
            setSelectedIds([]) 
        }
    }

    const toggleSelect = (id: number | string, checked: boolean | string) => {
        const isChecked = checked === true || checked === 'indeterminate'
        setSelectedIds(prev => isChecked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id))
    }

    const toggleAdelantos = (id: number) => {
        setExpandedAdelantos(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const handleUpdateAdelanto = async (id: string) => {
        if (!editValues || isActionLoading) return
        setIsActionLoading(id)
        try {
            const res = await updateAdelantoAction(id, { 
                descripcion: editValues.descripcion, 
                monto: editValues.monto 
            })
            if (res.success) {
                toast.success("adelanto actualizado")
                setEditingAdelantoId(null)
                router.refresh()
            } else {
                toast.error(res.message)
            }
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsActionLoading(null)
        }
    }

    const handleDeleteAdelanto = async (id: string) => {
        if (!window.confirm("¿borrar este adelanto pendiente?")) return
        setIsActionLoading(id)
        try {
            const res = await deleteAdelantoAction(id)
            if (res.success) {
                toast.success("adelanto eliminado")
                setSelectedIds(prev => prev.filter(x => x !== id))
                router.refresh()
            } else {
                toast.error(res.message)
            }
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsActionLoading(null)
        }
    }

    const handleDeleteLiquidacion = async (id: number, pagada: boolean) => {
        const confirmMsg = pagada 
            ? "¿esta liquidacion ya figura como PAGADA. ¿estas seguro de que quieres eliminarla y rehabilitar los gastos?"
            : "¿borrar esta liquidacion y rehabilitar sus gastos?"
        
        if (!window.confirm(confirmMsg)) return
        
        setIsActionLoading(id.toString())
        try {
            const res = await deleteLiquidacionAction(id)
            if (res.success) {
                toast.success("liquidacion eliminada")
                router.refresh()
            } else {
                toast.error(res.message)
            }
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsActionLoading(null)
        }
    }

    const pagarSeleccionadas = async () => {
        const seleccionadasSoloIds = selectedIds.filter(id => typeof id === 'number') as number[]
        const adelantosIds = selectedIds.filter(id => typeof id === 'string') as string[]
        
        if (seleccionadasSoloIds.length === 0) return
        
        const mensaje = adelantosIds.length > 0
            ? `confirmar pago neto de ${formatCurrency(totalSeleccionadoNeto)}?\n(bruto: ${formatCurrency(totals.bruto)} - adelantos saldados: ${formatCurrency(totalAdelantosADeducir)})`
            : `confirmar pago bruto de ${formatCurrency(totals.bruto)}?\n(no se descontaran adelantos)`

        const confirmado = window.confirm(mensaje)
        if (!confirmado) return

        setLoading(true)
        try {
            const { data, error } = await supabase.rpc('pagar_liquidaciones_supervisores', { 
                p_ids: seleccionadasSoloIds,
                p_adelantos_ids: adelantosIds 
            })

            if (error) throw error

            const result = Array.isArray(data) ? data[0] : (data as any)
            const count = result?.cantidad_actualizadas || 0
            const tot = Number(result?.total_pagado || 0)

            toast.success('pago masivo completado', { description: `actualizadas: ${count} — total pagado: ${formatCurrency(tot)}` })

            // Generar PDF
            try {
                const itemsParaPdf = liquidaciones
                    .filter(l => selectedIds.includes(l.id))
                    .map(l => ({
                        titulo_tarea: l.titulo_tarea || 'N/A',
                        total_base: l.total_base || 0,
                        gastos_reales: l.gastos_reales || 0,
                        ganancia_neta: l.ganancia_neta || 0,
                        ganancia_supervisor: l.ganancia_supervisor || 0,
                        total_supervisor: l.total_supervisor || 0,
                        detalle_gastos_json: l.detalle_gastos_json || []
                    }))

                const supEmail = (supervisorEmail && supervisorEmail !== '_todos_')
                    ? supervisorEmail
                    : (liquidaciones.find(l => selectedIds.includes(l.id)) as any)?.email_supervisor

                // Detalle de adelantos para el reporte (Solo los seleccionados)
                const detalleAdelantos = (initialCuentaCorriente?.detalle_adelantos_json || [])
                    .filter(a => selectedIds.includes(a.id))

                const blob = await generarPagoLiquidacionesPDF({
                    liquidaciones: itemsParaPdf,
                    totalPagado: totalSeleccionadoNeto,
                    supervisorEmail: supEmail,
                    adelantos: {
                        total: totalAdelantosADeducir,
                        items: detalleAdelantos
                    }
                } as any)

                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `pago_liquidaciones_${new Date().toISOString().split('T')[0]}.pdf`
                a.click()
                URL.revokeObjectURL(url)

            } catch (pdfErr) {
                console.error("error generando pdf:", pdfErr)
                toast.error("pago registrado, pero fallo la generacion del pdf")
            }

            // Refrescar para ver cambios
            router.refresh()
            setSelectedIds([])

        } catch (err: any) {
            toast.error('error al pagar', { description: err.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto p-4 space-y-6 pb-44 sm:pb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight text-zinc-950 dark:text-white">liquidaciones <span className="text-zinc-500 font-serif italic">platinum</span></h1>
                    <p className="text-zinc-500 text-sm uppercase tracking-widest font-bold">
                        finanzas de supervisor y gestion de capital.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {userRole === 'admin' && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-2xl">
                                    <Landmark className="mr-2 h-4 w-4" />
                                    configurar adelanto
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="p-0 bg-transparent border-none sm:max-w-md">
                                <AdelantoTool supervisores={supervisores} />
                            </DialogContent>
                        </Dialog>
                    )}

                    {userRole === 'admin' && (
                        <Button asChild className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white rounded-2xl font-black">
                            <Link href="/dashboard/liquidaciones/nueva">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                nueva liquidacion
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            {/* Filtros Platinum */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {userRole === 'admin' && (
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">filtrar por supervisor</label>
                        <Select value={supervisorEmail} onValueChange={(v) => updateFilters('supervisor', v)}>
                            <SelectTrigger className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-300 h-11 rounded-2xl">
                                <SelectValue placeholder="todos los supervisores" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                <SelectItem value="_todos_">todos los supervisores</SelectItem>
                                {supervisores.map(s => (
                                    <SelectItem key={s.id} value={s.email}>{s.email}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">estado de pago</label>
                    <Select value={estado} onValueChange={(v) => updateFilters('estado', v)}>
                        <SelectTrigger className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-300 h-11 rounded-2xl">
                            <SelectValue placeholder="estado" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                            <SelectItem value="no_pagadas">no pagadas</SelectItem>
                            <SelectItem value="pagadas">pagadas</SelectItem>
                            <SelectItem value="todas">todas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Sumario de Seleccion (FAB Movil / Sticky Desktop) */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div 
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="fixed bottom-6 left-4 right-4 z-50 sm:relative sm:bottom-0 sm:left-0 sm:right-0"
                    >
                        <Card className="bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-xl border-emerald-500/30 shadow-2xl shadow-emerald-500/10 rounded-3xl overflow-hidden">
                            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="hidden sm:block">
                                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-500/5">
                                            {selectedIds.length} seleccionadas
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-6 gap-y-1">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase text-zinc-500">bruto acumulado</span>
                                            <span className="text-sm font-bold text-zinc-300">{formatCurrency(totals.bruto)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase text-rose-500">deduccion adelantos</span>
                                            <span className="text-sm font-bold text-rose-400">-{formatCurrency(totalAdelantosADeducir)}</span>
                                        </div>
                                        <div className="flex flex-col sm:ml-4 border-l border-zinc-200 dark:border-zinc-800 sm:pl-6 col-span-2">
                                            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-500">pago neto final</span>
                                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totalSeleccionadoNeto)}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button 
                                    onClick={pagarSeleccionadas} 
                                    disabled={loading}
                                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-6 rounded-2xl shadow-lg shadow-emerald-600/20"
                                >
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'confirmar y pagar'}
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Listado Principal - Platinum Cards */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <Checkbox 
                        checked={allSelected ? true : (isIndeterminate ? 'indeterminate' : false)} 
                        onCheckedChange={toggleSelectAll} 
                        className="rounded-md border-zinc-300 dark:border-zinc-700 data-[state=checked]:bg-zinc-900 dark:data-[state=checked]:bg-zinc-100" 
                    />
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-600">seleccionar toda la lista ({allVisibleIds.length})</span>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Tarjeta Especial de Adelantos (Saldo Vivo Granular) */}
                    {totalAdelantosPosibles > 0 && estado !== 'pagadas' && (
                        <Card className={`bg-rose-50/30 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/50 hover:border-rose-200 dark:hover:border-rose-800 transition-colors rounded-3xl overflow-hidden group lg:col-span-2 ${totalAdelantosADeducir > 0 ? 'ring-1 ring-rose-500/30 border-rose-500/20' : ''}`}>
                            <div className="p-4 sm:p-5 flex items-center gap-4">
                                <Checkbox 
                                    checked={allAdvancesSelected} 
                                    onCheckedChange={(c) => {
                                        const isChecked = c === true || c === 'indeterminate'
                                        if (isChecked) {
                                            setSelectedIds(prev => Array.from(new Set([...prev, ...visibleAdvanceIds])))
                                        } else {
                                            setSelectedIds(prev => prev.filter(x => !visibleAdvanceIds.includes(x as string)))
                                        }
                                    }}
                                    className="h-5 w-5 rounded-lg border-rose-300 dark:border-rose-700 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                                />
                                <div className="flex-1 flex items-center justify-between">
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-rose-950 dark:text-rose-100 flex items-center gap-2 truncate">
                                            <Landmark className="h-4 w-4 text-rose-600 dark:text-rose-500 shrink-0" />
                                            saldar cuenta corriente
                                        </h3>
                                        <p className="text-[10px] font-black uppercase text-rose-600/60 dark:text-rose-500/50 tracking-widest mt-0.5">
                                            adelantos pendientes de liquidar.
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-xl font-black text-rose-600 dark:text-rose-400">-{formatCurrency(totalAdelantosPosibles)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Detalle Expandible de Cuenta Corriente (Phase 2.1) */}
                            {initialCuentaCorriente?.detalle_adelantos_json && initialCuentaCorriente.detalle_adelantos_json.length > 0 && (
                                <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-3">
                                    <button 
                                        onClick={() => setExpandedAdelantos(prev => prev.includes(0) ? [] : [0])}
                                        className="flex items-center gap-1.5 text-[10px] font-black uppercase text-rose-600/70 dark:text-rose-500/50 hover:text-rose-500 transition-colors"
                                    >
                                        {expandedAdelantos.includes(0) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                        ver desglose de cuenta corriente ({initialCuentaCorriente.detalle_adelantos_json.length})
                                    </button>
                                    <AnimatePresence>
                                        {expandedAdelantos.includes(0) && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                                    {initialCuentaCorriente.detalle_adelantos_json.map((a) => {
                                                        const isEditing = editingAdelantoId === a.id
                                                        const isLoading = isActionLoading === a.id

                                                        return (
                                                            <div key={a.id} className={`flex items-center gap-3 p-2.5 bg-rose-500/5 dark:bg-rose-500/10 rounded-xl border transition-all ${selectedIds.includes(a.id) ? 'border-rose-500/40 bg-rose-500/10' : 'border-rose-500/10'} text-[11px] group/item`}>
                                                                <Checkbox 
                                                                    checked={selectedIds.includes(a.id)}
                                                                    onCheckedChange={(c) => toggleSelect(a.id, c)}
                                                                    disabled={isEditing || isLoading}
                                                                    className="h-4 w-4 rounded-md border-rose-300 dark:border-rose-700 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                                                                />
                                                                
                                                                {isEditing ? (
                                                                    <div className="flex-1 flex items-center gap-2">
                                                                        <Input 
                                                                            value={editValues?.descripcion}
                                                                            onChange={(e) => setEditValues(prev => prev ? { ...prev, descripcion: e.target.value } : null)}
                                                                            className="h-8 text-[11px] bg-white dark:bg-zinc-900 border-rose-200 dark:border-rose-800"
                                                                            autoFocus
                                                                        />
                                                                        <Input 
                                                                            type="number"
                                                                            value={editValues?.monto}
                                                                            onChange={(e) => setEditValues(prev => prev ? { ...prev, monto: Number(e.target.value) } : null)}
                                                                            className="h-8 w-24 text-[11px] bg-white dark:bg-zinc-900 border-rose-200 dark:border-rose-800"
                                                                        />
                                                                        <Button 
                                                                            size="icon" 
                                                                            className="h-8 w-8 bg-emerald-600 hover:bg-emerald-500 rounded-lg shrink-0"
                                                                            onClick={() => handleUpdateAdelanto(a.id)}
                                                                            disabled={isLoading}
                                                                        >
                                                                            {isLoading ? <Loader2 className="h-3 w-3 animate-spin"/> : <Check className="h-3 w-3"/>}
                                                                        </Button>
                                                                        <Button 
                                                                            size="icon" 
                                                                            variant="ghost" 
                                                                            className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-lg shrink-0"
                                                                            onClick={() => setEditingAdelantoId(null)}
                                                                            disabled={isLoading}
                                                                        >
                                                                            <X className="h-3 w-3"/>
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div className="flex-1 flex items-center justify-between min-w-0">
                                                                            <div className="flex flex-col min-w-0">
                                                                                <span className="text-rose-950 dark:text-rose-200 font-bold truncate">{a.descripcion}</span>
                                                                                <span className="text-rose-600/60 dark:text-rose-500/50 text-[9px] uppercase font-black">{formatDate(a.fecha)}</span>
                                                                            </div>
                                                                            <span className="text-rose-600 dark:text-rose-400 font-black ml-2">{formatCurrency(a.monto)}</span>
                                                                        </div>
                                                                        
                                                                        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                                            <Button 
                                                                                size="icon" 
                                                                                variant="ghost" 
                                                                                className="h-7 w-7 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg"
                                                                                onClick={() => {
                                                                                    setEditingAdelantoId(a.id)
                                                                                    setEditValues({ id: a.id, descripcion: a.descripcion, monto: a.monto })
                                                                                }}
                                                                            >
                                                                                <Edit2 className="h-3 w-3"/>
                                                                            </Button>
                                                                            <Button 
                                                                                size="icon" 
                                                                                variant="ghost" 
                                                                                className="h-7 w-7 text-zinc-400 hover:text-rose-600 hover:bg-rose-600/10 rounded-lg"
                                                                                onClick={() => handleDeleteAdelanto(a.id)}
                                                                                disabled={isLoading}
                                                                            >
                                                                                <Trash2 className="h-3 w-3"/>
                                                                            </Button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </Card>
                    )}

                    {liquidaciones.length > 0 ? (
                        liquidaciones.map((liq) => {
                            const bruto = liq.total_supervisor || 0

                            return (
                                <Card key={liq.id} className={`bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors rounded-3xl overflow-hidden group ${selectedIds.includes(liq.id) ? 'ring-1 ring-emerald-500/30 border-emerald-500/20' : ''}`}>
                                    <div className="p-4 sm:p-5 flex items-start gap-4">
                                        <div className="pt-1">
                                            <Checkbox 
                                                checked={selectedIds.includes(liq.id)} 
                                                onCheckedChange={(c) => toggleSelect(liq.id, c)}
                                                disabled={!!liq.pagada}
                                                className="h-5 w-5 rounded-lg border-zinc-700 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-zinc-950 dark:text-zinc-100 truncate">{liq.titulo_tarea || 'sin titulo'}</h3>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter">{liq.code_factura || 'SIN-COD'}</span>
                                                        <span className="text-zinc-800">•</span>
                                                        <span className="text-[10px] font-bold text-zinc-500">{formatDate(liq.created_at)}</span>
                                                        {liq.pagada && <Badge className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-500 text-[9px] font-black uppercase px-1.5 h-4">pagada</Badge>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        asChild 
                                                        className="h-8 w-8 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl"
                                                    >
                                                        <Link href={`/dashboard/liquidaciones/${liq.id}`}><Info className="h-4 w-4" /></Link>
                                                    </Button>
                                                    
                                                    {userRole === 'admin' && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-zinc-400 hover:text-rose-600 hover:bg-rose-600/10 rounded-xl"
                                                            onClick={() => handleDeleteLiquidacion(liq.id, !!liq.pagada)}
                                                            disabled={isActionLoading === liq.id.toString()}
                                                        >
                                                            {isActionLoading === liq.id.toString() 
                                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> 
                                                                : <Trash2 className="h-3.5 w-3.5" />
                                                            }
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-900">
                                                <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-500">total bruto a liquidar</span>
                                                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none mt-1">{formatCurrency(bruto)}</span>
                                            </div>

                                        </div>
                                    </div>
                                </Card>
                            )
                        })
                    ) : (
                        <div className="col-span-full h-40 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                            <History className="h-8 w-8 text-zinc-300 dark:text-zinc-800 mb-2" />
                            <p className="text-zinc-400 dark:text-zinc-600 font-black uppercase text-[10px] tracking-widest">sin liquidaciones encontradas</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
