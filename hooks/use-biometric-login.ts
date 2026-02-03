// SPC Protocol v20.3: Biometric Login Hook
// React hook for WebAuthn biometric authentication

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithBiometric, isBiometricSupported } from '@/lib/webauthn-client'
import type { SupabaseClient } from '@supabase/supabase-js'

interface UseBiometricLoginProps {
    supabase: SupabaseClient
    toast: (params: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void
}

export function useBiometricLogin({ supabase, toast }: UseBiometricLoginProps) {
    const router = useRouter()
    const [biometricLoading, setBiometricLoading] = useState(false)
    const [biometricEmail, setBiometricEmail] = useState("")
    const [showEmailInput, setShowEmailInput] = useState(false)

    // Load saved email on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedEmail = localStorage.getItem('spc_biometric_email')
            if (savedEmail) setBiometricEmail(savedEmail)
        }
    }, [])

    const handleBiometricLogin = async (fallbackEmail?: string) => {
        if (!isBiometricSupported()) {
            toast({
                title: "No soportado",
                description: "Tu navegador no soporta autenticación biométrica.",
                variant: "destructive"
            })
            return
        }

        const emailToUse = biometricEmail || fallbackEmail
        if (!emailToUse) {
            setShowEmailInput(true)
            toast({
                title: "Email necesario",
                description: "Ingresa tu email para identificar tu credencial."
            })
            return
        }

        setBiometricLoading(true)
        try {
            const session = await loginWithBiometric(emailToUse)
            if (!session) throw new Error("No se pudo crear la sesión")

            const { error } = await supabase.auth.setSession(session)
            if (error) throw error

            if (typeof window !== 'undefined') {
                localStorage.setItem('spc_biometric_email', emailToUse)
            }

            toast({ title: "✅ Acceso concedido", description: "Bienvenido" })
            router.push('/dashboard')
        } catch (error: any) {
            console.error('Biometric error:', error)
            toast({
                title: "Error de autenticación",
                description: error.message || "Intenta con Google.",
                variant: "destructive"
            })
        } finally {
            setBiometricLoading(false)
        }
    }

    return {
        biometricLoading,
        biometricEmail,
        showEmailInput,
        handleBiometricLogin,
        isBiometricSupported: isBiometricSupported()
    }
}
