'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase-client'
import { Search, Plus, Edit2, Save, X, Cpu, Brain, FileSearch } from 'lucide-react'
import { toast } from 'sonner'

interface AITool {
    tool_name: string
    display_name: string
    allowed_roles: string[]
    self_service: boolean
    tags: string[]
    keywords: string[]
    category: string
    description: {
        trabajador: string
        supervisor: string
        admin: string
    }
    usage_count: number
    is_active: boolean
}

interface AIIntent {
    id: string
    intent_name: string
    mapped_tool: string
    patterns: string[]
    priority: number
    is_active: boolean
}

export function AIToolsManager() {
    const supabase = createClient()
    const [tools, setTools] = useState<AITool[]>([])
    const [intents, setIntents] = useState<AIIntent[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [editingTool, setEditingTool] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<Partial<AITool>>({})
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)

        // Cargar tools
        const { data: toolsData } = await supabase
            .from('ai_tool_metadata')
            .select('*')
            .order('category', { ascending: true })

        // Cargar intents
        const { data: intentsData } = await supabase
            .from('ai_intents')
            .select('*')
            .order('priority')

        // Cargar categorías
        const { data: categoriesData } = await supabase
            .from('ai_categories')
            .select('*')
            .order('display_order')

        setTools(toolsData || [])
        setIntents(intentsData || [])
        setCategories(categoriesData || [])
        setLoading(false)
    }

    async function handleUpdateTool(toolName: string) {
        const { error } = await supabase
            .from('ai_tool_metadata')
            .update({
                keywords: editForm.keywords,
                tags: editForm.tags,
                description: editForm.description,
                is_active: editForm.is_active
            })
            .eq('tool_name', toolName)

        if (error) {
            toast.error('Error al actualizar tool')
            console.error(error)
        } else {
            toast.success('Tool actualizado correctamente')
            setEditingTool(null)
            loadData()
        }
    }

    const filteredTools = tools.filter(tool =>
        tool.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.tool_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const getCategoryName = (slug: string) => {
        return categories.find(c => c.slug === slug)?.name_es || slug
    }

    const getCategoryIcon = (slug: string) => {
        return categories.find(c => c.slug === slug)?.icon || '📦'
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header con estadísticas */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tools Activos</CardTitle>
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {tools.filter(t => t.is_active).length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            de {tools.length} totales
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Intents</CardTitle>
                        <Brain className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{intents.length}</div>
                        <p className="text-xs text-muted-foreground">
                            patrones de lenguaje
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Categorías</CardTitle>
                        <FileSearch className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{categories.length}</div>
                        <p className="text-xs text-muted-foreground">
                            organizadas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Usos</CardTitle>
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {tools.reduce((sum, t) => sum + (t.usage_count || 0), 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            llamadas registradas
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Gestión de Tools */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cpu className="h-5 w-5" />
                        Gestión de AI Tools
                    </CardTitle>
                    <CardDescription>
                        Administra los tools del sistema de IA: keywords, permisos y configuración
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Buscador */}
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar tools por nombre o keyword..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Lista de Tools */}
                    <div className="space-y-4">
                        {filteredTools.map((tool) => (
                            <Card key={tool.tool_name} className="overflow-hidden">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-2xl">
                                                    {getCategoryIcon(tool.category)}
                                                </span>
                                                <div>
                                                    <CardTitle className="text-base">
                                                        {tool.display_name}
                                                    </CardTitle>
                                                    <CardDescription className="text-xs">
                                                        {tool.tool_name}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="outline">
                                                    {getCategoryName(tool.category)}
                                                </Badge>
                                                {tool.allowed_roles.map(role => (
                                                    <Badge key={role} variant="secondary">
                                                        {role}
                                                    </Badge>
                                                ))}
                                                {!tool.is_active && (
                                                    <Badge variant="destructive">Inactivo</Badge>
                                                )}
                                                {tool.usage_count > 0 && (
                                                    <Badge>
                                                        {tool.usage_count} usos
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            {editingTool === tool.tool_name ? (
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleUpdateTool(tool.tool_name)}
                                                    >
                                                        <Save className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setEditingTool(null)
                                                            setEditForm({})
                                                        }}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setEditingTool(tool.tool_name)
                                                        setEditForm(tool)
                                                    }}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>

                                {editingTool === tool.tool_name ? (
                                    <CardContent className="space-y-4 border-t pt-4">
                                        {/* Formulario de edición */}
                                        <div className="space-y-2">
                                            <Label>Keywords (separadas por coma)</Label>
                                            <Textarea
                                                value={editForm.keywords?.join(', ') || ''}
                                                onChange={(e) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        keywords: e.target.value.split(',').map(k => k.trim())
                                                    })
                                                }
                                                placeholder="pago, sueldo, liquidacion..."
                                                rows={2}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Tags (separadas por coma)</Label>
                                            <Input
                                                value={editForm.tags?.join(', ') || ''}
                                                onChange={(e) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        tags: e.target.value.split(',').map(t => t.trim())
                                                    })
                                                }
                                                placeholder="pagos, finanzas..."
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={editForm.is_active || false}
                                                onChange={(e) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        is_active: e.target.checked
                                                    })
                                                }
                                                className="rounded"
                                            />
                                            <Label>Tool activo</Label>
                                        </div>
                                    </CardContent>
                                ) : (
                                    <CardContent className="border-t pt-4 space-y-2">
                                        <div>
                                            <div className="text-xs font-semibold text-muted-foreground mb-1">
                                                Keywords:
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {tool.keywords.slice(0, 8).map((keyword, i) => (
                                                    <Badge key={i} variant="outline" className="text-xs">
                                                        {keyword}
                                                    </Badge>
                                                ))}
                                                {tool.keywords.length > 8 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{tool.keywords.length - 8} más
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {tool.tags.length > 0 && (
                                            <div>
                                                <div className="text-xs font-semibold text-muted-foreground mb-1">
                                                    Tags:
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {tool.tags.map((tag, i) => (
                                                        <Badge key={i} variant="secondary" className="text-xs">
                                                            #{tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                )}
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Intents */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        Intents Configurados
                    </CardTitle>
                    <CardDescription>
                        Patrones de lenguaje natural que mapean a tools específicos
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {intents.map(intent => (
                            <div
                                key={intent.id}
                                className="border rounded-lg p-4 space-y-2"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="font-medium">{intent.intent_name}</div>
                                    <div className="flex items-center gap-2">
                                        <Badge>→ {intent.mapped_tool}</Badge>
                                        <Badge variant="outline">
                                            prioridad: {intent.priority}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <span className="font-semibold">Patrones: </span>
                                    {intent.patterns.slice(0, 3).join(' · ')}
                                    {intent.patterns.length > 3 && ` · +${intent.patterns.length - 3} más`}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
