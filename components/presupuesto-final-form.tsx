"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, PlusCircle, Trash2, Save } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { savePresupuestoFinal } from "@/app/actions/presupuestos-finales-actions"

interface Item {
    descripcion: string
    cantidad: number
    precio: number
    es_material?: boolean
    producto_id?: string
}

interface PresupuestoFinalFormProps {
    presupuestoBase?: any
    presupuestoFinal?: any // para edicion
    userId: string
    onCancel?: () => void
}

export default function PresupuestoFinalForm({
    presupuestoBase,
    presupuestoFinal,
    userId,
    onCancel
}: PresupuestoFinalFormProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    // estado inicial
    const [items, setItems] = useState<Item[]>(
        presupuestoFinal?.items || []
    )
    const [notas, setNotas] = useState(presupuestoFinal?.notas || "")

    // estado para nuevo item
    const [newItem, setNewItem] = useState<Item>({
        descripcion: "",
        cantidad: 1,
        precio: 0,
        es_material: false
    })

    // totales calculados
    const total = items.reduce((sum, item) => sum + (item.cantidad * item.precio), 0)

    const handleAddItem = () => {
        if (!newItem.descripcion || newItem.cantidad <= 0 || newItem.precio < 0) {
            toast.error("datos del item invalidos")
            return
        }
        setItems([...items, { ...newItem }])
        setNewItem({ descripcion: "", cantidad: 1, precio: 0, es_material: false })
    }

    const handleDeleteItem = (index: number) => {
        const newItems = [...items]
        newItems.splice(index, 1)
        setItems(newItems)
    }

    const handleSubmit = async () => {
        if (items.length === 0) {
            toast.error("debes agregar al menos un item")
            return
        }

        setIsSubmitting(true)
        try {
            const payload = {
                id: presupuestoFinal?.id,
                id_presupuesto_base: presupuestoBase?.id,
                id_tarea: presupuestoFinal?.id_tarea || presupuestoBase?.id_tarea,
                id_edificio: presupuestoFinal?.id_edificio || presupuestoBase?.tareas?.id_edificio,
                id_administrador: presupuestoFinal?.id_administrador || presupuestoBase?.id_administrador,
                notas,
                observaciones_admin: notas,
                items
            }

            const result = await savePresupuestoFinal(payload)

            if (result.success) {
                toast.success(presupuestoFinal ? "presupuesto actualizado" : "presupuesto creado con exito")
                router.push(payload.id_tarea ? `/dashboard/tareas/${payload.id_tarea}` : '/dashboard/presupuestos-finales')
                router.refresh()
            } else {
                toast.error(result.error || "error al guardar")
            }
        } catch (error: any) {
            toast.error("error inesperado: " + error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* resumen del presupuesto base (si aplica) */}
            {presupuestoBase && (
                <Card>
                    <CardHeader>
                        <CardTitle>referencia: presupuesto base</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4">
                        <div>
                            <Label>codigo</Label>
                            <div className="text-lg font-medium">{presupuestoBase.code}</div>
                        </div>
                        <div>
                            <Label>total base</Label>
                            <div className="text-lg font-medium">{formatCurrency(presupuestoBase.total || 0)}</div>
                        </div>
                        <div>
                            <Label>tarea</Label>
                            <div className="text-sm text-muted-foreground">{presupuestoBase.tareas?.titulo}</div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* tabla de items */}
            <Card>
                <CardHeader>
                    <CardTitle>items del presupuesto final</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>descripcion</TableHead>
                                    <TableHead className="w-[100px] text-right">cant</TableHead>
                                    <TableHead className="w-[120px] text-right">precio</TableHead>
                                    <TableHead className="w-[120px] text-right">subtotal</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>{item.descripcion}</TableCell>
                                        <TableCell className="text-right">{item.cantidad}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.precio)}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(item.cantidad * item.precio)}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(idx)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {items.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                                            sin items agregados
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* inputs para nuevo item */}
                    <div className="grid grid-cols-12 gap-2 items-end border p-4 rounded-md bg-muted/20">
                        <div className="col-span-6">
                            <Label>descripcion</Label>
                            <Input
                                value={newItem.descripcion}
                                onChange={(e) => setNewItem({ ...newItem, descripcion: e.target.value })}
                                placeholder="ej: pintura latex lavable..."
                            />
                        </div>
                        <div className="col-span-2">
                            <Label>cantidad</Label>
                            <Input
                                type="number"
                                min="1"
                                value={newItem.cantidad}
                                onChange={(e) => setNewItem({ ...newItem, cantidad: Number(e.target.value) })}
                            />
                        </div>
                        <div className="col-span-2">
                            <Label>precio un</Label>
                            <Input
                                type="number"
                                min="0"
                                value={newItem.precio}
                                onChange={(e) => setNewItem({ ...newItem, precio: Number(e.target.value) })}
                            />
                        </div>
                        <div className="col-span-2">
                            <Button onClick={handleAddItem} className="w-full" type="button" variant="secondary">
                                <PlusCircle className="mr-2 h-4 w-4" /> agregar
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-4 pt-4 border-t">
                        <div className="text-2xl font-bold">total: {formatCurrency(total)}</div>
                    </div>
                </CardContent>
            </Card>

            {/* notas */}
            <Card>
                <CardContent className="pt-6">
                    <Label>notas internas</Label>
                    <Textarea
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        placeholder="observaciones..."
                        rows={3}
                    />
                </CardContent>
            </Card>

            {/* actions */}
            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || items.length === 0}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    {presupuestoFinal ? "actualizar presupuesto" : "guardar presupuesto final"}
                </Button>
            </div>
        </div>
    )
}
