"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, Loader2, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { generarPagoLiquidacionesPDF } from '@/lib/pdf-liquidaciones-bulk-generator'
import { LiquidacionDTO } from '@/app/dashboard/liquidaciones/loader'

interface LiquidacionesClientWrapperProps {
    initialLiquidaciones: LiquidacionDTO[]
    userRole: string
    supervisores?: { id: string; email: string }[]
}

export function LiquidacionesClientWrapper({ initialLiquidaciones, userRole, supervisores = [] }: LiquidacionesClientWrapperProps) {
    // Estado local inicializado con datos del servidor
    const [liquidaciones, setLiquidaciones] = useState<LiquidacionDTO[]>(initialLiquidaciones)

    // Estados de UI y Filtros
    const [loading, setLoading] = useState(false)
    const [supervisorEmail, setSupervisorEmail] = useState<string | '_todos_' | ''>('_todos_')
    const [estado, setEstado] = useState<'no_pagadas' | 'pagadas' | 'todas'>('no_pagadas')
    const [selectedIds, setSelectedIds] = useState<number[]>([])

    const supabase = createClient()

    // Efecto para filtrar localmente (Client-Side Filtering SOBRE datos seguros)
    // Nota: Para Admin, initialLiquidaciones trae TODO. Filtrar aquí es seguro y rápido.
    // Para Supervisor, initialLiquidaciones trae SOLO LO SUYO. El filtro de email no hará nada o solo mostrará lo suyo.
    useEffect(() => {
        let filtered = [...initialLiquidaciones]

        // 1. Filtro por Supervisor (Solo Admin puede cambiar esto, Supervisor solo ve lo suyo)
        if (userRole === 'admin' && supervisorEmail && supervisorEmail !== '_todos_') {
            filtered = filtered.filter(l => l.email_supervisor === supervisorEmail)
        }

        // 2. Filtro por Estado Pago
        if (estado === 'no_pagadas') {
            filtered = filtered.filter(l => !l.pagada)
        } else if (estado === 'pagadas') {
            filtered = filtered.filter(l => l.pagada)
        }

        setLiquidaciones(filtered)
        setSelectedIds([]) // Limpiar selección al filtrar
    }, [initialLiquidaciones, supervisorEmail, estado, userRole])


    const formatCurrency = (amount: number | undefined) => {
        if (amount === undefined) return '-'
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const visibleSelectableIds = liquidaciones.filter(l => !l.pagada).map(l => l.id)
    const allSelected = visibleSelectableIds.length > 0 && visibleSelectableIds.every(id => selectedIds.includes(id))
    // Para el total seleccionado, usamos total_supervisor que es lo que realmente se paga
    const totalSeleccionado = liquidaciones.reduce((acc, liq) => {
        return selectedIds.includes(liq.id) && !liq.pagada ? acc + (liq.total_supervisor || 0) : acc
    }, 0)

    const toggleSelectAll = (checked: boolean | string) => {
        const isChecked = checked === true || checked === 'indeterminate'
        if (isChecked) {
            setSelectedIds(visibleSelectableIds)
        } else {
            setSelectedIds(prev => prev.filter(id => !visibleSelectableIds.includes(id)))
        }
    }

    const toggleSelect = (id: number, checked: boolean | string) => {
        const isChecked = checked === true || checked === 'indeterminate'
        setSelectedIds(prev => isChecked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id))
    }

    const pagarSeleccionadas = async () => {
        if (selectedIds.length === 0) return
        const confirmado = window.confirm(`Confirmar pago de ${selectedIds.length} liquidación(es) por un total de ${formatCurrency(totalSeleccionado)}?`)
        if (!confirmado) return

        setLoading(true)
        try {
            const { data, error } = await supabase.rpc('pagar_liquidaciones_supervisores', { p_ids: selectedIds })

            if (error) throw error

            const result = Array.isArray(data) ? data[0] : (data as any)
            const count = result?.cantidad_actualizadas || 0
            const tot = Number(result?.total_pagado || 0)

            toast.success('Pago masivo completado', { description: `Actualizadas: ${count} — Total: ${formatCurrency(tot)}` })

            // Generar PDF (Lógica Cliente mantenida)
            try {
                // En lugar de llamar a la vista (que puede tener RLS issues o ser leakeada),
                // usamos los datos que YA tenemos en memoria, actualizados a pagados.
                // Ojo: Para el PDF necesitamos datos como 'gastos_reales' que SI tenemos en el DTO.

                const itemsParaPdf = liquidaciones
                    .filter(l => selectedIds.includes(l.id))
                    .map(l => ({
                        titulo_tarea: l.titulo_tarea || 'N/A',
                        // Usamos los valores del DTO. El PDF generator usa estos campos.
                        // Si faltan campos (ej: ganancia_neta para supervisor), pasar 0 o null.
                        total_base: l.total_base || 0,
                        gastos_reales: l.gastos_reales || 0,
                        ganancia_neta: l.ganancia_neta || 0, // Admin Only
                        ganancia_supervisor: l.ganancia_supervisor || 0,
                        total_supervisor: l.total_supervisor || 0,
                    }))

                // Determinar email supervisor para el reporte
                // Si hay filtro activo, usar ese. Si no, tomar del primer item (si es uniforme).
                const supEmail = (supervisorEmail && supervisorEmail !== '_todos_')
                    ? supervisorEmail
                    : (itemsParaPdf[0] as any)?.email_supervisor

                const blob = await generarPagoLiquidacionesPDF({
                    liquidaciones: itemsParaPdf,
                    totalPagado: tot,
                    supervisorEmail: supEmail
                })

                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                const fecha = new Date()
                const yyyy = fecha.getFullYear()
                const mm = String(fecha.getMonth() + 1).padStart(2, '0')
                const dd = String(fecha.getDate()).padStart(2, '0')
                const filename = `Pago_Liquidaciones_${yyyy}-${mm}-${dd}_Total_$${Math.round(tot)}.pdf`
                a.href = url
                a.download = filename
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)

            } catch (pdfErr) {
                console.error("Error generando PDF:", pdfErr)
                toast.error("Pago registrado, pero falló la generación del PDF")
            }

            // Recargar la página para reflejar cambios frescos del servidor
            // (Alternativa a revalidar path)
            window.location.reload()

        } catch (err: any) {
            toast.error('Error al pagar', { description: err.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold">Liquidaciones de Proyectos</h1>
                    <p className="text-muted-foreground">
                        Listado de ganancias calculadas por proyecto finalizado.
                    </p>
                </div>
                <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {userRole === 'admin' && (
                        <Select
                            value={supervisorEmail || '_todos_'}
                            onValueChange={(v) => setSupervisorEmail(v)}
                        >
                            <SelectTrigger className="w-full sm:w-[240px]">
                                <SelectValue placeholder="Todos los supervisores" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_todos_">Todos los supervisores</SelectItem>
                                {supervisores.map(s => (
                                    <SelectItem key={s.id} value={s.email}>{s.email}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Select value={estado} onValueChange={(v) => setEstado(v as any)}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="no_pagadas">No pagadas</SelectItem>
                            <SelectItem value="pagadas">Pagadas</SelectItem>
                            <SelectItem value="todas">Todas</SelectItem>
                        </SelectContent>
                    </Select>

                    {userRole === 'admin' && (
                        <Button asChild className="w-full sm:w-auto">
                            <Link href="/dashboard/liquidaciones/nueva">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Nueva Liquidación
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            {userRole === 'admin' && (
                <Card>
                    <CardContent className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={toggleSelectAll}
                            />
                            <span className="text-sm">Seleccionar todo (solo impagas visibles)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm">
                                Seleccionadas: <strong>{selectedIds.length}</strong> — Total: <strong>{formatCurrency(totalSeleccionado)}</strong>
                            </span>
                            <Button onClick={pagarSeleccionadas} disabled={selectedIds.length === 0 || loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pagar seleccionadas'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Vista de tabla para pantallas medianas y grandes */}
            <Card className="hidden md:block">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {userRole === 'admin' && (
                                    <TableHead className="w-10">
                                        <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                                    </TableHead>
                                )}
                                <TableHead>Tarea</TableHead>
                                {/* Columnas condicionales: Admin ve todo, Supervisor ve restringido */}
                                {userRole === 'admin' && <TableHead>Ganancia Neta</TableHead>}
                                <TableHead>Ganancia Supervisor</TableHead>
                                {userRole === 'admin' && <TableHead>Total Supervisor</TableHead>}
                                <TableHead>Estado</TableHead>
                                <TableHead>Fecha</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {liquidaciones.length > 0 ? (
                                liquidaciones.map((liq) => (
                                    <TableRow key={liq.id}>
                                        {userRole === 'admin' && (
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(liq.id)}
                                                    onCheckedChange={(c) => toggleSelect(liq.id, c)}
                                                    disabled={!!liq.pagada}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell className="font-medium">
                                            {liq.titulo_tarea || 'N/A'}
                                            {/* Detail Link Only for Admin currently, or if detail page is safe */}
                                            {userRole === 'admin' && (
                                                <Link href={`/dashboard/liquidaciones/${liq.id}`} className="ml-2 text-xs text-blue-500 hover:underline">
                                                    (Ver detalle)
                                                </Link>
                                            )}
                                        </TableCell>

                                        {userRole === 'admin' && (
                                            <TableCell>{formatCurrency(liq.ganancia_neta)}</TableCell>
                                        )}

                                        <TableCell className="font-semibold text-green-600">{formatCurrency(liq.ganancia_supervisor)}</TableCell>

                                        {userRole === 'admin' && (
                                            <TableCell className="font-semibold">{formatCurrency(liq.total_supervisor || 0)}</TableCell>
                                        )}

                                        <TableCell>
                                            {liq.pagada ? (
                                                <Badge variant="secondary">Pagada</Badge>
                                            ) : (
                                                <Badge variant="outline">No pagada</Badge>
                                            )}
                                        </TableCell>

                                        <TableCell>{formatDate(liq.created_at)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={userRole === 'admin' ? 7 : 5} className="text-center h-24">
                                        No se encontraron liquidaciones.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Vista de tarjetas para móvil */}
            <div className="md:hidden space-y-4">
                {liquidaciones.length > 0 ? (
                    liquidaciones.map((liq) => (
                        <Card key={liq.id} className="overflow-hidden">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-md">
                                    {liq.titulo_tarea || 'Tarea no especificada'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-3 pt-0 space-y-2">
                                <div className="grid grid-cols-2 gap-1">

                                    {userRole === 'admin' && (
                                        <>
                                            <div className="text-sm text-muted-foreground">Ganancia Neta:</div>
                                            <div className="text-sm font-medium">{formatCurrency(liq.ganancia_neta)}</div>
                                        </>
                                    )}

                                    <div className="text-sm text-muted-foreground">Ganancia Supervisor:</div>
                                    <div className="text-sm font-medium text-green-600">{formatCurrency(liq.ganancia_supervisor)}</div>

                                    {userRole === 'admin' && (
                                        <>
                                            <div className="text-sm text-muted-foreground">Total Supervisor:</div>
                                            <div className="text-sm font-medium">{formatCurrency(liq.total_supervisor || 0)}</div>
                                        </>
                                    )}

                                    <div className="text-sm text-muted-foreground">Estado:</div>
                                    <div className="text-sm font-medium">{liq.pagada ? 'Pagada' : 'No pagada'}</div>

                                    <div className="text-sm text-muted-foreground">Fecha:</div>
                                    <div className="text-sm font-medium">{formatDate(liq.created_at)}</div>
                                </div>

                                {userRole === 'admin' && (
                                    <div className="pt-2 flex items-center gap-3">
                                        <Checkbox
                                            checked={selectedIds.includes(liq.id)}
                                            onCheckedChange={(c) => toggleSelect(liq.id, c)}
                                            disabled={!!liq.pagada}
                                        />
                                        <Button size="sm" variant="outline" asChild>
                                            <Link href={`/dashboard/liquidaciones/${liq.id}`}>Ver detalle</Link>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card>
                        <CardContent className="p-6 text-center text-muted-foreground">
                            No se encontraron liquidaciones.
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
