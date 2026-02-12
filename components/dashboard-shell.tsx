"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { DashboardNav } from "@/components/dashboard-nav"
import { MobileNav } from "@/components/mobile-nav"
import { AlertasNotificaciones } from "@/components/alertas-notificaciones"
import { ThemeToggle } from "@/components/theme-toggle"
import { createClient } from "@/lib/supabase-client"
import Image from "next/image"

interface DashboardShellProps {
  children: React.ReactNode
  userDetails?: {
    rol: string
    email: string
  }
}

// IMPORTANTE: Usando exportación nombrada para mantener consistencia en toda la aplicación
// Esta exportación debe ser nombrada para evitar problemas con las importaciones existentes
export function DashboardShell({ children, userDetails }: DashboardShellProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [colorPerfil, setColorPerfil] = useState<string>('#3498db')

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!userDetails?.email) return

        const supabase = createClient()
        if (!supabase) return

        // buscar por email (no por supabase auth id)
        const { data: userData } = await supabase
          .from('usuarios')
          .select('id, color_perfil')
          .eq('email', userDetails.email)
          .maybeSingle()

        if (userData) {
          setUserId(userData.id)
          if (userData.color_perfil) setColorPerfil(userData.color_perfil)
        }
      } catch (error) {
        console.error('spc: error en dashboard shell', error)
      }
    }

    fetchUserProfile()
  }, [userDetails?.email])

  return (
    <div
      className="flex min-h-screen flex-col"
      // Suprimir advertencias de hidratación causadas por extensiones del navegador
      suppressHydrationWarning
    >
      {/* Navegación móvil - visible solo en pantallas pequeñas */}
      <MobileNav userDetails={userDetails} colorPerfil={colorPerfil} />

      <div className="flex flex-1" suppressHydrationWarning>
        {/* Navegación de escritorio - visible solo en pantallas md y superiores */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-background border-r">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center mb-2">
                <div className="flex-1 flex flex-col items-center gap-1">
                  <Image
                    src="/spc-logo-navbar.png"
                    alt="SPC"
                    width={135}
                    height={45}
                    priority
                    className="object-contain h-11 w-auto"
                  />
                  <p className="text-[10px] text-muted-foreground/50">{userDetails?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <ThemeToggle />
                {userId && <AlertasNotificaciones userId={userId} />}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <DashboardNav
                userRole={userDetails?.rol}
                userEmail={userDetails?.email}
                colorPerfil={colorPerfil}
              />
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="md:pl-64 flex-1">
          <main className="flex-1">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
