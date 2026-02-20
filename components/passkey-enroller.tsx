'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { startRegistration } from '@simplewebauthn/browser'
import { Fingerprint, X } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function PasskeyEnroller() {
    const supabase = createClient()
    const router = useRouter()
    const [showBanner, setShowBanner] = useState(false)
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(true)

    useEffect(() => {
        checkMFAStatus()
    }, [])

    const checkMFAStatus = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()
            if (factorsError) throw factorsError

            // Verificar si hay algún factor del tipo 'webauthn' ya enrolado
            const hasWebAuthn = factorsData?.all?.some(factor => factor.factor_type === 'webauthn' && factor.status === 'verified') || false

            if (!hasWebAuthn) {
                setShowBanner(true)
            }
        } catch (err) {
            console.error("Error comprobando estado MFA:", err)
        } finally {
            setChecking(false)
        }
    }

    const enrollPasskey = async () => {
        setLoading(true)
        try {
            // 1. Iniciar registro de factor webauthn
            const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
                factorType: 'webauthn',
            })

            if (enrollError) throw enrollError

            // 2. Realizar la ceremonia del navegador usando SimpleWebAuthn
            // Supabase devuelve las opciones necesarias en enrollData.webauthn
            const registrationResponse = await startRegistration(enrollData.webauthn)

            // 3. Verificar en Supabase
            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId: enrollData.id,
                challengeId: enrollData.id, // En WebAuthn el enrollData.id sirve como contexto
                webauthn: registrationResponse as any // Forzar tipo ya que startRegistration devuelve el formato exacto esperado
            })

            if (verifyError) throw verifyError

            toast.success('¡Huella Digital Registrada!', {
                description: 'Ahora puedes iniciar sesión sin contraseñas.',
            })
            setShowBanner(false)
            router.refresh()
        } catch (err: any) {
            if (err.name === 'NotAllowedError') {
                toast.error('Operación cancelada o tiempo agotado.')
            } else {
                console.error("Error registrando Passkey:", err)
                toast.error('No se pudo registrar la huella', {
                    description: err.message || 'Tu dispositivo puede no ser compatible.',
                })
            }
        } finally {
            setLoading(false)
        }
    }

    if (checking || !showBanner) return null

    return (
        <div className="bg-white border text-gray-800 px-4 py-3 shadow-sm rounded-xl mb-6 mx-4 sm:mx-0 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center space-x-3">
                <div className="bg-[#F26522]/10 p-2 rounded-full">
                    <Fingerprint className="h-5 w-5 text-[#F26522]" />
                </div>
                <div>
                    <p className="text-sm font-medium">Inicia sesión más rápido</p>
                    <p className="text-xs text-gray-500">Agrega tu huella digital o FaceID para no usar contraseñas.</p>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <button
                    onClick={enrollPasskey}
                    disabled={loading}
                    className="text-xs font-semibold bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition active:scale-95 disabled:opacity-50 flex items-center"
                >
                    {loading ? 'Activando...' : 'Agregar Huella'}
                </button>
                <button
                    onClick={() => setShowBanner(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
