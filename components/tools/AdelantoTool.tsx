"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createAdelantoAction } from "@/app/dashboard/liquidaciones/actions"
import { toast } from "sonner"
import { Landmark, Loader2, X, Calendar as CalendarIcon, DollarSign, FileText, User } from "lucide-react"

interface AdelantoToolProps {
    supervisores: { id: string; email: string }[]
    onClose?: () => void
}

export function AdelantoTool({ supervisores, onClose }: AdelantoToolProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const res = await createAdelantoAction(formData)

        if (res.success) {
            toast.success("adelanto registrado con exito")
            router.refresh()
            if (onClose) onClose()
        } else {
            toast.error(res.message)
        }
        setLoading(false)
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md mx-auto"
        >
            <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden rounded-3xl">
                <CardHeader className="border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900/50 p-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-black flex items-center gap-2 text-zinc-950 dark:text-zinc-100">
                            <Landmark className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            gestion de <span className="text-emerald-600 dark:text-emerald-500 italic">capital</span>
                        </CardTitle>
                        {onClose && (
                            <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 h-8 w-8 rounded-full">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="usuario_id" className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <User className="h-3 w-3" /> supervisor
                            </Label>
                            <Select name="usuario_id" required>
                                <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 h-11 rounded-xl focus:ring-emerald-500/20">
                                    <SelectValue placeholder="seleccionar supervisor..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200">
                                    {supervisores.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="monto" className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <DollarSign className="h-3 w-3" /> monto
                                </Label>
                                <Input
                                    id="monto"
                                    name="monto"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    required
                                    className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-100 h-11 rounded-xl focus:ring-emerald-500/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fecha" className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <CalendarIcon className="h-3 w-3" /> fecha
                                </Label>
                                <Input
                                    id="fecha"
                                    name="fecha"
                                    type="date"
                                    defaultValue={new Date().toISOString().split("T")[0]}
                                    required
                                    className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-100 h-11 rounded-xl focus:ring-emerald-500/20"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descripcion" className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <FileText className="h-3 w-3" /> descripcion
                            </Label>
                            <Input
                                id="descripcion"
                                name="descripcion"
                                placeholder="ej: adelanto materiales tigre"
                                required
                                className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-100 h-11 rounded-xl focus:ring-emerald-500/20"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black h-12 rounded-2xl shadow-lg shadow-emerald-500/10 transition-all active:scale-95 mt-2"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                "registrar adelanto"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    )
}
