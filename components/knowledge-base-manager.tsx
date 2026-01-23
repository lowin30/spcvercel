'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase-client'
import { Upload, FileText, Trash2, Eye, Search, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

interface KnowledgeDoc {
    id: string
    filename: string
    display_title: string
    category: string
    storage_path: string
    storage_url?: string
    allowed_roles: string[]
    tags: string[]
    summary: string
    view_count: number
    uploaded_at: string
    content_text: string
}

export function KnowledgeBaseManager() {
    const supabase = createClient()
    const [docs, setDocs] = useState<KnowledgeDoc[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Form state para nuevo documento
    const [newDoc, setNewDoc] = useState({
        title: '',
        category: 'manual',
        roles: ['trabajador', 'supervisor', 'admin'] as string[],
        tags: '',
        summary: '',
        content: '',
        storage_url: '',
        storage_path: '',
        file_size: 0
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)

        const { data: docsData } = await supabase
            .from('ai_knowledge_docs')
            .select('*')
            .order('uploaded_at', { ascending: false })

        const { data: categoriesData } = await supabase
            .from('ai_categories')
            .select('*')
            .order('display_order')

        setDocs(docsData || [])
        setCategories(categoriesData || [])
        setLoading(false)
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)

        try {
            // Subir a través de nuestra API route segura
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/upload-cloudinary', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Error al subir archivo')
            }

            const cloudinaryData = await response.json()

            // Usar texto extraído de la API (para PDFs)
            let extractedContent = cloudinaryData.extractedText || ''

            // Para archivos de texto plano, intentar extraer del archivo directamente
            if (!extractedContent && file.type.startsWith('text/')) {
                extractedContent = await file.text()
            }

            setNewDoc(prev => ({
                ...prev,
                title: file.name.replace(/\.[^/.]+$/, ''),
                content: extractedContent,
                summary: extractedContent.length > 0
                    ? extractedContent.substring(0, 300) + '...'
                    : `Archivo: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
                storage_url: cloudinaryData.url,
                storage_path: cloudinaryData.publicId,
                file_size: file.size
            }))

            toast.success('✅ Archivo subido a Cloudinary!')
        } catch (error: any) {
            toast.error(`Error: ${error.message}`)
            console.error(error)
        } finally {
            setUploading(false)
        }
    }

    async function handleSaveDoc() {
        if (!newDoc.title) {
            toast.error('Título es obligatorio')
            return
        }

        setUploading(true)

        const cleanContent = newDoc.content
            ? newDoc.content
                .replace(/\u0000/g, '')
                .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '')
                .trim()
            : ''

        const { error } = await supabase
            .from('ai_knowledge_docs')
            .insert({
                filename: `${newDoc.title.replace(/\s+/g, '_')}_${Date.now()}.txt`,
                display_title: newDoc.title,
                category: newDoc.category,
                storage_path: newDoc.storage_path || `/knowledge-base/${newDoc.category}/${newDoc.title}.txt`,
                storage_url: newDoc.storage_url || null,
                allowed_roles: newDoc.roles,
                tags: newDoc.tags.split(',').map(t => t.trim()).filter(Boolean),
                summary: newDoc.summary,
                content_text: cleanContent,
                file_size_bytes: newDoc.file_size || new Blob([cleanContent]).size,
                uploaded_at: new Date().toISOString(),
                is_active: true,
                view_count: 0
            })

        if (error) {
            toast.error('Error al guardar documento')
            console.error(error)
        } else {
            toast.success(' Documento guardado correctamente!')
            setNewDoc({
                title: '',
                category: 'manual',
                roles: ['trabajador', 'supervisor', 'admin'],
                tags: '',
                summary: '',
                content: '',
                storage_url: '',
                storage_path: '',
                file_size: 0
            })
            loadData()
        }

        setUploading(false)
    }

    async function handleDeleteDoc(id: string) {
        if (!confirm('¿Eliminar este documento?')) return

        const { error } = await supabase
            .from('ai_knowledge_docs')
            .delete()
            .eq('id', id)

        if (error) {
            toast.error('Error al eliminar')
            console.error(error)
        } else {
            toast.success('Documento eliminado')
            loadData()
        }
    }

    async function testSearch() {
        if (!searchTerm) return

        const { data } = await supabase.rpc('search_knowledge', {
            query_text: searchTerm,
            user_role: 'admin',
            doc_category: null
        })

        if (data && data.length > 0) {
            toast.success(`Encontrados ${data.length} documentos relevantes`, {
                description: data.slice(0, 2).map((d: any) =>
                    `${d.display_title} (${Math.round(d.relevance * 100)}%)`
                ).join(', ')
            })
        } else {
            toast.info('No se encontraron documentos para esa búsqueda')
        }
    }

    const filteredDocs = docs.filter(doc =>
        doc.display_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )

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
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Documentos</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{docs.length}</div>
                        <p className="text-xs text-muted-foreground">
                            en knowledge base
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Vistas</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {docs.reduce((sum, d) => sum + (d.view_count || 0), 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            consultas a docs
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Categorías</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Set(docs.map(d => d.category)).size}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            diferentes tipos
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Upload de nuevo documento */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Subir Nuevo Documento
                    </CardTitle>
                    <CardDescription>
                        Sube archivos para indexar en la knowledge base. Almacenamiento permanente en Cloudinary.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Archivo (cualquier tipo)</Label>
                        <Input
                            type="file"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Título del Documento</Label>
                            <Input
                                value={newDoc.title}
                                onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                                placeholder="Carta de Presentación SPC"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Categoría</Label>
                            <Select
                                value={newDoc.category}
                                onValueChange={(value) => setNewDoc({ ...newDoc, category: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manual">Manual</SelectItem>
                                    <SelectItem value="protocolo">Protocolo</SelectItem>
                                    <SelectItem value="normativa">Normativa</SelectItem>
                                    <SelectItem value="guia">Guía</SelectItem>
                                    <SelectItem value="faq">FAQ</SelectItem>
                                    <SelectItem value="politica">Política</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Resumen (opcional)</Label>
                        <Textarea
                            value={newDoc.summary}
                            onChange={(e) => setNewDoc({ ...newDoc, summary: e.target.value })}
                            placeholder="Breve descripción de qué contiene este documento..."
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Tags (separados por coma)</Label>
                        <Input
                            value={newDoc.tags}
                            onChange={(e) => setNewDoc({ ...newDoc, tags: e.target.value })}
                            placeholder="presentacion, institucional, servicios, empresa"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Roles con Acceso</Label>
                        <div className="flex gap-2">
                            {['trabajador', 'supervisor', 'admin'].map(role => (
                                <label key={role} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={newDoc.roles.includes(role)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setNewDoc({ ...newDoc, roles: [...newDoc.roles, role] })
                                            } else {
                                                setNewDoc({ ...newDoc, roles: newDoc.roles.filter(r => r !== role) })
                                            }
                                        }}
                                        className="rounded"
                                    />
                                    <span className="text-sm capitalize">{role}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {newDoc.content && (
                        <div className="space-y-2">
                            <Label>Vista Previa del Contenido</Label>
                            <Textarea
                                value={newDoc.content}
                                onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                                rows={4}
                                className="font-mono text-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                                {newDoc.content.length} caracteres
                            </p>
                        </div>
                    )}

                    <Button
                        onClick={handleSaveDoc}
                        disabled={uploading || !newDoc.title}
                        className="w-full"
                    >
                        {uploading ? 'Guardando...' : 'Guardar Documento'}
                    </Button>
                </CardContent>
            </Card>

            {/* Buscador y lista de documentos */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Documentos en Knowledge Base
                    </CardTitle>
                    <CardDescription>
                        {docs.length} documentos indexados
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar documentos o tags..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button onClick={testSearch} variant="outline">
                            <Search className="h-4 w-4 mr-2" />
                            Test Search
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {filteredDocs.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>No hay documentos aún</p>
                                <p className="text-sm">Sube tu primer documento arriba</p>
                            </div>
                        ) : (
                            filteredDocs.map(doc => (
                                <Card key={doc.id}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <FileText className="h-4 w-4" />
                                                    {doc.display_title}
                                                </CardTitle>
                                                <CardDescription className="text-xs mt-1">
                                                    {doc.summary || 'Sin resumen'}
                                                </CardDescription>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDeleteDoc(doc.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline">{doc.category}</Badge>
                                            {doc.allowed_roles.map(role => (
                                                <Badge key={role} variant="secondary">
                                                    {role}
                                                </Badge>
                                            ))}
                                            {doc.view_count > 0 && (
                                                <Badge>
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    {doc.view_count} vistas
                                                </Badge>
                                            )}
                                        </div>
                                        {doc.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {doc.tags.map((tag, i) => (
                                                    <Badge key={i} variant="outline" className="text-xs">
                                                        #{tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            Subido: {new Date(doc.uploaded_at).toLocaleDateString('es-AR')}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
