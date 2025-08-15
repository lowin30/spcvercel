"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { DashboardNav } from "@/components/dashboard-nav"
import { MobileNav } from "@/components/mobile-nav"
import { AlertasNotificaciones } from "@/components/alertas-notificaciones"
import { getSupabaseClient } from "@/lib/supabase-client"

interface DashboardShellProps {
  children: React.ReactNode
  userDetails?: {
    rol: string
    email: string
  }
}

// Cambiado a exportación por defecto para resolver problemas de compilación
export function DashboardShell({ children, userDetails }: DashboardShellProps) {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserId = async () => {
      const supabase = getSupabaseClient()
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setUserId(data.session.user.id)
      }
    }

    fetchUserId()
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navegación móvil - visible solo en pantallas pequeñas */}
      <MobileNav userDetails={userDetails} />

      <div className="flex flex-1">
        {/* Navegación de escritorio - visible solo en pantallas md y superiores */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-background border-r">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h1 className="font-bold text-xl">SPC Sistema</h1>
                <p className="text-sm text-muted-foreground">{userDetails?.email}</p>
              </div>
              <div>{userId && <AlertasNotificaciones userId={userId} />}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <DashboardNav userRole={userDetails?.rol} />
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
