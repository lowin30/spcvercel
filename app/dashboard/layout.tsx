"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Toaster } from "sonner"
import { DashboardShell } from "@/components/dashboard-shell"
import { createClient } from "@/lib/supabase-client"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userDetails, setUserDetails] = useState<any>(null)

  useEffect(() => {
    // Función para comprobar la autenticación y obtener los detalles del usuario
    async function checkAuthAndGetDetails() {
      try {
        const supabase = createClient()
        if (!supabase) {
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            setLoading(false)
            return
          }
          router.push("/login")
          return
        }

        // Verificar si hay una sesión activa
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          // Redirección silenciosa sin mensajes de error en consola
          router.push("/login")
          return
        }

        // Obtener detalles del usuario desde la tabla usuarios
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", session.user.id)
          .single()

        if (userError || !userData) {
          console.error("[DashboardLayout] Error al obtener detalles del usuario:", userError)
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            setLoading(false)
            return
          }
          router.push("/login")
          return
        }

        // Si el usuario tiene rol "sin_rol", redirigir a la página de espera
        if (userData.rol === "sin_rol") {
          router.push("/dashboard/esperando-rol")
          return
        }

        // Guardar los detalles del usuario en el estado
        setUserDetails(userData)
        setLoading(false)
      } catch (error) {
        console.error("Error al verificar autenticación:", error)
        router.push("/login")
      }
    }

    checkAuthAndGetDetails()
  }, [router])

  // Mostrar un indicador de carga mientras se verifica la autenticación
  if (loading) {
    // Añadimos suppressHydrationWarning para evitar el error de hidratación 
    // relacionado con las extensiones del navegador
    return (
      <div 
        className="flex min-h-screen items-center justify-center" 
        suppressHydrationWarning
      >
        <div className="text-center">
          <div className="mb-4 text-2xl font-bold">Cargando...</div>
          <div className="text-gray-500">Verificando autenticación</div>
        </div>
      </div>
    )
  }

  // Renderizar el dashboard una vez que tenemos los detalles del usuario
  return (
    // Usamos suppressHydrationWarning para evitar errores de hidratación
    // causados por extensiones del navegador
    <div suppressHydrationWarning>
      <DashboardShell userDetails={userDetails}>
        {children}
        <Toaster />
      </DashboardShell>
    </div>
  )
}
