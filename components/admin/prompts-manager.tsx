"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
    FileText,
    Folder,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Cpu,
    RefreshCw
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface AiPrompt {
    id: string
    slug: string
    folder_path: string
    system_content: string
    is_active: boolean
    updated_at: string
}

export function PromptsManager() {
    const [prompts, setPrompts] = useState<AiPrompt[]>([])
    const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
    const [editedContent, setEditedContent] = useState("")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [folders, setFolders] = useState<string[]>([])

    const supabase = createClient()

    useEffect(() => {
        fetchPrompts()
    }, [])

    const fetchPrompts = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from("ai_prompts")
                .select("*")
                .order("folder_path", { ascending: true })
                .order("slug", { ascending: true })

            if (error) throw error

            setPrompts(data || [])

            // Extract unique folders
            const uniqueFolders = Array.from(new Set(data?.map(p => p.folder_path) || []))
            setFolders(uniqueFolders as string[])

            // Select first prompt by default if none selected
            if (!selectedPromptId && data && data.length > 0) {
                selectPrompt(data[0])
            }
        } catch (error) {
            console.error("Error fetching prompts:", error)
            toast({
                variant: "destructive",
                title: "Error al cargar prompts",
                description: "No se pudieron cargar los prompts de la base de datos."
            })
        } finally {
            setLoading(false)
        }
    }

    const selectPrompt = (prompt: AiPrompt) => {
        setSelectedPromptId(prompt.id)
        setEditedContent(prompt.system_content)
    }

    const handleSave = async () => {
        if (!selectedPromptId) return

        setSaving(true)
        try {
            const { error } = await supabase
                .from("ai_prompts")
                .update({ system_content: editedContent })
                .eq("id", selectedPromptId)

            if (error) throw error

            // Update local state
            setPrompts(prompts.map(p =>
                p.id === selectedPromptId ? { ...p, system_content: editedContent } : p
            ))

            toast({
                title: "Prompt actualizado",
                description: "Los cambios se han guardado correctamente.",
            })
        } catch (error) {
            console.error("Error saving prompt:", error)
            toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudieron guardar los cambios."
            })
        } finally {
            setSaving(false)
        }
    }

    const selectedPrompt = prompts.find(p => p.id === selectedPromptId)

    if (loading && prompts.length === 0) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Cargando prompts del sistema...</span>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[800px]">
            {/* Sidebar - Prompts List */}
            <Card className="md:col-span-4 lg:col-span-3 flex flex-col h-full border-r">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Cpu className="h-5 w-5" />
                        Prompts del Sistema
                    </CardTitle>
                    <CardDescription>
                        Selecciona un prompt para editar su comportamiento.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 min-h-0">
                    <ScrollArea className="h-full px-4">
                        <div className="space-y-4 pb-4">
                            {folders.map(folder => (
                                <div key={folder}>
                                    <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-muted-foreground">
                                        <Folder className="h-4 w-4" />
                                        {folder}
                                    </div>
                                    <div className="space-y-1 pl-4 border-l-2 ml-2">
                                        {prompts
                                            .filter(p => p.folder_path === folder)
                                            .map(prompt => (
                                                <button
                                                    key={prompt.id}
                                                    onClick={() => selectPrompt(prompt)}
                                                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${selectedPromptId === prompt.id
                                                            ? "bg-primary text-primary-foreground font-medium"
                                                            : "hover:bg-muted text-foreground"
                                                        }`}
                                                >
                                                    <FileText className="h-4 w-4 shrink-0" />
                                                    <span className="truncate">{prompt.slug}</span>
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="border-t p-4">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={fetchPrompts}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Recargar Lista
                    </Button>
                </CardFooter>
            </Card>

            {/* Main Content - Editor */}
            <Card className="md:col-span-8 lg:col-span-9 flex flex-col h-full">
                {selectedPrompt ? (
                    <>
                        <CardHeader className="pb-4 border-b">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <CardTitle>{selectedPrompt.slug}</CardTitle>
                                        <Badge variant={selectedPrompt.is_active ? "default" : "secondary"}>
                                            {selectedPrompt.is_active ? "Activo" : "Inactivo"}
                                        </Badge>
                                    </div>
                                    <CardDescription className="font-mono text-xs">
                                        {selectedPrompt.folder_path}/{selectedPrompt.slug}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    {editedContent !== selectedPrompt.system_content && (
                                        <span className="text-xs text-yellow-600 font-medium flex items-center bg-yellow-100 px-2 py-1 rounded-full dark:bg-yellow-900/30 dark:text-yellow-400">
                                            <AlertCircle className="h-3 w-3 mr-1" />
                                            Cambios sin guardar
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 min-h-0 bg-muted/20 relative">
                            <Textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="w-full h-full resize-none rounded-none border-0 p-6 font-mono text-sm leading-relaxed focus-visible:ring-0 bg-transparent"
                                placeholder="Escribe aquí las instrucciones del system prompt..."
                            />
                        </CardContent>
                        <CardFooter className="border-t p-4 flex justify-between bg-card">
                            <p className="text-xs text-muted-foreground hidden sm:block">
                                Última actualización: {new Date(selectedPrompt.updated_at).toLocaleString()}
                            </p>
                            <Button
                                onClick={handleSave}
                                className="min-w-[140px]"
                                disabled={saving || editedContent === selectedPrompt.system_content}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Guardar Cambios
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                        <Cpu className="h-16 w-16 mb-4 opacity-20" />
                        <h3 className="text-lg font-medium">Ningún Prompt Seleccionado</h3>
                        <p className="max-w-md mt-2">
                            Selecciona un archivo de la lista lateral para ver y editar las instrucciones de la Inteligencia Artificial.
                        </p>
                    </div>
                )}
            </Card>
        </div>
    )
}
