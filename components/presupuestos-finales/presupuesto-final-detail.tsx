"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { ArrowLeft, Loader2, PlusCircle, Send, MoreVertical, FileText, Edit, LayoutDashboard, Wallet, ReceiptText } from "lucide-react"
import { formatDate } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/utils"
import { ExportPresupuestoButton } from "@/components/export-presupuesto-button"
import { AprobadoCheckbox } from "@/app/dashboard/presupuestos-finales/[id]/aprobado-checkbox"
import { marcarPresupuestoComoEnviado } from "@/app/dashboard/presupuestos-finales/actions"
import { toast as sonnerToast } from "sonner"

interface PresupuestoFinalItem {
    id: number
    id_presupuesto: number
    descripcion: string
    cantidad: number
    precio: number
    es_producto?: boolean
    es_material?: boolean
    producto_id?: string
}

interface PresupuestoFinalDetailProps {
    presupuesto: any
    items: PresupuestoFinalItem[]
}

export function PresupuestoFinalDetail({ presupuesto, items }: PresupuestoFinalDetailProps) {
    const [enviando, setEnviando] = useState(false)
    const router = useRouter()

    const handleMarcarComoEnviado = async () => {
        if (!confirm('¿Estás seguro de marcar este presupuesto como enviado?')) {
            return
        }

        setEnviando(true)
        try {
            const result = await marcarPresupuestoComoEnviado(presupuesto.id)

            if (result.success) {
                sonnerToast.success(result.message)
                router.refresh()
            } else {
                sonnerToast.error(result.message || 'Error al marcar como enviado')
            }
        } catch (error: any) {
            sonnerToast.error(error.message || 'Error inesperado')
        } finally {
            setEnviando(false)
        }
    }

    const datosParaPDF = {
        presupuestoId: presupuesto.id,
        codigo: presupuesto.code,
        fecha: new Date(presupuesto.created_at),
        referencia: '',
        cliente: {
            nombre: presupuesto.nombre_edificio || 'N/A',
            cuit: presupuesto.edificio_info?.cuit || '',
            tarea: presupuesto.titulo_tarea || ''
        },
        items: items.map((item) => ({
            id: item.id,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            tarifa: item.precio,
            total: item.cantidad * item.precio,
        })),
        totalPresupuesto: presupuesto.total,
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Platinum Style */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-muted transition-all">
                        <Link href="/dashboard/presupuestos-finales">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg text-white flex-shrink-0 transform hover:scale-105 transition-transform">
                        <FileText className="h-7 w-7" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black tracking-tight text-foreground/90">
                                {presupuesto.tareas?.titulo || 'Detalle de Presupuesto'}
                            </h1>
                            <Badge variant="outline" className="font-mono text-[10px] hidden sm:inline-flex bg-muted/50 border-primary/20">
                                {presupuesto.code || `#${presupuesto.id}`}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground flex items-center gap-2 text-sm mt-0.5">
                            <LayoutDashboard className="h-3.5 w-3.5 text-indigo-500" />
                            <span className="font-medium text-foreground/70">{presupuesto.tareas?.edificios?.nombre || 'Administración Central'}</span>
                            <span className="text-muted-foreground/50">•</span>
                            <span>{formatDate(presupuesto.created_at)}</span>
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="hidden md:flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-lg border">
                        <AprobadoCheckbox
                            presupuestoId={presupuesto.id}
                            initialValue={presupuesto.aprobado || false}
                        />
                    </div>
                    <ExportPresupuestoButton
                        {...datosParaPDF}
                    />
                    <div className="flex-1 md:flex-none">
                        {presupuesto.codigo_estado !== 'facturado' && (
                            <Button
                                className="w-full md:w-auto gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md transform hover:-translate-y-0.5 transition-all text-white border-none"
                                onClick={handleMarcarComoEnviado}
                                disabled={enviando}
                            >
                                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Marcar como Enviado
                            </Button>
                        )}
                    </div>

                    {/* Más acciones Desktop */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-10 w-10">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                                <Link href={`/dashboard/presupuestos-finales/editar/${presupuesto.id}`} className="flex items-center gap-2">
                                    <Edit className="h-4 w-4" /> Editar Presupuesto
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={`/dashboard/facturas/nueva?presupuesto_final_id=${presupuesto.id}`} className="flex items-center gap-2">
                                    <ReceiptText className="h-4 w-4" /> Crear Factura
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Mobile Actions Overlay - Premium touch */}
            <div className="md:hidden flex flex-col gap-3">
                <div className="bg-muted/30 p-4 rounded-xl border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full animate-pulse ${presupuesto.aprobado ? 'bg-green-500' : 'bg-amber-500'}`} />
                        <span className="text-sm font-semibold">{presupuesto.aprobado ? 'Presupuesto Aprobado' : 'Pendiente de Aprobación'}</span>
                    </div>
                    <AprobadoCheckbox
                        presupuestoId={presupuesto.id}
                        initialValue={presupuesto.aprobado || false}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Resume Card */}
                <Card className="lg:col-span-2 shadow-sm border-muted-foreground/10">
                    <CardHeader className="bg-muted/20 pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <LayoutDashboard className="h-5 w-5 text-primary" />
                            Información del General
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Edificio / Cliente</p>
                                <p className="text-base font-semibold">{presupuesto.nombre_edificio || 'N/A'}</p>
                                {presupuesto.edificio_info?.cuit && (
                                    <p className="text-xs text-muted-foreground font-mono">CUIT: {presupuesto.edificio_info.cuit}</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Estado Actual</p>
                                <div className="flex items-center gap-2">
                                    {presupuesto.estados_presupuestos && (
                                        <Badge
                                            style={{
                                                backgroundColor: presupuesto.estados_presupuestos.color || "#888",
                                                color: "white"
                                            }}
                                            className="border-0 shadow-sm"
                                        >
                                            {presupuesto.estados_presupuestos.nombre}
                                        </Badge>
                                    )}
                                    {presupuesto.aprobado && (
                                        <Badge className="bg-green-600 text-white border-0 shadow-sm">
                                            Aprobado ✓
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Tarea Relacionada</p>
                                <p className="text-base font-medium">{presupuesto.titulo_tarea || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Fechas</p>
                                <div className="text-sm space-y-1">
                                    <p><span className="text-muted-foreground">Creado:</span> {formatDate(presupuesto.created_at)}</p>
                                    {presupuesto.fecha_aprobacion && (
                                        <p><span className="text-muted-foreground">Aprobado:</span> {formatDate(presupuesto.fecha_aprobacion)}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Totals Card */}
                <Card className="shadow-md border-primary/10 overflow-hidden">
                    <CardHeader className="bg-primary/5 pb-4 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-primary" />
                            Resumen Financiero
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Mano de Obra</span>
                            <span className="font-medium text-foreground">{formatCurrency(presupuesto.mano_obra || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Materiales</span>
                            <span className="font-medium text-foreground">{formatCurrency(presupuesto.materiales || 0)}</span>
                        </div>
                        <div className="pt-4 border-t flex justify-between items-end">
                            <span className="text-sm font-bold text-muted-foreground uppercase">Total Final</span>
                            <span className="text-3xl font-black tracking-tighter text-primary">
                                {formatCurrency(presupuesto.total)}
                            </span>
                        </div>

                        {presupuesto.presupuestos_base?.total && (
                            <div className="mt-6 pt-4 border-t border-dashed">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Comparativa vs Base</p>
                                <div className="flex justify-between items-center text-xs mb-1">
                                    <span>Presupuesto Base:</span>
                                    <span className="font-mono">{formatCurrency(presupuesto.presupuestos_base.total)}</span>
                                </div>
                                <div className={`flex justify-between items-center p-2 rounded-lg ${presupuesto.total > presupuesto.presupuestos_base.total ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                    <span className="text-xs font-bold">Diferencia:</span>
                                    <span className="font-black">
                                        {presupuesto.total > presupuesto.presupuestos_base.total ? '+' : ''}
                                        {formatCurrency(presupuesto.total - presupuesto.presupuestos_base.total)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Items Card */}
            <Card className="shadow-sm border-muted-foreground/10 overflow-hidden">
                <CardHeader className="bg-muted/10 border-b">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ReceiptText className="h-5 w-5 text-primary" />
                            Desglose de Ítems ({items.length})
                        </CardTitle>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                            {items.length} Componentes
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    {/* Tablet/Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    <th className="text-left p-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground w-12">#</th>
                                    <th className="text-left p-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Descripción del Trabajo / Insumo</th>
                                    <th className="text-center p-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground w-28">Tipo</th>
                                    <th className="text-right p-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground w-24">Cant.</th>
                                    <th className="text-right p-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground w-32">Precio Unit.</th>
                                    <th className="text-right p-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground w-32">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={item.id} className="border-b hover:bg-muted/20 transition-colors group">
                                        <td className="p-4 text-muted-foreground font-mono">{idx + 1}</td>
                                        <td className="p-4">
                                            <p className="font-semibold text-foreground/80 group-hover:text-primary transition-colors">{item.descripcion}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            {item.es_material ? (
                                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none text-[10px]">MATERIAL</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] border-muted-foreground/30">SERVICIO</Badge>
                                            )}
                                        </td>
                                        <td className="p-4 text-right font-medium">{item.cantidad}</td>
                                        <td className="p-4 text-right text-muted-foreground">{formatCurrency(item.precio)}</td>
                                        <td className="p-4 text-right font-black text-foreground/90">
                                            {formatCurrency(item.cantidad * (item.precio || 0))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-primary/[0.03]">
                                    <td colSpan={5} className="p-6 text-right font-black uppercase tracking-tighter text-muted-foreground">Total Detallado</td>
                                    <td className="p-6 text-right text-2xl font-black tracking-tighter text-primary">
                                        {formatCurrency(presupuesto.total)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Mobile Items List */}
                    <div className="md:hidden divide-y">
                        {items.map((item, idx) => (
                            <div key={item.id} className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-2">
                                        <span className="text-xs font-mono text-muted-foreground p-1 bg-muted rounded">{idx + 1}</span>
                                        <p className="font-bold text-sm">{item.descripcion}</p>
                                    </div>
                                    {item.es_material ? (
                                        <Badge className="bg-blue-100 text-blue-700 border-none text-[8px] h-4">MAT</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[8px] h-4">SRV</Badge>
                                    )}
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground/70">{item.cantidad}</span> x {formatCurrency(item.precio)}
                                    </div>
                                    <div className="font-black text-sm text-primary">
                                        {formatCurrency(item.cantidad * (item.precio || 0))}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="p-6 bg-primary/5 flex justify-between items-center">
                            <span className="font-black text-xs uppercase tracking-widest text-muted-foreground">Total</span>
                            <span className="text-2xl font-black tracking-tighter text-primary">
                                {formatCurrency(presupuesto.total)}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {presupuesto.observaciones_admin && (
                <Card className="border-amber-200 bg-amber-50/30">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-amber-800">Observaciones Administrativas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-amber-900/80 leading-relaxed italic">
                            "{presupuesto.observaciones_admin}"
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
