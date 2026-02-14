"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, Loader2, Check, AlertCircle, X, Plus } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
// Importamos el modal de ítems (asegúrate de que la ruta sea correcta)
import { ItemFacturaModal } from "@/components/item-factura-modal"
import { createFacturaAction } from "@/app/dashboard/facturas/actions" // Importamos la Server Action

// Interfaces adaptadas para props
interface Cliente {
    id: number
    nombre: string
    empresa: string
    email?: string
}

interface Item {
    id: number
    descripcion: string
    cantidad: number
    precio: number
    es_mano_obra?: boolean
    es_material?: boolean
    isNew?: boolean
}

interface PresupuestoFinal {
    id: number
    id_presupuesto_base: number
    cliente?: Cliente
    id_administrador?: number
    items?: Item[]
}

interface EstadoFactura {
    id: number
    nombre: string
    color: string
}

interface FacturaNuevaFormProps {
    presupuesto: PresupuestoFinal
    estadosFactura: EstadoFactura[]
    nextCodigo: string
    initialItems: Item[]
    edificios?: any[]  // Added for Protocol v82.3
    tareas?: any[]     // Added for Protocol v82.3
    presupuestosDisponibles?: any[] // Added for Protocol v82.5
}

export function FacturaNuevaForm({
    presupuesto,
    estadosFactura,
    nextCodigo,
    initialItems,
    presupuestosDisponibles = [],
    edificios,
    tareas
}: FacturaNuevaFormProps) {
    const router = useRouter()

    // 🔌 Selector de Presupuesto (Si no hay presupuesto seleccionado)
    if (!presupuesto) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Seleccionar Presupuesto</CardTitle>
                        <CardDescription>
                            Para crear una nueva factura, primero selecciona un presupuesto aprobado que no haya sido facturado aún.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {presupuestosDisponibles.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <AlertCircle className="h-10 w-10 mx-auto mb-2 text-yellow-500" />
                                <p>No hay presupuestos aprobados pendientes de facturación.</p>
                                <Button variant="link" onClick={() => router.push('/dashboard/presupuestos')}>
                                    Ir a Presupuestos
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>Presupuestos Disponibles</Label>
                                    <div className="grid gap-2">
                                        {presupuestosDisponibles.map((p) => (
                                            <Button
                                                key={p.id}
                                                variant="outline"
                                                className="justify-between h-auto py-3 px-4"
                                                onClick={() => {
                                                    toast.info("Cargando datos del presupuesto...")
                                                    router.push(`/dashboard/facturas/nueva?presupuesto_final_id=${p.id}`)
                                                }}
                                            >
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="font-semibold">{p.code} - {p.clientes?.empresa || p.clientes?.nombre || 'Sin cliente'}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Total: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(p.total || 0)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center text-primary text-xs font-medium">
                                                    Seleccionar <Check className="ml-1 h-3 w-3" />
                                                </div>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <div className="text-center">
                    <Button variant="ghost" onClick={() => router.back()}>
                        Volver al Dashboard
                    </Button>
                </div>
            </div>
        )
    }

    // Estados
    const [guardando, setGuardando] = useState(false)
    const [estadoSeleccionado, setEstadoSeleccionado] = useState<number>(1) // Borrador por defecto
    const [numeroFactura, setNumeroFactura] = useState<string>("") // Campo datos_afip
    const [fechaVencimiento, setFechaVencimiento] = useState<Date>(new Date(new Date().setDate(new Date().getDate() + 30)))
    const [notas, setNotas] = useState<string>("")
    const [items, setItems] = useState<Item[]>(initialItems)
    const [itemModalOpen, setItemModalOpen] = useState<boolean>(false)
    const [editingItem, setEditingItem] = useState<Item | undefined>(undefined)
    const [tieneManoObra, setTieneManoObra] = useState<boolean>(initialItems.some(i => i.es_mano_obra))

    // Calcular subtotal
    const subtotalItems = items.reduce((sum, item) => sum + (item.cantidad * item.precio), 0)

    // Handlers para ítems
    const handleDeleteItem = (itemIdToDelete: number) => {
        setItems(prev => prev.filter(i => i.id !== itemIdToDelete))
        toast.info("Ítem eliminado")
    }

    const handleAddItem = () => {
        setEditingItem(undefined)
        setItemModalOpen(true)
    }

    const handleEditItem = (item: Item) => {
        setEditingItem({ ...item, isNew: false })
        setItemModalOpen(true)
    }

    const handleSaveItem = (itemData: Omit<Item, "id">) => {
        if (editingItem) {
            setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...itemData } : i))
            toast.success("Ítem actualizado")
        } else {
            setItems(prev => [...prev, { id: Date.now(), ...itemData }])
            toast.success("Ítem añadido")
        }
        // Verificar mano de obra
        const hayManoObra = items.some(i => !!i.es_mano_obra) || !!itemData.es_mano_obra
        setTieneManoObra(hayManoObra)
    }

    // Handle Submit con Server Action
    const handleSubmit = async () => {
        if (!presupuesto.id_administrador) {
            toast.error("Error: El presupuesto no tiene administrador asignado.")
            return
        }

        setGuardando(true)

        try {
            const result = await createFacturaAction({
                id_presupuesto_final: presupuesto.id,
                id_presupuesto: presupuesto.id_presupuesto_base,
                id_estado_nuevo: estadoSeleccionado,
                datos_afip: numeroFactura || null,
                id_administrador: presupuesto.id_administrador,
                items: items.map(i => ({
                    descripcion: i.descripcion,
                    cantidad: i.cantidad,
                    precio: i.precio,
                    es_mano_obra: i.es_mano_obra || false,
                    es_material: i.es_material || false
                })),
                notas: notas
            })

            if (result.success) {
                toast.success("Factura creada exitosamente")
                router.push("/dashboard/facturas")
            } else {
                toast.error(`Error al crear factura: ${result.message}`)
            }
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado al crear la factura")
        } finally {
            setGuardando(false)
        }
    }

    return (
        <div className="flex-1 space-y-6">
            <div className="flex items-center justify-end space-x-2">
                <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={guardando}>
                    {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Guardar Factura
                </Button>
            </div>

            <div className="space-y-6">
                {/* Datos Principales */}
                <Card>
                    <CardHeader>
                        <CardTitle>Datos Principales</CardTitle>
                        <CardDescription>Información básica de la factura</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Código (Automático)</Label>
                            <Input value={nextCodigo} readOnly className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label>Número AFIP</Label>
                            <Input value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)} placeholder="Ej: A-0001-..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha Vencimiento</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !fechaVencimiento && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {fechaVencimiento ? format(fechaVencimiento, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={fechaVencimiento} onSelect={(date) => date && setFechaVencimiento(date)} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </CardContent>
                </Card>

                {/* Estado */}
                <Card>
                    <CardHeader>
                        <CardTitle>Estado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {estadosFactura.map(estado => (
                                <Button
                                    key={estado.id}
                                    variant={estadoSeleccionado === estado.id ? "default" : "outline"}
                                    onClick={() => setEstadoSeleccionado(estado.id)}
                                    className={estadoSeleccionado === estado.id ? `bg-${estado.color}-500` : ''}
                                >
                                    {estado.nombre}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Items */}
                <Card>
                    <CardHeader>
                        <CardTitle>Ítems</CardTitle>
                        <CardDescription>Total calculado: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(subtotalItems)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {items.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="py-2 text-left">Descripción</th>
                                            <th className="py-2 text-right">Cant.</th>
                                            <th className="py-2 text-right">Precio</th>
                                            <th className="py-2 text-right">Subtotal</th>
                                            <th className="py-2 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map(item => (
                                            <tr key={item.id} className="border-b">
                                                <td className="py-2">{item.descripcion}</td>
                                                <td className="py-2 text-right">{item.cantidad}</td>
                                                <td className="py-2 text-right">{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(item.precio)}</td>
                                                <td className="py-2 text-right">{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(item.cantidad * item.precio)}</td>
                                                <td className="py-2 text-center">
                                                    <Button variant="ghost" size="sm" onClick={() => handleEditItem(item)}><span className="sr-only">Editar</span>✏️</Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)}><X className="h-4 w-4 text-red-500" /></Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="text-center text-muted-foreground py-4">Sin ítems</p>}

                        <div className="mt-4">
                            <Button onClick={handleAddItem}><Plus className="mr-2 h-4 w-4" /> Añadir Ítem</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Notas */}
                <Card>
                    <CardHeader><CardTitle>Notas</CardTitle></CardHeader>
                    <CardContent>
                        <Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3} placeholder="Notas adicionales..." />
                    </CardContent>
                </Card>
            </div>

            <ItemFacturaModal open={itemModalOpen} setOpen={setItemModalOpen} onSave={handleSaveItem} editingItem={editingItem} />
        </div>
    )
}
