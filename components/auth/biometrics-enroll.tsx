"use client"

import { useState, useEffect } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Fingerprint } from "lucide-react"

export function BiometricsEnroll() {
    const { supabase } = useSupabase()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [hasBiometrics, setHasBiometrics] = useState(false)

    useEffect(() => {
        checkFactors()
    }, [])

    const checkFactors = async () => {
        const { data, error } = await supabase.auth.mfa.listFactors()
        if (error) {
            console.error("Error listing factors:", error)
            return
        }

        const webauthn = data.all.find(f => f.factor_type === 'webauthn' && f.status === 'verified')
        setHasBiometrics(!!webauthn)
    }

    const handleEnroll = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'webauthn',
            })

            if (error) throw error

            setHasBiometrics(true)
            setOpen(false)
            toast({
                title: "Huella registrada correctamente",
                description: "Ahora puedes iniciar sesión sin contraseña.",
            })

            // Update DB flag for UI optimization
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await supabase.from('usuarios').update({ webauthn_enabled: true }).eq('id', user.id)
            }

        } catch (error: any) {
            console.error("Biometrics error:", error)
            // DEBUG: Mostrar error real en el móvil
            alert(`Error Biometría: ${error.message || error.name || JSON.stringify(error)}`)

            toast({
                title: "Error al registrar huella",
                description: "Revisa el mensaje de alerta para más detalles.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    if (hasBiometrics) return null // Hide if already enrolled

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Fingerprint className="h-4 w-4" />
                    Activar Huella
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Activar Acceso Biométrico</DialogTitle>
                    <DialogDescription>
                        Registra tu huella o FaceID para iniciar sesión más rápido y segura, sin recordar contraseñas.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-center py-6">
                    <Fingerprint className="h-16 w-16 text-primary animate-pulse" />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleEnroll} disabled={loading}>
                        {loading ? "Escaneando..." : "Registrar ahora"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
