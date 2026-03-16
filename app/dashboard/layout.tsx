"use client"

import React, { useEffect, useState } from "react"
import { Toaster } from "sonner"
import { DashboardShell } from "@/components/dashboard-shell"
import { createClient } from "@/lib/supabase-client"
import { AIAssistantGroq } from "@/components/ai-assistant-groq"
import { Button } from "@/components/ui/button"
import { MicroTareaTool } from "@/components/platinum/tools/microtareas/MicroTareaTool"
import { MicroTareaFAB } from "@/components/platinum/tools/microtareas/MicroTareaFAB"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const ENABLE_AI_ASSISTANT = false

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [loading, setLoading] = useState(true)
  const [userDetails, setUserDetails] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    async function fetchUserDetails() {
      try {
        const supabase = createClient()
        if (!supabase) {
          console.error('spc: no se pudo inicializar supabase client')
          setLoading(false)
          return
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          setLoading(false)
          return
        }

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

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" suppressHydrationWarning>
        <div className="text-center" suppressHydrationWarning>
          <div className="mb-4 animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mx-auto mb-2"></div>
            <div className="h-4 w-32 bg-gray-100 rounded mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

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
        <React.Fragment key="dashboard-main-content">
          {children}
        </React.Fragment>
        {ENABLE_AI_ASSISTANT && userDetails && userDetails.rol !== 'sin_rol' && (
          <AIAssistantGroq key="ai-assistant-component" />
        )}
      </DashboardShell>
      <MicroTareaTool />
      <MicroTareaFAB />
      <Toaster />
    </>
  )
}
