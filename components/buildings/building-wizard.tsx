"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Loader2, MapPin, Save, Building, ArrowRight, ArrowLeft } from "lucide-react"
import { createBuilding, updateBuilding } from "@/app/dashboard/edificios/actions"
import { sanitizeText, cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase-client"

// Schema
const formSchema = z.object({
    nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    direccion: z.string().optional(),
    estado: z.enum(["activo", "en_obra", "finalizado", "inactivo"]).default("activo"),
    id_administrador: z.string().default("0"),
    cuit: z.string().optional(),
    mapa_url: z.string().optional(),
    latitud: z.any().optional(), // Allow string/number -> convert on submit
    longitud: z.any().optional(),
})

interface Administrador {
    id: number
    nombre: string
}

interface BuildingWizardProps {
    administradores: Administrador[]
    initialData?: any
    mode?: 'create' | 'edit'
    isChatVariant?: boolean
    variant?: 'default' | 'chat' // Deprecated in favor of isChatVariant, kept for backward compatibility if needed
    onSuccess?: () => void
}

export function BuildingWizard({ administradores, initialData = {}, mode = 'create', isChatVariant = false, variant = 'default', onSuccess }: BuildingWizardProps) {
    // Priority to explicit isChatVariant, fallback to legacy variant string
    const inChat = isChatVariant || variant === 'chat'
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [isProcessingMap, setIsProcessingMap] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [lastProcessedUrl, setLastProcessedUrl] = useState<string | null>(null)
    const [adminsList, setAdminsList] = useState<Administrador[]>(administradores)

    useEffect(() => {
        if (administradores.length === 0) {
            const fetchAdmins = async () => {
                const supabase = createClient()
                const { data } = await supabase.from('administradores').select('id, nombre').eq('estado', 'activo').order('nombre')
                if (data) setAdminsList(data)
            }
            fetchAdmins()
        } else {
            setAdminsList(administradores)
        }
    }, [administradores])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nombre: initialData.nombre || "",
            direccion: initialData.direccion || "",
            estado: initialData.estado || "activo",
            id_administrador: initialData.id_administrador ? String(initialData.id_administrador) : "0",
            cuit: initialData.cuit || "",
            mapa_url: initialData.mapa_url || "",
            latitud: initialData.latitud || "",
            longitud: initialData.longitud || "",
        },
    })

    // MAP PROCESSING LOGIC (Centralized via GoogleMasterService)
    const handleResolveMap = async (url: string) => {
        if (!url) return
        setIsProcessingMap(true)
        console.log("Resolving Map - Fix Version Loaded")
        toast({ title: "Procesando...", description: "Analizando enlace..." })
        try {
            const { resolveMapUrlAction } = await import("@/app/actions/google-actions")
            const res = await resolveMapUrlAction(url)

            if (res.success && res.data) {
                const { address, name, lat, lng } = res.data

                form.setValue("direccion", address)
                form.setValue("latitud", lat)
                form.setValue("longitud", lng)

                // Solo setear nombre si está vacío para no sobreescribir edición manual
                if (!form.getValues("nombre")) {
                    form.setValue("nombre", name)
                }

                toast({ title: "Ubicación detectada", description: "Datos actualizados." })

                // Auto-avance UX
                if (mode === 'create' && step === 1) {
                    setTimeout(() => setStep(2), 300)
                }
            } else {
                toast({ title: "No se pudo detectar", description: res.error || "Verifique el enlace", variant: "destructive" })
            }
        } catch (error) {
            console.error("Error resolviendo mapa:", error)
            toast({ title: "Error interno", description: "Hubo un problema procesando el mapa.", variant: "destructive" })
        } finally {
            setIsProcessingMap(false)
        }
    }

    // Watcher de URL con debounce corto (500ms)
    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === "mapa_url" && value.mapa_url) {
                const currentUrl = value.mapa_url
                if (currentUrl !== lastProcessedUrl && currentUrl.length > 10) {
                    const timeout = setTimeout(() => {
                        setLastProcessedUrl(currentUrl)
                        handleResolveMap(currentUrl)
                    }, 500)
                    return () => clearTimeout(timeout)
                }
            }
        })
        return () => subscription.unsubscribe()
    }, [form.watch, lastProcessedUrl])

    // Sanitization Handlers
    // Sanitization Handlers (SPC Law v3.5)
    const handleSanitize = (field: "nombre" | "direccion") => {
        const val = form.getValues(field)
        if (val) {
            const clean = sanitizeText(val)
            if (clean !== val) {
                form.setValue(field, clean)
                toast({ title: "Formato SPC Aplicado", description: "Se ha estandarizado a MAYÚSCULAS y sin acentos (Ñ preservada)." })
            }
        }
    }

    // Submit
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true)
        try {
            let result
            if (mode === 'create') {
                result = await createBuilding(values)
            } else {
                result = await updateBuilding(initialData.id, values)
            }

            if (result.success) {
                toast({ title: "Éxito", description: `Edificio ${mode === 'create' ? 'creado' : 'actualizado'} correctamente.` })
                if (onSuccess) onSuccess()
                else {
                    router.push("/dashboard/edificios")
                    router.refresh()
                }
            } else {
                throw new Error(result.error)
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        } finally {
            setIsSubmitting(false)
        }
    }

    const isChat = variant === 'chat'

    return (
        <Card className={cn(
            "w-full mx-auto transition-all duration-300",
            inChat ? "border-none shadow-none bg-transparent p-0 max-w-full" : "max-w-2xl border md:shadow-sm"
        )}>
            {!inChat && (
                <CardHeader>
                    <CardTitle>{mode === 'create' ? 'Nuevo Edificio' : 'Editar Edificio'}</CardTitle>
                    <CardDescription>Paso {step} de 3</CardDescription>
                </CardHeader>
            )}
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        {/* STEP 1: MAPA */}
                        <div className={step === 1 ? "block" : "hidden"}>
                            <div className="space-y-4">
                                <FormLabel className="text-lg font-semibold flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-primary" />
                                    Ubicación (Mapa)
                                </FormLabel>
                                <FormField
                                    control={form.control}
                                    name="mapa_url"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <Input placeholder="https://maps.app.goo.gl/..." {...field} />
                                                        {isProcessingMap && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin" />}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        disabled={isProcessingMap || !field.value}
                                                        onClick={() => {
                                                            if (field.value) {
                                                                setLastProcessedUrl(field.value)
                                                                handleResolveMap(field.value)
                                                            }
                                                        }}
                                                    >
                                                        Procesar
                                                    </Button>
                                                </div>
                                            </FormControl>
                                            <FormDescription>Pega el link de Google Maps para auto-completar nombre y dirección.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="latitud" render={({ field }) => (
                                        <FormItem><FormLabel>Latitud</FormLabel><FormControl><Input {...field} disabled /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="longitud" render={({ field }) => (
                                        <FormItem><FormLabel>Longitud</FormLabel><FormControl><Input {...field} disabled /></FormControl></FormItem>
                                    )} />
                                </div>
                            </div>
                        </div>

                        {/* STEP 2: IDENTIDAD */}
                        <div className={step === 2 ? "block" : "hidden"}>
                            <div className="space-y-4">
                                <FormLabel className="text-lg font-semibold flex items-center gap-2">
                                    <Building className="w-5 h-5 text-primary" />
                                    Identidad del Edificio
                                </FormLabel>
                                <FormField
                                    control={form.control}
                                    name="nombre"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nombre</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    onBlur={() => { field.onBlur(); handleSanitize('nombre') }}
                                                    placeholder="Ej: Edificio Central"
                                                />
                                            </FormControl>
                                            <FormDescription>Se limpiarán acentos automáticamente.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="direccion"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Dirección</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    onBlur={() => { field.onBlur(); handleSanitize('direccion') }}
                                                    placeholder="Ej: Av Corrientes 1234"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* STEP 3: ADMINISTRACION */}
                        <div className={step === 3 ? "block" : "hidden"}>
                            <div className="space-y-4">
                                <FormLabel className="text-lg font-semibold flex items-center gap-2">
                                    <Save className="w-5 h-5 text-primary" />
                                    Detalles Administrativos
                                </FormLabel>
                                <FormField
                                    control={form.control}
                                    name="id_administrador"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Administrador</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccione..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="0">Sin Asignar</SelectItem>
                                                    {adminsList.map(a => (
                                                        <SelectItem key={a.id} value={String(a.id)}>{a.nombre}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="cuit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CUIT (Opcional)</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="30-12345678-9" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="estado"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estado</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="activo">Activo</SelectItem>
                                                    <SelectItem value="en_obra">En Obra</SelectItem>
                                                    <SelectItem value="finalizado">Finalizado</SelectItem>
                                                    <SelectItem value="inactivo">Inactivo</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                    </form>
                </Form>
            </CardContent>
            <CardFooter className={cn("flex justify-between", inChat ? "px-0 pb-0 pt-4" : "")}>
                {step > 1 ? (
                    <Button variant="outline" size={inChat ? "sm" : "default"} onClick={() => setStep(s => s - 1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                    </Button>
                ) : <div />}

                {step < 3 ? (
                    <Button size={inChat ? "sm" : "default"} onClick={() => setStep(s => s + 1)}>
                        Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button size={inChat ? "sm" : "default"} onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {mode === 'create' ? 'Confirmar Registro' : 'Guardar Cambios'}
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}
