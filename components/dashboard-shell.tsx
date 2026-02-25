"use client"

import type React from "react"

import { DashboardNav } from "@/components/dashboard-nav"
import { MobileNav } from "@/components/mobile-nav"
import { AlertasNotificaciones } from "@/components/alertas-notificaciones"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"

interface DashboardShellProps {
  children: React.ReactNode
  userDetails?: {
    id: string
    rol: string
    email: string
    nombre?: string
    color_perfil?: string
    preferencias?: Record<string, any>
  }
}

// IMPORTANTE: Usando exportación nombrada para mantener consistencia en toda la aplicación
// Esta exportación debe ser nombrada para evitar problemas con las importaciones existentes
export function DashboardShell({ children, userDetails }: DashboardShellProps) {
  const colorPerfil = userDetails?.color_perfil || '#3498db'
  const nombre = userDetails?.nombre || ''
  const initials = nombre
    ? nombre.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : userDetails?.email?.[0]?.toUpperCase() || '?'

  // Aplicar preferencias del usuario al montar
  if (typeof window !== 'undefined' && userDetails?.preferencias) {
    const prefs = userDetails.preferencias
    if (prefs.tema) {
      const root = document.documentElement
      if (prefs.tema === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        root.classList.remove('light', 'dark')
        root.classList.add(systemTheme)
      } else {
        root.classList.remove('light', 'dark')
        root.classList.add(prefs.tema)
      }
    }
    if (prefs.font_size) {
      const sizes: Record<string, string> = { small: '14px', medium: '16px', large: '18px' }
      document.documentElement.style.fontSize = sizes[prefs.font_size] || '16px'
    }
  }

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
                </div>
              </div>
              {/* Identidad del usuario: Avatar + Nombre + Email */}
              <div className="flex items-center gap-2.5 mt-3 px-1">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: colorPerfil }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  {nombre ? (
                    <>
                      <p className="text-sm font-medium truncate leading-tight">{nombre}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{userDetails?.email}</p>
                    </>
                  ) : (
                    <p className="text-[11px] text-muted-foreground truncate">{userDetails?.email}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <ThemeToggle />
                {userDetails?.id && <AlertasNotificaciones userId={userDetails.id} />}
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
