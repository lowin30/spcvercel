"use client"

import React, { useEffect, useState, Suspense } from "react"
import { Toaster } from "sonner"
import { DashboardShell } from "@/components/dashboard-shell"
import { createClient } from "@/lib/supabase-client"
import { AIAssistantGroq } from "@/components/ai-assistant-groq"
import { MicroTareaTool } from "@/components/platinum/tools/microtareas/MicroTareaTool"
import { MicroTareaFAB } from "@/components/platinum/tools/microtareas/MicroTareaFAB"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const ENABLE_AI_ASSISTANT = false

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [userDetails, setUserDetails] = useState<any>(null)

  // v830: carga best-effort del perfil para alimentar el shell visual.
  // el server (page.tsx) ya valida la sesion, este efecto es solo para el menu.
  // si falla o tarda, los children siempre se muestran igualmente.
  useEffect(() => {
    async function fetchUserDetails() {
      try {
        const supabase = createClient()
        if (!supabase) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", user.id)
          .single()

        if (userData) setUserDetails(userData)
      } catch {
        // silencioso: el server ya valida, este fetch es decorativo
      }
    }

    fetchUserDetails()
  }, [])

  // v830: ya no bloqueamos en loading ni en null-user.
  // el server renderizo el contenido, el layout solo envuelve.
  return (
    <>
      <DashboardShell userDetails={userDetails}>
        <React.Fragment key="dashboard-main-content">
          {children}
        </React.Fragment>
        {ENABLE_AI_ASSISTANT && userDetails?.rol !== 'sin_rol' && (
          <AIAssistantGroq key="ai-assistant-component" />
        )}
      </DashboardShell>
      <Suspense fallback={null}>
        <MicroTareaTool />
        <MicroTareaFAB />
      </Suspense>
      <Toaster />
    </>
  )
}
