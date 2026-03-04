"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Moon, Sun, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { actualizarPreferenciasUsuario } from "@/app/actions/perfil-actions"
import { useToast } from "@/components/ui/use-toast"

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = async () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'

    // 1. Cambiar tema via next-themes (maneja DOM + localStorage automaticamente)
    setTheme(newTheme)

    // Sync legacy localStorage key para compatibilidad con apariencia-tab
    localStorage.setItem('theme-mode', newTheme)

    // 2. Persistir en DB (Background)
    setIsUpdating(true)
    try {
      const result = await actualizarPreferenciasUsuario({ tema: newTheme })
      if (!result.ok) {
        console.warn("No se pudo persistir el tema en la DB, pero se aplico localmente.")
      }
    } catch (err) {
      console.error("Error al guardar tema:", err)
    } finally {
      setIsUpdating(false)
    }
  }

  if (!mounted) {
    return <div className="w-9 h-9" />
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative hover:bg-primary/10 transition-colors"
      disabled={isUpdating}
      title={resolvedTheme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
      {isUpdating && (
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
      )}
    </Button>
  )
}
