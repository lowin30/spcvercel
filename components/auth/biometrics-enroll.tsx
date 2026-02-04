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
import { registerBiometric, isBiometricSupported } from "@/lib/webauthn-client"

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
        // Check custom WebAuthn credentials table
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from('webauthn_credentials')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(1)

        if (error) {
            console.error('error al verificar credenciales:', error)
            return
        }

        setHasBiometrics(data && data.length > 0)
    }

    const handleEnroll = async () => {
        if (!isBiometricSupported()) {
            toast({
                title: "dispositivo no compatible",
                description: "tu navegador no soporta autenticacion biometrica.",
                variant: "destructive",
            })
            return
        }

        setLoading(true)
        try {
            const deviceName = `dispositivo ${new Date().toLocaleDateString()}`
            const success = await registerBiometric(deviceName)

            if (!success) {
                throw new Error('no se pudo registrar la huella')
            }

            setHasBiometrics(true)
            setOpen(false)
            toast({
                title: "huella registrada con exito",
                description: "ahora puedes iniciar sesion sin contraseña.",
            })

            // Update DB flag for UI optimization
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await supabase.from('usuarios').update({ webauthn_enabled: true }).eq('id', user.id)
            }

        } catch (error: any) {
            console.error('biometric error:', error)
            toast({
                title: "error al registrar huella",
                description: error.message || "intenta nuevamente.",
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
                    <DialogTitle>activar acceso biometrico</DialogTitle>
                    <DialogDescription>
                        registra tu huella o faceid para iniciar sesion mas rapido y seguro, sin recordar contraseñas.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-center py-6">
                    <Fingerprint className="h-16 w-16 text-primary animate-pulse" />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>cancelar</Button>
                    <Button onClick={handleEnroll} disabled={loading}>
                        {loading ? "escaneando..." : "registrar ahora"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
