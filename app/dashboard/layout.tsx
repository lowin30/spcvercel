"use client"

import React, { useEffect, useState } from "react"
import { Toaster } from "sonner"
import { DashboardShell } from "@/components/dashboard-shell"
import { createClient } from "@/lib/supabase-client"
import { AIAssistantGroq } from "@/components/ai-assistant-groq"
import { Button } from "@/components/ui/button"
import { PasskeyEnroller } from "@/components/passkey-enroller"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const ENABLE_AI_ASSISTANT = false

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [loading, setLoading] = useState(true)
  const [userDetails, setUserDetails] = useState<any>(null)

  useEffect(() => {
    async function fetchUserDetails() {
      try {
        const supabase = createClient()
        if (!supabase) {
          console.error('spc: no se pudo inicializar supabase client')
          setLoading(false)
          return
        }

        // Obtener usuario actual desde Supabase Auth (App Router Nativo)
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          console.log('spc: no hay sesion activa en supabase auth')
          // El middleware redirigirá, no hacemos push manually
          setLoading(false)
          return
        }

        // Obtener datos detallados del usuario desde 'usuarios'
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", user.id)
          .single()

        if (userError || !userData) {
          console.error('spc: error obteniendo datos del usuario DB', userError?.message)
        } else {
          setUserDetails(userData)
        }

      } catch (err) {
        console.error('spc: error en dashboard layout (fetchUserDetails)', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserDetails()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mx-auto mb-2"></div>
            <div className="h-4 w-32 bg-gray-100 rounded mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  // Si termino de cargar session pero no tenemos usuario valido
  // Mostramos boton de salir
  if (!loading && !userDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col p-4">
        <div className="bg-red-50 text-red-800 p-6 rounded-lg shadow-md max-w-md text-center border border-red-200">
          <h2 className="text-lg font-bold mb-2">Acceso Denegado</h2>
          <p className="mb-4 text-sm">No pudimos validar tu acceso al sistema SPC. Puede que tu cuenta no esté registrada en la plataforma operativa.</p>
          <Button
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
            variant="destructive"
            className="w-full"
          >
            Cerrar Sesión
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <DashboardShell userDetails={userDetails}>
        <PasskeyEnroller />
        {children}
        {ENABLE_AI_ASSISTANT && userDetails && userDetails.rol !== 'sin_rol' && <AIAssistantGroq />}
      </DashboardShell>
      <Toaster />
    </>
  )
}
