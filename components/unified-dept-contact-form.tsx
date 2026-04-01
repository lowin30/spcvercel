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
import { Loader2, Save, Star, Trash2 } from "lucide-react"
import { sanitizeText } from "@/lib/utils"
import { CONTACT_RELATIONS } from "@/lib/contact-constants"

// Schema Validation (SPC v18.3 - Relationship is Optional)
const phoneSchema = z.object({
    id: z.number().optional(), // For edit mode
    nombre_contacto: z.string().min(2, "el nombre es requerido"),
    relacion: z.string().optional().default(""),
    numero: z.string().optional(),
    es_principal: z.boolean().default(false),
    notas: z.string().optional(),
    sin_telefono: z.boolean().default(false)
}).refine(data => data.sin_telefono || (data.numero && data.numero.length >= 8), {
    message: "el numero es requerido si no se marca 'sin telefono'",
    path: ["numero"]
})

type ContactFormData = z.infer<typeof phoneSchema>

interface UnifiedDeptContactFormProps {
    edificioId: number
    departamentoId?: number
    edificioNombre?: string
    departamentoCodigo?: string
    mode?: 'create' | 'edit'
    defaultValues?: Partial<ContactFormData>
    onSuccess?: () => void
    onCancel?: () => void
}

export function UnifiedDeptContactForm({
    edificioId,
    departamentoId,
    edificioNombre,
    departamentoCodigo,
    mode = 'create',
    defaultValues,
    onSuccess,
    onCancel
}: UnifiedDeptContactFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    const form = useForm<ContactFormData>({
        resolver: zodResolver(phoneSchema),
        defaultValues: {
            id: defaultValues?.id,
            nombre_contacto: defaultValues?.nombre_contacto || "",
            relacion: defaultValues?.relacion || "",
            numero: defaultValues?.numero || "",
            es_principal: defaultValues?.es_principal || false,
            notas: defaultValues?.notas || "",
            sin_telefono: defaultValues?.sin_telefono || false
        }
    })

    const sinTelefono = form.watch("sin_telefono")

    const onSubmit = async (data: ContactFormData) => {
        if (!edificioId || !departamentoId) {
            toast({ title: "error", description: "faltan datos de contexto (edificio/depto)", variant: "destructive" })
            return
        }

        setIsSubmitting(true)
        const supabase = createClient()

        try {
            // 1. Sanitize Data
            const nombreSanitized = sanitizeText(data.nombre_contacto)
            const relacionSanitized = data.relacion ? sanitizeText(data.relacion) : ""

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

            if (!edName || !depCode) throw new Error("no se pudo obtener el contexto del edificio/departamento")

            const normalizeForSlug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

            // 3. Prepare Payload
            const payload: any = {
                'nombreReal': nombreSanitized,
                telefono: data.sin_telefono ? null : data.numero,
                tipo_padre: 'edificio',
                id_padre: edificioId,
                departamento: depCode,
                departamento_id: departamentoId,
                relacion: relacionSanitized,
                es_principal: data.es_principal,
                notas: data.notas,
                updated_at: new Date().toISOString()
            }

            let dbResult;

            if (mode === 'edit' && data.id) {
                // UPDATE
                dbResult = await supabase.from("contactos").update(payload).eq("id", data.id)
            } else {
                // CREATE - Generate Slug
                const slugBuilding = normalizeForSlug(edName)
                const slugDept = normalizeForSlug(depCode)
                const slugRelacion = normalizeForSlug(relacionSanitized)

                let cleanName = nombreSanitized.toLowerCase()
                const buildingTokens = edName.toLowerCase().split(' ')
                const deptTokens = depCode.toLowerCase().split(' ')
                buildingTokens.forEach(t => { if (t.length > 2) cleanName = cleanName.replace(t, '') })
                deptTokens.forEach(t => { cleanName = cleanName.replace(t, '') })

                const slugName = normalizeForSlug(cleanName)
                const slugParts = [slugBuilding, slugDept, slugName, slugRelacion].filter(p => p && p.length > 0)
                const slugBase = slugParts.join('-')

                // Check Duplicates for Slug
                const { data: existing } = await supabase.from("contactos").select("id, nombre").ilike("nombre", `${slugBase}%`)

                let finalSlug = slugBase
                if (existing && existing.length > 0) {
                    const exactMatch = existing.find(c => c.nombre === slugBase)
                    if (exactMatch) {
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
                
                payload.nombre = finalSlug
                dbResult = await supabase.from("contactos").insert(payload)
            }

            if (dbResult.error) throw dbResult.error

            // 4. Google Sync Trigger (SPC v17.0)
            if (!data.sin_telefono && data.numero) {
                const googlePayload = {
                    edificio: edName,
                    depto: depCode,
                    nombre: nombreSanitized,
                    relacion: relacionSanitized,
                    telefonos: [data.numero],
                    emails: []
                }

                fetch('/api/contactos/sync-google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contactData: googlePayload })
                }).catch(err => console.error("sync silent fail", err))
            }

            toast({ 
                title: mode === 'edit' ? "actualizado" : "guardado", 
                description: mode === 'edit' ? "contacto actualizado correctamente" : "contacto registrado correctamente" 
            })
            
            if (onSuccess) onSuccess()

        } catch (error: any) {
            console.error(error)
            toast({ title: "error", description: error.message || "error al guardar", variant: "destructive" })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-4 p-4 border rounded-md bg-white dark:bg-zinc-950 shadow-sm border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm flex items-center dark:text-zinc-100">
                    <Star className="w-4 h-4 mr-2 text-primary" /> 
                    {mode === 'edit' ? 'editar contacto' : 'nuevo contacto'}
                </h3>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label htmlFor="nombre" className="dark:text-zinc-400">nombre (persona)</Label>
                        <Input
                            {...form.register("nombre_contacto")}
                            placeholder="ej: juan pena"
                            disabled={isSubmitting}
                            className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                        />
                        {form.formState.errors.nombre_contacto && (
                            <p className="text-[10px] text-red-500">{form.formState.errors.nombre_contacto.message}</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="relacion" className="dark:text-zinc-400">relacion</Label>
                        <Select
                            onValueChange={(val) => form.setValue("relacion", val)}
                            defaultValue={form.getValues("relacion")}
                        >
                            <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                <SelectValue placeholder="seleccionar relacion (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                                {CONTACT_RELATIONS.map(rel => (
                                    <SelectItem key={rel} value={rel}>{rel.toLowerCase()}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2 border-l-2 border-zinc-100 dark:border-zinc-800 pl-3">
                    <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                            id="sin_telefono"
                            checked={sinTelefono}
                            onCheckedChange={(c) => form.setValue("sin_telefono", !!c)}
                        />
                        <Label htmlFor="sin_telefono" className="text-sm font-normal cursor-pointer dark:text-zinc-400">
                            sin telefono (solo registrar nombre)
                        </Label>
                    </div>

                    {!sinTelefono && (
                        <div className="space-y-1">
                            <Label htmlFor="numero" className="dark:text-zinc-400">numero de telefono</Label>
                            <Input
                                {...form.register("numero")}
                                placeholder="ej: 54911..."
                                type="tel"
                                disabled={isSubmitting}
                                className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                            />
                            {form.formState.errors.numero && (
                                <p className="text-[10px] text-red-500">{form.formState.errors.numero.message}</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-2 py-1">
                    <Checkbox
                        id="es_principal"
                        checked={form.watch("es_principal")}
                        onCheckedChange={(c) => form.setValue("es_principal", !!c)}
                    />
                    <Label htmlFor="es_principal" className="dark:text-zinc-400">contacto principal</Label>
                </div>

                <div className="space-y-1">
                    <Label htmlFor="notas" className="dark:text-zinc-400 text-xs">notas adicionales</Label>
                    <Textarea
                        {...form.register("notas")}
                        placeholder="detalles extras..."
                        className="h-12 text-xs resize-none bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                    {onCancel && (
                        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting} className="text-xs h-8">
                            cancelar
                        </Button>
                    )}
                    <Button type="submit" disabled={isSubmitting} className="text-xs h-8">
                        {isSubmitting ? (
                            <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> guardando</>
                        ) : (
                            <><Save className="w-3 h-3 mr-2" /> {mode === 'edit' ? 'actualizar' : 'guardar'}</>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
