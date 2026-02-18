"use client"

import React, { useEffect, useState } from "react"
import { Toaster } from "sonner"
import { DashboardShell } from "@/components/dashboard-shell"
import { createClient } from "@/lib/supabase-client"
import { AIAssistantGroq } from "@/components/ai-assistant-groq"
import { useSession, useUser, useDescope } from "@descope/nextjs-sdk/client"
import { Button } from "@/components/ui/button"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const ENABLE_AI_ASSISTANT = false

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [loading, setLoading] = useState(true)
  const [userDetails, setUserDetails] = useState<any>(null)
  const { isAuthenticated, isSessionLoading } = useSession()
  const { user: descopeUser, isUserLoading } = useUser()
  const sdk = useDescope()

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

        // buscar usuario por email de descope
        if (descopeUser) {
          // Solo loguear si hay algo util para debug pero reducir el ruido
          // console.log('spc: descopeUser object', descopeUser)
        }

        let email = descopeUser?.email?.toLowerCase().trim()
        if (!email && descopeUser?.loginIds && descopeUser.loginIds.length > 0) {
          email = descopeUser.loginIds[0].toLowerCase().trim()
        }

        if (!email) {
          // console.log('spc: esperando email de descope...')
          setLoading(false)
          return
        }

        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("*")
          .ilike("email", email)
          .limit(1)
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
  }, [isSessionLoading, isUserLoading, isAuthenticated, descopeUser])

  // skeleton mientras descope carga la sesion o buscamos datos del usuario
  if (isSessionLoading || isUserLoading || loading) {
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

  // Si termino de cargar session y user, pero no tenemos usuario valido o email
  // Mostramos boton de salir para evitar loop infinito
  if (!isSessionLoading && !isUserLoading && !loading && (!descopeUser || !userDetails)) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col p-4">
        <div className="bg-red-50 text-red-800 p-6 rounded-lg shadow-md max-w-md text-center">
          <h2 className="text-lg font-bold mb-2">Error de Sesión</h2>
          <p className="mb-4">No se pudo cargar la información del usuario.</p>
          <div className="text-xs text-left bg-gray-100 p-2 rounded mb-4 overflow-auto max-h-32">
            DEBUG: User={descopeUser ? 'OK' : 'NULL'}, Email={descopeUser?.email || 'NULL'}
          </div>
          <Button
            onClick={async () => {
              await sdk.logout()
              window.location.href = '/login'
            }}
            variant="destructive"
          >
            Cerrar Sesión y Reintentar
          </Button>
        </div>
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
