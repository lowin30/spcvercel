"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase-singleton"
import { useRouter } from "next/navigation"

export default function DashboardBridgePage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Comprobar si el usuario está autenticado del lado del cliente
    async function checkAuth() {
      try {
        setLoading(true)
        const supabase = getSupabaseClient()
        
        // Si no se pudo crear el cliente, mostrar error
        if (!supabase) {
          setError("No se pudo inicializar Supabase")
          setLoading(false)
          return
        }

        // Comprobar si hay una sesión activa
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error("Error al verificar la sesión:", error)
          setError("Error al verificar la sesión")
          setLoading(false)
          return
        }

        if (!data || !data.session) {
          // No hay sesión, redirigir al login
          router.push("/login")
          return
        }

        // Hay sesión, redirigir al dashboard
        router.push("/dashboard")
      } catch (err) {
        console.error("Error inesperado:", err)
        setError("Error inesperado al verificar la autenticación")
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-2xl font-bold">Cargando...</div>
          <div className="text-gray-500">Verificando autenticación</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-red-50 p-8 text-center shadow-lg">
          <div className="mb-4 text-xl font-bold text-red-600">Error</div>
          <div className="mb-6 text-gray-700">{error}</div>
          <button
            onClick={() => router.push("/login")}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Ir al login
          </button>
        </div>
      </div>
    )
  }

  return null
}
