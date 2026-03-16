"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Zap, Building2, User2, MessageSquare,
    Hammer, Link as LinkIcon, Trash2, Save,
    Clock, Calendar, Rocket, AlignLeft, CheckCircle2
} from "lucide-react"
import { saveMicroTareaAction, promocionarMicroTareaAction, getTareasVinculablesAction } from "@/app/dashboard/agenda/microtareas-actions"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"

interface MicroTareaDeepEditProps {
    microTarea: any
    catalogos: any
    isOpen: boolean
    onClose: () => void
    onSaved: () => void
}

export function MicroTareaDeepEdit({ microTarea, catalogos, isOpen, onClose, onSaved }: MicroTareaDeepEditProps) {
    const router = useRouter()
    const [formData, setFormData] = useState({ ...microTarea })
    const [isSaving, setIsSaving] = useState(false)
    const [tareasActivas, setTareasActivas] = useState<any[]>([])
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [isLoadingUser, setIsLoadingUser] = useState(true)
    const [showTareasLink, setShowTareasLink] = useState(false)

    useEffect(() => {
        setFormData({ ...microTarea })
    }, [microTarea, isOpen])

    useEffect(() => {
        const fetchUserAndTasks = async () => {
            if (!isOpen) return
            
            setIsLoadingUser(true)
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            
            if (user) {
                console.log("[FORENSIC] Cargando tareas para usuario en sesión:", user.id)
                setCurrentUserId(user.id)
                await fetchTareasActivas(user.id)
            } else if (microTarea.id_asignado) {
                console.warn("[FORENSIC] No hay sesión, usando id_asignado como fallback:", microTarea.id_asignado)
                await fetchTareasActivas(microTarea.id_asignado)
            }
            setIsLoadingUser(false)
        }
        
        if (isOpen) {
            fetchUserAndTasks()
        }
    }, [microTarea.id_asignado, isOpen])

    const fetchTareasActivas = async (userId: string) => {
        console.log("[FORENSIC] Iniciando Linker God Mode (v85.10) para:", userId)
        
        const res = await getTareasVinculablesAction(userId)
        
        if (res.success) {
            console.log("[FORENSIC] Tareas encontradas vía Action:", res.data?.length || 0)
            setTareasActivas(res.data || [])
        } else {
            console.error("[FORENSIC] Error en Action Linker:", res.message)
            toast.error("error al cargar tareas vinculables")
            setTareasActivas([])
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        const res = await saveMicroTareaAction({
            id: formData.id,
            titulo: formData.titulo,
            descripcion: formData.descripcion,
            comentario: formData.comentario,
            id_edificio: formData.id_edificio,
            id_departamento: formData.id_departamento,
            id_asignado: formData.id_asignado,
            prioridad: formData.prioridad,
            id_tarea_padre: formData.id_tarea_padre
        })

        if (res.success) {
            toast.success("cambios guardados")
            onSaved()
            onClose()
        } else {
            toast.error(res.message)
        }
        setIsSaving(false)
    }

    const handleAscend = () => {
        const params = new URLSearchParams()
        params.set('titulo', formData.titulo)
        params.set('descripcion', formData.descripcion || formData.comentario || "")
        if (formData.id_edificio) params.set('id_edificio', formData.id_edificio.toString())
        if (formData.id_asignado) params.set('id_asignado', formData.id_asignado)
        params.set('source_mt', formData.id.toString())

        router.push(`/dashboard/tareas/nueva?${params.toString()}`)
        onClose()
    }

    const formatFecha = (iso: string) => {
        if (!iso) return "n/a"
        return new Date(iso).toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] w-[96vw] max-h-[92vh] bg-background text-foreground p-0 rounded-2xl sm:rounded-3xl overflow-hidden border-border/40 shadow-2xl flex flex-col top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] fixed focus:outline-none">

                {/* header fijo arriba */}
                <div className="bg-secondary/50 p-4 border-b border-border/10 flex-none">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-violet-600 rounded-lg shadow-inner">
                                    <Zap className="w-4 h-4 text-white" />
                                </div>
                                <DialogTitle className="text-lg font-black uppercase tracking-tighter">
                                    edicion <span className="text-violet-500 italic">profunda</span>
                                </DialogTitle>
                            </div>
                            <Button
                                onClick={handleAscend}
                                className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] px-3 transition-all shrink-0 shadow-lg shadow-emerald-600/20"
                            >
                                <Rocket className="w-3.5 h-3.5 mr-1" /> convertir en trabajo
                            </Button>
                        </div>
                    </DialogHeader>
                </div>

                {/* zona de scroll central */}
                <div className="p-4 space-y-4 overflow-y-auto flex-1 overscroll-contain custom-scrollbar">

                    {/* titulo */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">titulo del requerimiento</label>
                        <Input
                            value={formData.titulo}
                            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                            className="bg-secondary/40 border-border/20 font-bold text-base h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-violet-500"
                        />
                    </div>

                    {/* descripcion tecnica */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1">
                            <AlignLeft className="w-3 h-3" /> descripcion tecnica (que hay que hacer)
                        </label>
                        <Textarea
                            value={formData.descripcion || ""}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            placeholder="detalla el trabajo tecnico..."
                            className="bg-secondary/40 border-border/20 min-h-[90px] rounded-xl focus-visible:ring-2 focus-visible:ring-violet-500 resize-none text-sm"
                        />
                    </div>

                    {/* comentarios internos */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> notas y observaciones para el equipo
                        </label>
                        <Textarea
                            value={formData.comentario || ""}
                            onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
                            placeholder="aclaraciones o avisos internos..."
                            className="bg-secondary/40 border-border/20 min-h-[90px] rounded-xl focus-visible:ring-2 focus-visible:ring-violet-500 resize-none text-sm"
                        />
                    </div>

                    {/* selectores en cuadricula */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1">
                                <Building2 className="w-3 h-3" /> edificio
                            </label>
                            <select
                                className="w-full bg-secondary/50 border border-border/20 rounded-xl h-10 px-3 text-xs font-bold appearance-none focus:ring-2 focus:ring-violet-500 outline-none"
                                value={formData.id_edificio || ""}
                                onChange={(e) => setFormData({ ...formData, id_edificio: e.target.value ? parseInt(e.target.value) : null })}
                            >
                                <option value="">sin edificio</option>
                                {catalogos?.edificios?.map((ed: any) => (
                                    <option key={ed.id} value={ed.id}>{ed.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1">
                                <User2 className="w-3 h-3" /> oficial
                            </label>
                            <select
                                className="w-full bg-secondary/50 border border-border/20 rounded-xl h-10 px-3 text-xs font-bold appearance-none focus:ring-2 focus:ring-violet-500 outline-none"
                                value={formData.id_asignado || ""}
                                onChange={(e) => setFormData({ ...formData, id_asignado: e.target.value })}
                            >
                                <option value="">jesus (auto)</option>
                                {catalogos?.usuarios?.map((us: any) => (
                                    <option key={us.id} value={us.id}>{us.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* estado realizada v86.0 */}
                    <div className="pt-1">
                        <Button
                            variant="outline"
                            className={`w-full border-dashed rounded-xl h-12 flex items-center justify-center gap-3 transition-all ${
                                formData.realizada 
                                ? "bg-emerald-500/20 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/10" 
                                : "bg-secondary/40 border-border/20 text-muted-foreground hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-500"
                            }`}
                            onClick={() => setFormData({ ...formData, realizada: !formData.realizada })}
                        >
                            <CheckCircle2 className={`w-5 h-5 ${formData.realizada ? "fill-emerald-500 text-white" : ""}`} />
                            <span className="text-[10px] font-black uppercase tracking-tight">
                                {formData.realizada ? "microtarea realizada" : "marcar como realizada"}
                            </span>
                        </Button>
                    </div>

                    {/* vinculacion a tarea */}
                    <div className="pt-1">
                        <Button
                            variant="outline"
                            className="w-full border-dashed border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 text-[9px] font-black uppercase rounded-xl h-10"
                            onClick={() => setShowTareasLink(!showTareasLink)}
                        >
                            <LinkIcon className="w-3 h-3 mr-2 text-violet-500" />
                            {formData.id_tarea_padre ? "cambiar vinculo" : "vincular a tarea activa"}
                        </Button>

                        {showTareasLink && (
                            <div className="mt-2 p-2 bg-secondary/30 rounded-xl space-y-1 max-h-[140px] overflow-y-auto border border-border/10">
                                {tareasActivas.length === 0 && <p className="text-[9px] text-center p-3 italic">no hay tareas activas</p>}
                                {tareasActivas.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            setFormData({ ...formData, id_tarea_padre: t.id })
                                            setShowTareasLink(false)
                                        }}
                                        className={`w-full text-left p-3 rounded-lg text-[10px] font-bold uppercase transition-all ${formData.id_tarea_padre === t.id ? 'bg-violet-600 text-white shadow-md' : 'hover:bg-violet-500/10'}`}
                                    >
                                        <span className="opacity-50 mr-1">#{t.code}</span> {t.titulo}
                                    </button>
                                ))}
                            </div>
                        )}

                        {formData.id_tarea_padre && !showTareasLink && (
                            <div className="mt-2 flex items-center justify-between p-2.5 bg-violet-600/10 rounded-xl border border-violet-600/20 shadow-sm">
                                <div className="text-[9px] font-black uppercase text-violet-600 flex items-center gap-2">
                                    <Hammer className="w-3 h-3" /> vinculado a tarea #{formData.id_tarea_padre}
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30" onClick={() => setFormData({ ...formData, id_tarea_padre: null })}>
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* metadatos */}
                    <div className="flex items-center justify-between pt-2 opacity-40">
                        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest">
                            <Calendar className="w-2.5 h-2.5" /> {formatFecha(formData.created_at)}
                        </div>
                        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest">
                            <Clock className="w-2.5 h-2.5" /> mt-id: {formData.id}
                        </div>
                    </div>
                </div>

                {/* footer fijo abajo */}
                <div className="p-4 bg-secondary/50 border-t border-border/10 grid grid-cols-2 gap-3 flex-none">
                    <Button variant="ghost" className="rounded-xl font-black uppercase text-[10px] h-12 shadow-sm" onClick={onClose}>
                        cancelar
                    </Button>
                    <Button
                        disabled={isSaving}
                        className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black uppercase text-[10px] h-12 shadow-lg shadow-violet-600/20 active:scale-95 transition-all"
                        onClick={handleSave}
                    >
                        {isSaving ? "guardando..." : <><Save className="w-3.5 h-3.5 mr-2" /> guardar cambios</>}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}