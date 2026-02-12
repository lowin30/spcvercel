"use client"

import React, { useEffect, useState } from "react"
import { Toaster } from "sonner"
import { DashboardShell } from "@/components/dashboard-shell"
import { createClient } from "@/lib/supabase-client"
import { AIAssistantGroq } from "@/components/ai-assistant-groq"
import { useSession, useUser } from "@descope/nextjs-sdk/client"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const ENABLE_AI_ASSISTANT = false

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [loading, setLoading] = useState(true)
  const [userDetails, setUserDetails] = useState<any>(null)
  const { isAuthenticated, isSessionLoading } = useSession()
  const { user: descopeUser } = useUser()

  useEffect(() => {
    // esperar a que descope termine de cargar la sesion
    if (isSessionLoading) return

    // si no esta autenticado, el middleware ya se encarga de redirigir
    // no hacemos router.push('/login') para evitar bucles
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    async function fetchUserDetails() {
      try {
        const supabase = createClient()
        if (!supabase) {
          console.error('spc: no se pudo inicializar supabase client')
          setLoading(false)
          return
        }

        // buscar usuario por email de descope (no por supabase auth)
        const email = descopeUser?.email?.toLowerCase().trim()
        if (!email) {
          console.log('spc: esperando email de descope...')
          setLoading(false)
          return
        }

        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("*")
          .eq("email", email)
          .maybeSingle()

        if (userError) {
          console.error('spc: error obteniendo usuario', userError.message)
          setLoading(false)
          return
        }

        if (!userData) {
          console.log('spc: usuario no encontrado en tabla local, sync pendiente')
          setLoading(false)
          return
        }

        setUserDetails(userData)
        setLoading(false)
      } catch (err) {
        console.error('spc: error en dashboard layout', err)
        setLoading(false)
      }
    }

    fetchUserDetails()
  }, [isSessionLoading, isAuthenticated, descopeUser?.email])

  // skeleton mientras descope carga la sesion o buscamos datos del usuario
  if (isSessionLoading || loading) {
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

  // si no esta autenticado, mostrar mensaje (middleware redirigira)
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center text-gray-500">redirigiendo al login...</div>
      </div>
    )
  }

  return (
    <>
      <DashboardShell userDetails={userDetails}>
        {children}
        {ENABLE_AI_ASSISTANT && userDetails && userDetails.rol !== 'sin_rol' && <AIAssistantGroq />}
      </DashboardShell>
      <Toaster />
    </>
  )
}
