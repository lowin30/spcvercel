"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase-client"

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [loading, setLoading] = useState(true)

  // Cargar preferencias del usuario
  useEffect(() => {
    async function loadUserPreferences() {
      const supabase = createClient()
      if (!supabase) {
        const savedTheme = localStorage.getItem('theme-mode') as 'light' | 'dark' | null
        const currentTheme = savedTheme || 'light'
        setTheme(currentTheme)
        applyTheme(currentTheme)
        setLoading(false)
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          // Si no hay usuario autenticado, usar localStorage
          const savedTheme = localStorage.getItem('theme-mode') as 'light' | 'dark' | null
          const currentTheme = savedTheme || 'light'
          setTheme(currentTheme)
          applyTheme(currentTheme)
          setLoading(false)
          return
        }

        // Cargar preferencias desde BD
        const { data: prefs } = await supabase
          .from('preferencias_usuarios')
          .select('tema')
          .eq('id_usuario', user.id)
          .maybeSingle()

        let currentTheme: 'light' | 'dark' = 'light'
        
        if (prefs?.tema) {
          if (prefs.tema === 'system') {
            // Si es system, detectar preferencia del sistema
            currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
          } else {
            currentTheme = prefs.tema as 'light' | 'dark'
          }
        } else {
          // Si no hay preferencias, usar localStorage
          const savedTheme = localStorage.getItem('theme-mode') as 'light' | 'dark' | null
          currentTheme = savedTheme || 'light'
        }

        setTheme(currentTheme)
        applyTheme(currentTheme)
        
        // Sincronizar con localStorage como fallback
        localStorage.setItem('theme-mode', currentTheme)
      } catch (error) {
        console.error('Error al cargar preferencias:', error)
        // Fallback a localStorage
        const savedTheme = localStorage.getItem('theme-mode') as 'light' | 'dark' | null
        const currentTheme = savedTheme || 'light'
        setTheme(currentTheme)
        applyTheme(currentTheme)
      } finally {
        setLoading(false)
      }
    }

    loadUserPreferences()
  }, [])

  const applyTheme = (newTheme: 'light' | 'dark') => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(newTheme)
  }

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    applyTheme(newTheme)
    
    // Guardar en localStorage inmediatamente (UX rápida)
    localStorage.setItem('theme-mode', newTheme)

    // Guardar en BD en background (no bloqueante)
    const supabase = createClient()
    if (!supabase) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Upsert en BD (crea o actualiza)
      await supabase
        .from('preferencias_usuarios')
        .upsert({
          id_usuario: user.id,
          tema: newTheme,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id_usuario'
        })
      
      // No mostrar toast, cambio silencioso
    } catch (error) {
      console.error('Error al guardar tema en BD:', error)
      // No importa si falla, ya está guardado en localStorage
    }
  }

  if (loading) {
    return (
      <div className="w-9 h-9 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative"
      title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
