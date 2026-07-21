"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, Edit3, Check, X, Loader2, Sparkles, BrainCircuit, ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase-client"
import { ToolGastoPlatinumProps } from "./types"
import { analizarGastoAction, registrarGastoAction } from "@/app/actions/gastos"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

type PasoType = 'seleccion' | 'procesando' | 'confirmacion' | 'completado'

type ModoImagenType = 'original' | 'suave' | 'fuerte'

export function ToolGastoRegistry({
    tareaId,
    onSuccess,
    userRole,
    userId,
    editData
}: ToolGastoPlatinumProps) {
    const [paso, setPaso] = useState<PasoType>('seleccion')
    const [loading, setLoading] = useState(false)
    const [analizandoIA, setAnalizandoIA] = useState(false)
    const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null)
    const [imagenProcesadaUrl, setImagenProcesadaUrl] = useState<string | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [modoImagen, setModoImagen] = useState<ModoImagenType>('suave')

    useEffect(() => {
        try {
            const saved = localStorage.getItem('spc_modo_imagen')
            if (saved === 'original' || saved === 'suave' || saved === 'fuerte') {
                setModoImagen(saved as ModoImagenType)
            }
        } catch { }
    }, [])

    useEffect(() => {
        try {
            localStorage.setItem('spc_modo_imagen', modoImagen)
        } catch { }
    }, [modoImagen])

    const generarUrlProcesada = (originalUrl: string, modo: ModoImagenType): string => {
        switch (modo) {
            case 'fuerte':
                return originalUrl.replace('/upload/', '/upload/e_grayscale,e_contrast:40,e_sharpen:80/')
            case 'suave':
                return originalUrl.replace('/upload/', '/upload/e_grayscale,e_contrast:20,e_sharpen:40/')
            case 'original':
            default:
                return originalUrl
        }
    }
    const [tareas, setTareas] = useState<{ id: number; titulo: string; code: string }[]>([])
    const [selectedTareaId, setSelectedTareaId] = useState<string | null>(tareaId ? tareaId.toString() : null)

    const [formData, setFormData] = useState({
        monto: "",
        descripcion: "",
        fecha_gasto: new Date().toISOString().split("T")[0],
        tipo_gasto: "material" as "material" | "herramienta" | "transporte" | "otro" | "mano_de_obra"
    })

    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    // Precargar datos si estamos en modo edición
    useEffect(() => {
        if (editData) {
            setFormData({
                monto: editData.monto.toString(),
                descripcion: editData.descripcion,
                fecha_gasto: editData.fecha.split("T")[0],
                tipo_gasto: (editData.detalle_tipo || 'material') as any
            })
            setSelectedTareaId(editData.id_tarea.toString())
            setPaso('confirmacion')
        }
    }, [editData])

    // Cargar tareas si no se provee una tareaId específica (Contexto Global)
    useEffect(() => {
        if (!tareaId) {
            const fetchTareas = async () => {
                const { data } = await supabase
                    .from('vista_tareas_completa') // Usamos la vista estándar del dashboard
                    .select('id, titulo, code')
                    .eq('finalizada', false) // Solo tareas activas
                    .order('titulo')

                if (data) {
                    setTareas(data.map(t => ({
                        id: t.id,
                        titulo: t.titulo,
                        code: t.code
                    })))
                }
            }
            fetchTareas()
        }
    }, [tareaId])

    // Limpieza de URLs para evitar fugas de memoria
    React.useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl)
        }
    }, [previewUrl])

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setLoading(true)
        setPaso('procesando')

        try {
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
            await analizarGastoConIA(file)
            setPaso('confirmacion')
        } catch (error) {
            toast.error("Error al procesar la imagen")
            setPaso('seleccion')
        } finally {
            setLoading(false)
        }
    }

    const analizarGastoConIA = async (file: File) => {
        setAnalizandoIA(true)
        try {
            toast.info("🤖 IA analizando comprobante...", {
                icon: <BrainCircuit className="w-4 h-4" />,
                duration: 2500
            })

            // 1. Redimensionar para optimizar envío (Max 1024px)
            const imageBitmap = await createImageBitmap(file)
            const canvas = document.createElement('canvas')
            const MAX_SIZE = 1024
            let width = imageBitmap.width
            let height = imageBitmap.height

            if (width > MAX_SIZE || height > MAX_SIZE) {
                if (width > height) {
                    height = (height / width) * MAX_SIZE
                    width = MAX_SIZE
                } else {
                    width = (width / height) * MAX_SIZE
                    height = MAX_SIZE
                }
            }

            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error("Error al crear canvas")
            ctx.drawImage(imageBitmap, 0, 0, width, height)

            const base64data = canvas.toDataURL('image/jpeg', 0.8)

            // 2. Llamada a la Server Action
            const data = await analizarGastoAction(base64data)

            if (data.success && data.datos) {
                setFormData(prev => ({
                    ...prev,
                    monto: data.datos.monto ? Math.round(data.datos.monto).toString() : prev.monto,
                    descripcion: data.datos.descripcion || prev.descripcion,
                    fecha_gasto: data.datos.fecha_gasto || prev.fecha_gasto,
                    tipo_gasto: (data.datos.tipo_gasto || 'material') as any
                }))
                toast.success("✨ ¡Datos detectados automáticamente!", {
                    icon: <Sparkles className="w-4 h-4 text-amber-500" />,
                    duration: 3000
                })

                // guardar las urls para la persistencia final (v112.0)
                if (data.comprobanteUrl) {
                    setComprobanteUrl(data.comprobanteUrl)
                }
                if (data.imagenProcesadaUrl) {
                    setImagenProcesadaUrl(data.imagenProcesadaUrl)
                }
            }
        } catch (error: any) {
            console.error("Error en IA Scanner:", error)
            toast.warning("La IA tuvo un problema técnico, pero puedes completar los datos manualmente.", {
                duration: 5000
            })
        } finally {
            setAnalizandoIA(false)
        }
    }


    const handleGuardar = async () => {
        if (!formData.monto || !formData.descripcion) {
            toast.error("Por favor completa los campos obligatorios")
            return
        }

        const taskToUse = tareaId || (selectedTareaId ? parseInt(selectedTareaId) : null)

        if (!taskToUse) {
            toast.error("Debes seleccionar una tarea para el gasto")
            return
        }

        setLoading(true)
        try {
            // Extracción del ID real (eliminando prefijos G- o J- de la vista platinum v3.0)
            const realId = editData?.event_id?.toString().includes('-') 
                ? parseInt(editData.event_id.toString().split('-')[1]) 
                : editData?.event_id;

            // generar url procesada dinamicamente segun el modo elegido (sin subir segundo archivo)
            const finalImagenProcesadaUrl = comprobanteUrl
                ? generarUrlProcesada(comprobanteUrl, modoImagen)
                : null

            const gastoData = {
                id: realId,
                id_tarea: taskToUse,
                monto: parseFloat(formData.monto),
                descripcion: formData.descripcion,
                fecha_gasto: formData.fecha_gasto,
                id_usuario: userId,
                liquidado: false,
                tipo_gasto: formData.tipo_gasto,
                comprobante_url: comprobanteUrl,
                imagen_procesada_url: finalImagenProcesadaUrl
            }

            // Llamada a la Server Action (Gold Standard v81.0 - Bypass RLS seguro)
            const result = await registrarGastoAction(gastoData)

            if (!result.success) throw new Error(result.error)

            toast.success(result.message, { icon: <Check className="w-4 h-4" /> })
            if (onSuccess) onSuccess()
            setPaso('seleccion')
            setFormData({
                monto: "",
                descripcion: "",
                fecha_gasto: new Date().toISOString().split("T")[0],
                tipo_gasto: "material"
            })
            setComprobanteUrl(null)
            setImagenProcesadaUrl(null)
            setPreviewUrl(null)
        } catch (error: any) {
            console.error("Error guardando gasto:", error)
            toast.error(error.message || "Error al guardar el gasto")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <AnimatePresence mode="wait">
                {paso === 'seleccion' && (
                    <motion.div
                        key="seleccion"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-4 w-full"
                    >
                        {/* Selector de modo de imagen (protocolo platinum) */}
                        <div className="space-y-2 bg-slate-50/50 dark:bg-zinc-900/50 p-3 rounded-2xl border border-slate-200/50 dark:border-zinc-800/50">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 ml-1">
                                modo de imagen
                            </Label>
                            <RadioGroup
                                value={modoImagen}
                                onValueChange={(v) => setModoImagen(v as ModoImagenType)}
                                className="grid grid-cols-3 gap-2"
                            >
                                <div className="flex items-center space-x-2 bg-white dark:bg-zinc-950 p-2 rounded-xl border border-slate-200/60 dark:border-zinc-800/60 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all">
                                    <RadioGroupItem value="original" id="modo_original_reg" />
                                    <Label htmlFor="modo_original_reg" className="cursor-pointer text-xs font-bold text-slate-700 dark:text-zinc-300">original</Label>
                                </div>
                                <div className="flex items-center space-x-2 bg-white dark:bg-zinc-950 p-2 rounded-xl border border-slate-200/60 dark:border-zinc-800/60 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all">
                                    <RadioGroupItem value="suave" id="modo_suave_reg" />
                                    <Label htmlFor="modo_suave_reg" className="cursor-pointer text-xs font-bold text-slate-700 dark:text-zinc-300">suave</Label>
                                </div>
                                <div className="flex items-center space-x-2 bg-white dark:bg-zinc-950 p-2 rounded-xl border border-slate-200/60 dark:border-zinc-800/60 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all">
                                    <RadioGroupItem value="fuerte" id="modo_fuerte_reg" />
                                    <Label htmlFor="modo_fuerte_reg" className="cursor-pointer text-xs font-bold text-slate-700 dark:text-zinc-300">fuerte</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            className="h-32 rounded-3xl border-2 border-dashed flex flex-col gap-2 hover:border-violet-500 hover:bg-violet-500/5 transition-all duration-300"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="relative">
                                <Camera className="w-8 h-8 text-violet-600" />
                                <Sparkles className="w-3 h-3 text-violet-400 absolute -top-1 -right-1 animate-pulse" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest">IA Scanner</span>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileSelect}
                            />
                        </Button>

                        <Button
                            variant="outline"
                            className="h-32 rounded-3xl border-2 border-dashed flex flex-col gap-2 hover:border-blue-500 hover:bg-blue-500/5 transition-all duration-300"
                            onClick={() => setPaso('confirmacion')}
                        >
                            <Edit3 className="w-8 h-8 text-blue-600" />
                            <span className="text-xs font-black uppercase tracking-widest">Manual</span>
                        </Button>
                        </div>
                    </motion.div>
                )}

                {paso === 'procesando' && (
                    <motion.div
                        key="procesando"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-64 flex flex-col items-center justify-center gap-6 text-center"
                    >
                        <div className="relative">
                            <motion.div
                                className="absolute inset-0 bg-violet-500/20 rounded-full blur-2xl"
                                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                            <div className="relative bg-background rounded-full p-6 border-4 border-violet-500/10">
                                <Loader2 className="w-16 h-16 text-violet-600 animate-spin" />
                                <BrainCircuit className="w-8 h-8 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-lg font-black uppercase tracking-[0.2em] text-violet-600">Analizando</p>
                            <p className="text-xs font-medium text-muted-foreground max-w-[200px] mx-auto">
                                La IA está extrayendo montos y descripciones de tu comprobante...
                            </p>
                        </div>
                    </motion.div>
                )}

                {paso === 'confirmacion' && (
                    <motion.div
                        key="confirmacion"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        {(previewUrl || comprobanteUrl) && (
                            <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-zinc-800 bg-slate-900/5 dark:bg-zinc-950 flex flex-col items-center justify-center p-3">
                                <img
                                    src={comprobanteUrl ? generarUrlProcesada(comprobanteUrl, modoImagen) : (previewUrl || '')}
                                    alt="Comprobante"
                                    className="max-h-52 object-contain rounded-xl shadow-md border border-slate-200/50 dark:border-zinc-800/50"
                                />
                                <span className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 bg-white/80 dark:bg-zinc-900/80 px-3 py-1 rounded-full border border-slate-200/50 dark:border-zinc-800/50">
                                    modo de imagen: {modoImagen}
                                </span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {!tareaId && (
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-violet-600/70 ml-1">Proyecto / Tarea destino</Label>
                                    <Select
                                        value={selectedTareaId || ""}
                                        onValueChange={setSelectedTareaId}
                                    >
                                        <SelectTrigger className="h-12 rounded-2xl border-violet-500/20 bg-violet-500/5 font-bold">
                                            <SelectValue placeholder="Selecciona el proyecto..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border shadow-xl">
                                            {tareas.map(t => (
                                                <SelectItem key={t.id} value={t.id.toString()} className="font-medium p-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-black text-violet-600 uppercase tracking-tighter">{t.code}</span>
                                                        <span>{t.titulo}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Monto ($)</Label>
                                <Input
                                    type="number"
                                    value={formData.monto}
                                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                                    className="h-12 rounded-2xl border-border/50 bg-background/50 text-xl font-black focus:ring-violet-500/30 text-foreground"
                                    placeholder="0.00"
                                />
                            </div>
                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha</Label>
                                <Input
                                    type="date"
                                    value={formData.fecha_gasto}
                                    onChange={(e) => setFormData({ ...formData, fecha_gasto: e.target.value })}
                                    className="h-12 rounded-2xl border-border/50 bg-background/50 font-bold"
                                />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-violet-600/70 ml-1">Tipo de Gasto</Label>
                                <Select
                                    value={formData.tipo_gasto}
                                    onValueChange={(val: any) => setFormData({ ...formData, tipo_gasto: val })}
                                >
                                    <SelectTrigger className="h-12 rounded-2xl border-violet-500/20 bg-violet-500/5 font-bold">
                                        <SelectValue placeholder="Tipo de gasto..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border shadow-xl">
                                        <SelectItem value="material" className="font-medium p-3">Material</SelectItem>
                                        <SelectItem value="herramienta" className="font-medium p-3">Herramienta</SelectItem>
                                        <SelectItem value="transporte" className="font-medium p-3">Transporte</SelectItem>
                                        <SelectItem value="mano_de_obra" className="font-medium p-3">Mano de Obra</SelectItem>
                                        <SelectItem value="otro" className="font-medium p-3">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5 focus-within:ring-violet-500/30 transition-all">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descripción</Label>
                            <Input
                                value={formData.descripcion}
                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                className="h-12 rounded-2xl border-border/50 bg-background/50 font-medium"
                                placeholder="Ej: Compra de pintura, Herrajes..."
                            />
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button
                                variant="ghost"
                                className="flex-1 h-12 rounded-2xl font-bold hover:bg-muted/50"
                                onClick={() => setPaso('seleccion')}
                                disabled={loading}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Volver
                            </Button>
                            <Button
                                className="flex-[2] h-12 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black shadow-lg shadow-violet-600/20 disabled:opacity-50"
                                onClick={handleGuardar}
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                GUARDAR GASTO
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
