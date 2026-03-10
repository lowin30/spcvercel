"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Zap } from "lucide-react"
import { createPresupuestoBase, updatePresupuestoBase } from "@/app/dashboard/presupuestos-base/actions"

interface Tarea {
    id: number
    titulo: string
    code: string
}

interface FormularioPBPlatinumProps {
    tareas: Tarea[]
    presupuesto?: {
        id: number;
        id_tarea: number;
        materiales: number;
        mano_obra: number;
        nota_pb: string;
        [key: string]: any;
    }
    isReadOnly?: boolean
    onSuccess: () => void
    initialTareaId?: string
}

export function FormularioPBPlatinum({
    tareas,
    presupuesto,
    isReadOnly = false,
    onSuccess,
    initialTareaId
}: FormularioPBPlatinumProps) {

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [tareaId, setTareaId] = useState(initialTareaId || presupuesto?.id_tarea?.toString() || "")
    const [materiales, setMateriales] = useState(presupuesto?.materiales?.toString() || "")
    const [manoObra, setManoObra] = useState(presupuesto?.mano_obra?.toString() || "")
    const [notaPb, setNotaPb] = useState(presupuesto?.nota_pb || "")

    const totalCalculado = (Number.parseInt(materiales) || 0) + (Number.parseInt(manoObra) || 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!tareaId || materiales === "" || manoObra === "") {
            toast.error("Por favor completa los campos de tarea, materiales y mano de obra requeridos")
            return
        }

        setIsSubmitting(true)

        try {
            if (presupuesto) {
                const updateData = {
                    id_tarea: Number.parseInt(tareaId),
                    materiales: Number.parseInt(materiales),
                    mano_obra: Number.parseInt(manoObra),
                    nota_pb: notaPb,
                }
                const result = await updatePresupuestoBase(presupuesto.id, updateData)
                if (!result.success) throw new Error(result.error)
                toast.success("El presupuesto base ha sido actualizado correctamente")
            } else {
                const createData = {
                    id_tarea: Number.parseInt(tareaId),
                    materiales: Number.parseInt(materiales),
                    mano_obra: Number.parseInt(manoObra),
                    nota_pb: notaPb,
                }
                const result = await createPresupuestoBase(createData)
                if (!result.success) throw new Error(result.error)
                toast.success("El presupuesto base ha sido creado correctamente")
            }

            onSuccess() // Callback para cerrar el dialog y refrescar si es necesario

        } catch (error: any) {
            console.error("Error al guardar presupuesto base:", error)
            toast.error(error.message || "Ocurrió un error al guardar el presupuesto base")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div className="space-y-2">
                <Label htmlFor="tarea">Seleccionar Tarea Base</Label>
                {tareas.length > 0 ? (
                    <Select value={tareaId} onValueChange={setTareaId} disabled={isSubmitting || !!presupuesto || !!initialTareaId || isReadOnly}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona una tarea de tu lista activa..." />
                        </SelectTrigger>
                        <SelectContent>
                            {tareas.map((tarea) => (
                                <SelectItem key={tarea.id} value={tarea.id.toString()}>
                                    {tarea.code} - {tarea.titulo}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <div className="p-4 border rounded-md bg-muted/50 text-center">
                        <p className="text-muted-foreground text-sm">No tienes tareas activas disponibles sin presupuesto.</p>
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 group">
                    <Label htmlFor="materiales" className="text-xs font-black uppercase tracking-widest text-muted-foreground group-focus-within:text-violet-600 transition-colors">Total Materiales ($)</Label>
                    <div className="relative">
                        <Input
                            id="materiales"
                            type="number"
                            value={materiales}
                            onChange={(e) => setMateriales(e.target.value)}
                            disabled={isSubmitting || isReadOnly}
                            min="0"
                            required
                            className="text-2xl font-black h-14 bg-muted/20 border-border/50 rounded-xl focus:ring-violet-600 transition-all pl-10"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                    </div>
                </div>

                <div className="space-y-2 group">
                    <Label htmlFor="manoObra" className="text-xs font-black uppercase tracking-widest text-muted-foreground group-focus-within:text-violet-600 transition-colors">Mano de Obra ($)</Label>
                    <div className="relative">
                        <Input
                            id="manoObra"
                            type="number"
                            value={manoObra}
                            onChange={(e) => setManoObra(e.target.value)}
                            disabled={isSubmitting || isReadOnly}
                            min="0"
                            required
                            className="text-2xl font-black h-14 bg-muted/20 border-border/50 rounded-xl focus:ring-violet-600 transition-all pl-10"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                    </div>
                </div>
            </div>

            <div className="space-y-2 p-6 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-2xl shadow-violet-500/20 flex justify-between items-center border border-white/20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 to-transparent opacity-50" />
                <div className="relative z-10">
                    <Label htmlFor="total" className="text-white/70 uppercase text-[10px] tracking-[0.2em] font-black">Inversión Total Estimada</Label>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black tracking-tighter transition-all group-hover:scale-105 duration-300">
                            ${totalCalculado.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-xs font-bold text-white/50 uppercase">AR$</span>
                    </div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center relative z-10">
                    <Zap className="h-6 w-6 text-yellow-300 fill-yellow-300 drop-shadow-lg" />
                </div>
            </div>


            <div className="space-y-2">
                <Label htmlFor="notaPb">Consideraciones Rápidas (Opcional)</Label>
                <Textarea
                    id="notaPb"
                    value={notaPb}
                    onChange={(e) => setNotaPb(e.target.value)}
                    placeholder="Añade notas tácticas sobre el estimado..."
                    rows={2}
                    disabled={isSubmitting || isReadOnly}
                    className="resize-none"
                />
            </div>

            <div className="flex justify-end pt-2">
                <Button
                    type="submit"
                    size="lg"
                    className="w-full h-14 font-black rounded-2xl bg-violet-600 hover:bg-violet-700 shadow-xl shadow-violet-500/20 transition-all border-b-4 border-violet-800 active:border-b-0 active:translate-y-1 uppercase tracking-widest text-xs"
                    disabled={isSubmitting || (!presupuesto && !tareaId) || isReadOnly}
                >
                    {isSubmitting ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando Central...</>
                    ) : presupuesto ? (
                        "Actualizar Master"
                    ) : (
                        "Guardar Master"
                    )}
                </Button>

            </div>
        </form>
    )
}
