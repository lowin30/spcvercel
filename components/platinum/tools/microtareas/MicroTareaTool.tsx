"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Zap, Plus, Loader2, Building2, UserPlus, MessageSquare, Hammer, MoreVertical, Edit2 } from "lucide-react"
import { toast } from "sonner"
import { MicroTareaDeepEdit } from "./MicroTareaDeepEdit"
import { saveMicroTareaAction, promocionarMicroTareaAction, finalizarMicroTareaAction } from "@/app/dashboard/agenda/microtareas-actions"
import { createClient } from "@/lib/supabase-client"
import { CheckCircle2 } from "lucide-react"

interface MicroTareaToolProps {
    catalogos?: {
        edificios: any[]
        usuarios: any[]
    }
}

export function MicroTareaTool({ catalogos: initialCatalogos }: MicroTareaToolProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [microTareas, setMicroTareas] = useState<any[]>([])
    const [catalogos, setCatalogos] = useState(initialCatalogos)
    
    const [newTitle, setNewTitle] = useState("")
    const [selectedTrabajador, setSelectedTrabajador] = useState<string | null>(null)
    const [editingMT, setEditingMT] = useState<any | null>(null)

    const action = searchParams.get('action')

    useEffect(() => {
        if (action === 'microtareas') {
            setIsOpen(true)
            fetchMicroTareas()
            if (!catalogos) fetchCatalogos()
        } else {
            setIsOpen(false)
        }
    }, [action, catalogos])

    const fetchCatalogos = async () => {
        const supabase = createClient()
        const [edificiosRes, usuariosRes] = await Promise.all([
            supabase.from('edificios').select('id, nombre').order('nombre'),
            supabase.from('usuarios').select('id, nombre').order('nombre')
        ])
        setCatalogos({
            edificios: edificiosRes.data || [],
            usuarios: usuariosRes.data || []
        })
    }

    const fetchMicroTareas = async () => {
        setIsLoading(true)
        const supabase = createClient()
        const { data } = await supabase
            .from('micro_tareas_operativas')
            .select(`
                *,
                edificios:id_edificio(nombre),
                departamentos:id_departamento(codigo),
                usuarios:id_asignado(nombre)
            `)
            .eq('promocionada', false)
            .eq('realizada', false)
            .order('created_at', { ascending: false })
        
        if (data) setMicroTareas(data)
        setIsLoading(false)
    }

    const handleAdd = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!newTitle.trim()) {
            toast.error("el título es obligatorio")
            return
        }

        const res = await saveMicroTareaAction({
            titulo: newTitle,
            id_asignado: selectedTrabajador || null, // SOBERANO: si es null, el action auto-asigna a jesus
            prioridad: 'media'
        })

        if (res.success) {
            setNewTitle("")
            setSelectedTrabajador(null)
            fetchMicroTareas()
            toast.success("microtarea anotada")
        } else {
            toast.error(res.message)
        }
    }

    const handlePromote = async (id: number) => {
        toast.promise(promocionarMicroTareaAction(id), {
            loading: 'promocionando a tarea formal...',
            success: (res: any) => {
                fetchMicroTareas()
                return "tarea creada con éxito"
            },
            error: 'error al promocionar'
        })
    }

    const handleComplete = async (id: number) => {
        const res = await finalizarMicroTareaAction(id)
        if (res.success) {
            toast.success("microtarea realizada")
            fetchMicroTareas()
        } else {
            toast.error(res.message)
        }
    }

    const handleClose = () => {
        setIsOpen(false)
        const params = new URLSearchParams(searchParams.toString())
        params.delete('action')
        params.delete('id_edificio')
        router.push(`?${params.toString()}`)
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] flex flex-col p-0 border-border/40 bg-card text-card-foreground rounded-3xl shadow-2xl">
                <div className="p-4 space-y-4 flex-none">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black flex items-center gap-2">
                            <Zap className="h-5 w-5 text-violet-500 fill-violet-500/20" />
                            Microtareas <span className="text-violet-500 font-serif italic">Soberanas</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Captura ultra-rápida. Sin bloqueos. Sin burocracia.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Quick Add Form - Ultra Minimalist v85.5 */}
                    <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 bg-muted/20 p-2 rounded-2xl border border-border/10 shadow-inner">
                        <Input 
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="¿qué hay que anotar?"
                            className="flex-1 bg-transparent border-none text-sm font-bold placeholder:text-muted-foreground/40 focus-visible:ring-0 h-9"
                        />
                        <div className="flex items-center gap-1.5">
                            <select 
                                className="bg-background/80 border border-border/20 text-[10px] font-black uppercase tracking-wider rounded-xl px-2 h-9 focus:ring-1 focus:ring-violet-500/50 appearance-none min-w-[100px]"
                                value={selectedTrabajador || ""}
                                onChange={(e) => setSelectedTrabajador(e.target.value || null)}
                            >
                                <option value="">Asignar...</option>
                                {catalogos?.usuarios?.map(u => (
                                    <option key={u.id} value={u.id}>{u.nombre}</option>
                                ))}
                            </select>
                            <Button type="submit" className="h-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black px-4 shadow-lg shadow-violet-600/20 transition-all active:scale-95">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                </div>

                {/* List of Microtareas */}
                <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2">
                        {isLoading ? (
                            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-violet-500" /></div>
                        ) : microTareas.length === 0 ? (
                            <div className="text-center p-12 text-zinc-600 font-bold uppercase text-[10px] tracking-widest border border-dashed border-white/5 rounded-3xl">
                                no hay microtareas pendientes
                            </div>
                        ) : (
                            microTareas.map((mt) => (
                                <div key={mt.id} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-muted/20 border border-border/40 rounded-2xl hover:bg-muted/40 transition-all cursor-pointer" onClick={() => setEditingMT(mt)}>
                                    <div className="flex-1 min-w-0 w-full">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[9px] font-black border-border/50 text-muted-foreground uppercase bg-background/50">
                                                {mt.edificios?.nombre || 'S/E'}
                                            </Badge>
                                            <h4 className="text-sm font-bold text-foreground truncate">{mt.titulo}</h4>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5 overflow-x-auto no-scrollbar">
                                            {mt.departamentos && (
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase">
                                                    <Building2 className="w-3 h-3" /> {mt.departamentos.codigo}
                                                </div>
                                            )}
                                            {mt.usuarios && (
                                                <div className="flex items-center gap-1 text-[10px] text-violet-400 font-bold uppercase">
                                                    <UserPlus className="w-3 h-3" /> {mt.usuarios.nombre}
                                                </div>
                                            )}
                                            {mt.comentario && (
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground italic">
                                                    <MessageSquare className="w-3 h-3" /> {mt.comentario}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 w-full sm:w-auto mt-2 sm:mt-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-violet-500 hover:bg-violet-500/10 shrink-0"
                                            onClick={(e) => { e.stopPropagation(); setEditingMT(mt); }}
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 shrink-0"
                                            onClick={(e) => { e.stopPropagation(); handleComplete(mt.id); }}
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 font-black text-[10px] shrink-0"
                                            onClick={(e) => { e.stopPropagation(); handlePromote(mt.id); }}
                                        >
                                            <Hammer className="w-3.5 h-3.5 mr-1" /> PROMOVER
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                </div>
            </DialogContent>

            {/* Modal de Edición Profunda v85.3 */}
            {editingMT && (
                <MicroTareaDeepEdit 
                    microTarea={editingMT}
                    catalogos={catalogos}
                    isOpen={!!editingMT}
                    onClose={() => setEditingMT(null)}
                    onSaved={() => {
                        fetchMicroTareas()
                        setEditingMT(null)
                    }}
                />
            )}
        </Dialog>
    )
}
