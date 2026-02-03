"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle2, AlertTriangle, CloudUpload } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import { toast } from "@/components/ui/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

export function BatchGoogleSync() {
    const [isOpen, setIsOpen] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [progress, setProgress] = useState(0)
    const [stats, setStats] = useState({ total: 0, current: 0, success: 0, errors: 0 })
    const [isComplete, setIsComplete] = useState(false)

    const handleSync = async () => {
        setIsSyncing(true)
        setIsComplete(false)
        setProgress(0)
        setStats({ total: 0, current: 0, success: 0, errors: 0 })

        const supabase = createClient()

        try {
            // 1. Fetch All Contacts (with context)
            const { data: contacts, error } = await supabase
                .from("contactos")
                .select(`
                    id, 
                    nombre,
                    "nombreReal",
                    telefono,
                    relacion,
                    departamentos (
                        codigo,
                        edificios ( nombre )
                    )
                `)
                .order('id')

            if (error) throw error

            // Filter contacts that have phone (Google requires basic data usually suitable for sync)
            const validContacts = contacts.filter(c => c.telefono && c.telefono.length > 5 && c.departamentos && c.departamentos.edificios)

            const total = validContacts.length
            setStats(prev => ({ ...prev, total }))

            if (total === 0) {
                toast({ title: "Sin Contactos", description: "No hay contactos válidos para sincronizar." })
                setIsSyncing(false)
                return
            }

            // 2. Loop and Sync
            let processed = 0
            let successCount = 0
            let errorCount = 0

            for (const c of validContacts) {
                setStats(prev => ({ ...prev, current: processed + 1 }))

                // Prepare Payload matching the form logic
                const googlePayload = {
                    edificio: c.departamentos?.edificios?.nombre || "Sin Edificio",
                    depto: c.departamentos?.codigo || "Sin Depto",
                    nombre: c["nombreReal"] || c.nombre || "Sin Nombre",
                    relacion: c.relacion || "Contacto",
                    telefonos: [c.telefono],
                    emails: []
                }

                try {
                    const res = await fetch('/api/contactos/sync-google', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contactData: googlePayload })
                    })
                    const json = await res.json()

                    if (json.success) {
                        successCount++
                    } else {
                        console.error(`Error syncing contact ${c.id}:`, json.error)
                        errorCount++
                    }
                } catch (e) {
                    console.error(`Network error contact ${c.id}`, e)
                    errorCount++
                }

                processed++
                setProgress(Math.round((processed / total) * 100))
                setStats(prev => ({ ...prev, success: successCount, errors: errorCount }))
            }

            setIsComplete(true)
            toast({
                title: "Sincronización Finalizada",
                description: `Se enviaron ${successCount} contactos. (${errorCount} errores).`
            })

        } catch (err: any) {
            console.error("Batch Sync Error:", err)
            toast({ title: "Error", description: err.message, variant: "destructive" })
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
                    <CloudUpload className="w-4 h-4" />
                    Sincronizar a Google (Masivo)
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Sincronización Masiva con Google</DialogTitle>
                    <DialogDescription>
                        Esta herramienta enviará <strong>todos</strong> tus contactos actuales a tu cuenta de Google.
                        <br /><br />
                        <span className="flex items-center gap-2 text-amber-600 font-medium bg-amber-50 p-2 rounded border border-amber-200">
                            <AlertTriangle className="w-4 h-4" />
                            ADVERTENCIA: Usar solo una vez para evitar duplicados.
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {isSyncing || isComplete ? (
                        <div className="space-y-2">
                            <Progress value={progress} className="h-3" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Procesando: {stats.current} / {stats.total}</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="flex gap-4 text-xs">
                                <span className="text-green-600 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Exitos: {stats.success}
                                </span>
                                {stats.errors > 0 && (
                                    <span className="text-red-600 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Errores: {stats.errors}
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">
                            Al confirmar, el proceso comenzará inmediatamente. Puede tardar unos minutos dependiendo de la cantidad de contactos.
                        </p>
                    )}
                </div>

                <DialogFooter className="sm:justify-between">
                    <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isSyncing}>
                        {isComplete ? "Cerrar" : "Cancelar"}
                    </Button>
                    {!isComplete && (
                        <Button onClick={handleSync} disabled={isSyncing} className="gap-2">
                            {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                            {isSyncing ? "Enviando..." : "Iniciar Sincronización"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
