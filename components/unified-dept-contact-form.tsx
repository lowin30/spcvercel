"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Save, Star, AlertTriangle } from "lucide-react"
import { sanitizeText } from "@/lib/utils"

// Schema Validation (SPC v16.0 Rules)
const phoneSchema = z.object({
    nombre_contacto: z.string().min(2, "El nombre es requerido"),
    relacion: z.string().min(1, "La relación es requerida"),
    numero: z.string().optional(),
    es_principal: z.boolean().default(false),
    notas: z.string().optional(),
    sin_telefono: z.boolean().default(false)
}).refine(data => data.sin_telefono || (data.numero && data.numero.length >= 8), {
    message: "El número es requerido si no se marca 'Sin teléfono'",
    path: ["numero"]
})

interface UnifiedDeptContactFormProps {
    edificioId: number
    departamentoId?: number // Optional only if creating dept + contact simultaneously (advanced)
    edificioNombre?: string // Allow passing name to avoid fetching
    departamentoCodigo?: string
    defaultValues?: Partial<z.infer<typeof phoneSchema>>
    onSuccess?: () => void
    onCancel?: () => void
}

export function UnifiedDeptContactForm({
    edificioId,
    departamentoId,
    edificioNombre,
    departamentoCodigo,
    defaultValues,
    onSuccess,
    onCancel
}: UnifiedDeptContactFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    const form = useForm<z.infer<typeof phoneSchema>>({
        resolver: zodResolver(phoneSchema),
        defaultValues: {
            nombre_contacto: defaultValues?.nombre_contacto || "",
            relacion: defaultValues?.relacion || "",
            numero: defaultValues?.numero || "",
            es_principal: defaultValues?.es_principal || false,
            notas: defaultValues?.notas || "",
            sin_telefono: defaultValues?.sin_telefono || false
        }
    })

    // Watch for conditional logic
    const sinTelefono = form.watch("sin_telefono")

    const onSubmit = async (data: z.infer<typeof phoneSchema>) => {
        if (!edificioId || !departamentoId) {
            toast({ title: "Error", description: "Faltan datos de contexto (Edificio/Depto)", variant: "destructive" })
            return
        }

        setIsSubmitting(true)
        const supabase = createClient()

        try {
            // 1. Sanitize Data (SPC v18.1 - Ñ Safe)
            const nombreSanitized = sanitizeText(data.nombre_contacto)
            const relacionSanitized = sanitizeText(data.relacion)
            // Note: We do NOT force lowercase on inputs, sanitizeText handles cleanup but preserves casing for display if adjusted, 
            // but strictly speaking sanitizeText (v18.1) strips non-alphanumeric. 
            // Input "Peña" -> sanitizeText -> "Peña".

            // 2. Fetch Context (If names missing)
            let edName = edificioNombre
            let depCode = departamentoCodigo

            if (!edName || !depCode) {
                const { data: ctx } = await supabase
                    .from("departamentos")
                    .select(`codigo, edificios(nombre)`)
                    .eq("id", departamentoId)
                    .single()

                if (ctx) {
                    depCode = ctx.codigo
                    // @ts-ignore
                    edName = Array.isArray(ctx.edificios) ? ctx.edificios[0]?.nombre : ctx.edificios?.nombre
                }
            }

            if (!edName || !depCode) throw new Error("No se pudo obtener el contexto del edificio/departamento")

            const normalizeForSlug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

            // Prepare Clean Slug Parts
            const slugBuilding = normalizeForSlug(edName)
            const slugDept = normalizeForSlug(depCode)
            const slugRelacion = normalizeForSlug(relacionSanitized)

            // Remove building and dept info from the Human Name to avoid redundancy in slug
            // e.g. If Name is "Pareja 3205 4A Juan", and Building is "Pareja 3205", Name becomes "Juan"
            let cleanName = nombreSanitized.toLowerCase()
            const buildingTokens = edName.toLowerCase().split(' ')
            const deptTokens = depCode.toLowerCase().split(' ')

            // Simple token removal
            buildingTokens.forEach(t => { if (t.length > 2) cleanName = cleanName.replace(t, '') })
            deptTokens.forEach(t => { cleanName = cleanName.replace(t, '') })

            const slugName = normalizeForSlug(cleanName)

            // Construct Final Base Slug: "building-dept-name-relacion"
            // Filter empty parts
            const slugParts = [slugBuilding, slugDept, slugName, slugRelacion].filter(p => p && p.length > 0)
            const slugBase = slugParts.join('-')

            // 4. Check Duplicates with Smart Suffix
            // First check the exact slug
            const { data: existing } = await supabase.from("contactos").select("id, nombre").ilike("nombre", `${slugBase}%`)

            let finalSlug = slugBase
            if (existing && existing.length > 0) {
                // Find if exact match exists or max suffix
                const exactMatch = existing.find(c => c.nombre === slugBase)
                if (exactMatch) {
                    // Calculate next suffix number
                    // Filter those that start with slugBase and follow with -number
                    const regex = new RegExp(`^${slugBase}-(\\d+)$`)
                    let maxSuffix = 1

                    existing.forEach(c => {
                        const match = c.nombre.match(regex)
                        if (match) {
                            const num = parseInt(match[1])
                            if (num > maxSuffix) maxSuffix = num
                        }
                    })

                    finalSlug = `${slugBase}-${maxSuffix + 1}`
                }
            }

            // 5. Prepare Payload
            const payload = {
                nombre: finalSlug, // The unique slug
                'nombreReal': nombreSanitized, // Human readable (Peña)
                telefono: data.sin_telefono ? null : data.numero,
                tipo_padre: 'edificio',
                id_padre: edificioId,
                departamento: depCode, // Legacy text
                departamento_id: departamentoId,
                relacion: relacionSanitized,
                es_principal: data.es_principal,
                notas: data.notas,
                updated_at: new Date().toISOString()
            }

            // 6. DB Upsert
            const { error: dbError } = await supabase.from("contactos").insert(payload)
            if (dbError) throw dbError

            // 7. Google Sync Trigger (SPC v17.0)
            if (!data.sin_telefono && data.numero) {
                // Only sync if we have a phone number (Business Rule: Contacts without phone don't need sync usually, or do they?)
                // User request: "evitar duplicados en google". If no phone, maybe skip? 
                // Logic: Sync everything that is useful. Name + Dept is useful even without phone?
                // Let's sync everything.

                const googlePayload = {
                    edificio: edName,
                    depto: depCode,
                    nombre: nombreSanitized, // Human name
                    relacion: relacionSanitized,
                    telefonos: data.sin_telefono ? [] : [data.numero],
                    emails: [] // Add email field if needed later
                }

                fetch('/api/contactos/sync-google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contactData: googlePayload })
                }).then(res => res.json()).then(json => {
                    if (json.success) {
                        toast({
                            title: "Sincronizado",
                            description: "✅ Contacto enviado a Google Agenda",
                            className: "bg-green-50"
                        })
                    }
                }).catch(err => console.error("Sync silent fail", err))
            }

            toast({ title: "Guardado", description: "Contacto registrado correctamente" })
            if (onSuccess) onSuccess()

        } catch (error: any) {
            console.error(error)
            toast({ title: "Error", description: error.message || "Error al guardar", variant: "destructive" })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-4 p-4 border rounded-md bg-white shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm flex items-center">
                    <Star className="w-4 h-4 mr-2 text-primary" /> Nuevo Contacto
                </h3>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                {/* Nombre y Relación */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label htmlFor="nombre">Nombre (Persona)</Label>
                        <Input
                            {...form.register("nombre_contacto")}
                            placeholder="Ej: Juan Peña"
                            disabled={isSubmitting}
                        />
                        {form.formState.errors.nombre_contacto && (
                            <p className="text-xs text-red-500">{form.formState.errors.nombre_contacto.message}</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="relacion">Relación</Label>
                        <Select
                            onValueChange={(val) => form.setValue("relacion", val)}
                            defaultValue={form.getValues("relacion")}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Propietario">Propietario</SelectItem>
                                <SelectItem value="Inquilino">Inquilino</SelectItem>
                                <SelectItem value="Encargado">Encargado</SelectItem>
                                <SelectItem value="Familiar">Familiar</SelectItem>
                                <SelectItem value="Otro">Otro</SelectItem>
                            </SelectContent>
                        </Select>
                        {form.formState.errors.relacion && (
                            <p className="text-xs text-red-500">{form.formState.errors.relacion.message}</p>
                        )}
                    </div>
                </div>

                {/* Teléfono */}
                <div className="space-y-2 border-l-2 border-muted pl-3">
                    <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                            id="sin_telefono"
                            checked={sinTelefono}
                            onCheckedChange={(c) => form.setValue("sin_telefono", !!c)}
                        />
                        <Label htmlFor="sin_telefono" className="text-sm font-normal cursor-pointer">
                            No tiene teléfono (Solo registrar nombre)
                        </Label>
                    </div>

                    {!sinTelefono && (
                        <div className="space-y-1">
                            <Label htmlFor="numero">Número de Teléfono</Label>
                            <Input
                                {...form.register("numero")}
                                placeholder="Ej: 54911..."
                                type="tel"
                                disabled={isSubmitting}
                            />
                            <p className="text-[10px] text-muted-foreground">Formato internacional recomendado (sin espacios)</p>
                            {form.formState.errors.numero && (
                                <p className="text-xs text-red-500">{form.formState.errors.numero.message}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Opciones Extra */}
                <div className="flex items-center space-x-2 py-2">
                    <Checkbox
                        id="es_principal"
                        checked={form.watch("es_principal")}
                        onCheckedChange={(c) => form.setValue("es_principal", !!c)}
                    />
                    <Label htmlFor="es_principal">Contacto Principal del Departamento</Label>
                </div>

                {/* Notas */}
                <div className="space-y-1">
                    <Label htmlFor="notas">Notas Adicionales</Label>
                    <Textarea
                        {...form.register("notas")}
                        placeholder="Horarios, detalles, etc."
                        className="h-16 resize-none"
                    />
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                    {onCancel && (
                        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                    )}
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando</>
                        ) : (
                            <><Save className="w-4 h-4 mr-2" /> Guardar Contacto</>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
