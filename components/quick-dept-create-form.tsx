"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Save, Plus, Trash, Phone, Building2, User } from "lucide-react"
import { sanitizeText } from "@/lib/utils"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface ContactoRow {
    id: string // Temp ID for UI key
    nombre: string
    relacion: string
    numero: string
    sin_telefono: boolean
}


interface QuickDeptCreateFormProps {
    edificioId?: number | null // Made optional
    onSuccess: (deptId: number, deptCode: string) => void
    onCancel: () => void
    isChatVariant?: boolean
}

export function QuickDeptCreateForm({
    edificioId: initialEdificioId, // Rename to initial
    onSuccess,
    onCancel,
    isChatVariant = false
}: QuickDeptCreateFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedEdificioId, setSelectedEdificioId] = useState<number | null>(initialEdificioId || null)

    // Building Selection State
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    const [codigo, setCodigo] = useState("")
    const [contactos, setContactos] = useState<ContactoRow[]>([
        { id: '1', nombre: '', relacion: '', numero: '', sin_telefono: false }
    ])

    const handleSearchBuilding = async (term: string) => {
        setSearchTerm(term)
        if (term.length < 2) {
            setSearchResults([])
            return
        }
        setIsSearching(true)
        const supabase = createClient()
        const { data } = await supabase
            .from('edificios')
            .select('id, nombre, direccion')
            .or(`nombre.ilike.%${term}%,direccion.ilike.%${term}%`)
            .limit(5)

        setSearchResults(data || [])
        setIsSearching(false)
    }



    // -- Helpers --
    const addContacto = () => {
        setContactos(prev => [
            ...prev,
            { id: Math.random().toString(36), nombre: '', relacion: '', numero: '', sin_telefono: false }
        ])
    }

    const removeContacto = (id: string) => {
        if (contactos.length === 1) {
            // Don't remove last one, just clear it
            setContactos([{ id: '1', nombre: '', relacion: '', numero: '', sin_telefono: false }])
            return
        }
        setContactos(prev => prev.filter(c => c.id !== id))
    }

    const updateContacto = (id: string, field: keyof ContactoRow, value: any) => {
        setContactos(prev => prev.map(c => {
            if (c.id === id) return { ...c, [field]: value }
            return c
        }))
    }


    // -- Submit Logic --
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedEdificioId) {
            toast.error("Falta seleccionar edificio")
            return
        }

        if (!codigo.trim()) {
            toast.error("El código del departamento es obligatorio")
            return
        }

        setIsSubmitting(true)
        const supabase = createClient()

        try {
            // 1. Check Department Duplicate (Pre-check)
            const { data: existingDept } = await supabase
                .from("departamentos")
                .select("id")
                .eq("edificio_id", selectedEdificioId)
                .eq("codigo", codigo.trim())
                .maybeSingle()

            if (existingDept) {
                toast.error(`Ya existe un departamento con el código "${codigo}"`)
                setIsSubmitting(false)
                return
            }

            // 2. Insert Department
            const { data: newDept, error: deptError } = await supabase
                .from("departamentos")
                .insert({
                    edificio_id: selectedEdificioId,
                    codigo: codigo.trim().toUpperCase(),
                    // Notas/Propietario are optional/omitted in this quick form
                })
                .select()
                .single()

            if (deptError) throw deptError

            // 3. Insert Contacts (if any valid data)
            const validContacts = contactos.filter(c => c.nombre.trim() !== "")

            if (validContacts.length > 0) {
                // Fetch Building Name for Slugs (Once)
                const { data: edData } = await supabase.from("edificios").select("nombre").eq("id", selectedEdificioId).single()
                const edName = edData?.nombre || "Edificio"
                const depCode = newDept.codigo

                // Prepare Insert Promises
                const contactPayloads = await Promise.all(validContacts.map(async (c, index) => {
                    const nombreSanitized = sanitizeText(c.nombre)
                    const relacionSanitized = sanitizeText(c.relacion) || "Otro"

                    // Slug Generation Logic (Copied from UnifiedDeptContactForm)
                    const normalizeForSlug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ñ/g, 'n').replace(/\s+/g, '-')
                    const slugBase = `${normalizeForSlug(edName)}-${normalizeForSlug(depCode)}-${normalizeForSlug(nombreSanitized)}`

                    // Check duplicate slug
                    const { data: existingSlug } = await supabase.from("contactos").select("id").eq("nombre", slugBase).maybeSingle()

                    let finalSlug = slugBase
                    if (existingSlug) {
                        finalSlug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`
                    } else if (index > 0) {
                        // If we are inserting multiple same names in same batch (rare but possible: 'Juan' and 'Juan'),
                        // the raw slugBase would be identical.
                        // We should probably append index or random if batching.
                        // Let's just append random always for batch safety if names are identical?
                        // Or just checking db is enough? DB check might valid for first, but second in batch hasn't hit DB yet?
                        // Actually, 'insert' accepts array. But checking duplicates one by one vs batch is tricky.
                        // Let's do sequential or Map check.
                        // Simplest: If map sees duplicate slug base, append index.
                    }

                    return {
                        nombre: finalSlug,
                        nombreReal: nombreSanitized,
                        telefono: c.sin_telefono ? null : c.numero.replace(/\D/g, ''),
                        tipo_padre: 'edificio',
                        id_padre: selectedEdificioId,
                        departamento: depCode,
                        departamento_id: newDept.id,
                        relacion: relacionSanitized,
                        es_principal: index === 0, // First one is main by default
                        notas: "",
                        updated_at: new Date().toISOString()
                    }
                }))

                // Handle basic batch collision (same name twice in list)
                const usedSlugs = new Set()
                const uniquePayloads = contactPayloads.map(p => {
                    let s = p.nombre
                    while (usedSlugs.has(s)) {
                        s = `${s}-${Math.random().toString(36).substring(2, 5)}`
                    }
                    usedSlugs.add(s)
                    return { ...p, nombre: s }
                })

                const { error: contactsError } = await supabase.from("contactos").insert(uniquePayloads)
                if (contactsError) {
                    console.error("Error saving contacts", contactsError)
                    toast.error("El departamento se creó, pero hubo error al guardar contactos.")
                    // Don't blocking flow, department exists.
                } else {
                    // Trigger Google Sync for each contact? Or batch?
                    // Sync loop (Fire and forget)
                    uniquePayloads.forEach(p => {
                        if (p.telefono) {
                            const googlePayload = {
                                edificio: edName,
                                depto: depCode,
                                nombre: p.nombreReal,
                                relacion: p.relacion,
                                telefonos: [p.telefono],
                                emails: []
                            }
                            fetch('/api/contactos/sync-google', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ contactData: googlePayload })
                            }).catch(err => console.error("Sync silent fail", err))
                        }
                    })
                }
            }

            toast.success(`Departamento ${newDept.codigo} creado exitosamente`)
            onSuccess(newDept.id, newDept.codigo)

        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Error al crear el departamento")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Step 0: Select Building (If no ID)
    if (!selectedEdificioId) {
        return (
            <div className={`space-y-4 ${isChatVariant ? "p-0" : "p-1"}`}>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">Primero, selecciona el Edificio:</Label>
                    <div className="relative">
                        <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o dirección..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => handleSearchBuilding(e.target.value)}
                            autoFocus
                        />
                        {isSearching && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                </div>

                <div className="space-y-1 max-h-[200px] overflow-y-auto border rounded-md bg-white dark:bg-gray-950">
                    {searchResults.map((ed) => (
                        <button
                            key={ed.id}
                            type="button"
                            onClick={() => setSelectedEdificioId(ed.id)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-900 flex flex-col"
                        >
                            <span className="font-medium">{ed.nombre}</span>
                            <span className="text-xs text-muted-foreground">{ed.direccion}</span>
                        </button>
                    ))}
                    {searchResults.length === 0 && searchTerm.length > 2 && !isSearching && (
                        <div className="p-3 text-xs text-center text-muted-foreground">
                            No se encontraron edificios.
                        </div>
                    )}
                    {searchResults.length === 0 && searchTerm.length <= 2 && (
                        <div className="p-3 text-xs text-center text-muted-foreground">
                            Escribe para buscar...
                        </div>
                    )}
                </div>
                <div className="flex justify-end pt-2">
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                        Cancelar
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className={`space-y-4 ${isChatVariant ? "p-0" : "p-1"}`}>
            {!isChatVariant && (
                <div className="bg-blue-50/50 p-3 rounded-md border border-blue-100 mb-4">
                    <p className="text-sm text-blue-700">
                        Ingresa el código del departamento y, opcionalmente, sus contactos.
                        Se guardará todo en un solo paso.
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className={isChatVariant ? "space-y-3" : "space-y-4"}>
                {/* 1. Departamento CODE */}
                <div className="space-y-2">
                    <Label htmlFor="dept-code" className={isChatVariant ? "text-sm font-semibold" : "text-base font-semibold"}>
                        Código Departamento <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="dept-code"
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        onBlur={(e) => setCodigo(sanitizeText(e.target.value))}
                        placeholder="Ej: 1A, PB, LOCAL-3"
                        className={isChatVariant ? "text-base font-medium h-9" : "text-lg font-medium h-12"}
                        autoFocus
                        disabled={isSubmitting}
                    />
                </div>

                {/* 2. Contactos List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                        <Label className="text-sm font-medium text-muted-foreground flex items-center">
                            <User className="w-4 h-4 mr-2" /> Contactos Asociados
                        </Label>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {contactos.map((c, idx) => (
                            <div key={c.id} className="grid gap-3 p-3 border rounded-md bg-muted/20 relative group">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Nombre</Label>
                                        <Input
                                            value={c.nombre}
                                            onChange={(e) => updateContacto(c.id, 'nombre', e.target.value)}
                                            placeholder="Nombre"
                                            className="h-8"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Relación</Label>
                                        <Select
                                            value={c.relacion}
                                            onValueChange={(val) => updateContacto(c.id, 'relacion', val)}
                                        >
                                            <SelectTrigger className="h-8">
                                                <SelectValue placeholder="Rol" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Propietario">Propietario</SelectItem>
                                                <SelectItem value="Inquilino">Inquilino</SelectItem>
                                                <SelectItem value="Encargado">Encargado</SelectItem>
                                                <SelectItem value="Inmobiliaria">Inmobiliaria</SelectItem>
                                                <SelectItem value="Otro">Otro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <Label className="text-xs">Teléfono</Label>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`st-${c.id}`}
                                                checked={c.sin_telefono}
                                                onCheckedChange={(chk) => updateContacto(c.id, 'sin_telefono', !!chk)}
                                            />
                                            <label htmlFor={`st-${c.id}`} className="text-[10px] cursor-pointer text-muted-foreground">Sin Tel.</label>
                                        </div>
                                    </div>
                                    <Input
                                        value={c.numero}
                                        onChange={(e) => updateContacto(c.id, 'numero', e.target.value)}
                                        placeholder="+54 9 11..."
                                        disabled={c.sin_telefono || isSubmitting}
                                        className="h-8 font-mono text-sm"
                                    />
                                </div>

                                {contactos.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeContacto(c.id)}
                                        className="absolute -top-2 -right-2 h-6 w-6 bg-white border shadow-sm rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addContacto}
                        className="w-full border-dashed"
                        disabled={isSubmitting}
                    >
                        <Plus className="w-4 h-4 mr-2" /> Agregar otro contacto
                    </Button>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Guardar Todo
                    </Button>
                </div>
            </form>
        </div>
    )
}
