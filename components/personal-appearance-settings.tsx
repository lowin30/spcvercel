"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Moon, Sun, Monitor, Type, Palette } from "lucide-react"
import { cn } from "@/lib/utils"
// import { createClient } from "@/lib/supabase-client" // Removed: Client-side write fails due to RLS
import { useToast } from "@/components/ui/use-toast"
import { actualizarAparienciaUsuario } from "@/app/actions/perfil-actions"

interface PersonalAppearanceSettingsProps {
  userId: string
  initialColorPerfil?: string
}

export function PersonalAppearanceSettings({ userId, initialColorPerfil }: PersonalAppearanceSettingsProps) {
  const router = useRouter()
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [colorPerfil, setColorPerfil] = useState<string>(initialColorPerfil || '#3498db')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  // const supabase = createClient() // Removed

  const coloresPerfil = [
    { name: 'Azul', value: '#3498db', class: 'bg-blue-600' },
    { name: 'Verde', value: '#10b981', class: 'bg-green-600' },
    { name: 'Púrpura', value: '#9333ea', class: 'bg-purple-600' },
    { name: 'Naranja', value: '#f97316', class: 'bg-orange-600' },
    { name: 'Rojo', value: '#ef4444', class: 'bg-red-600' },
    { name: 'Índigo', value: '#6366f1', class: 'bg-indigo-600' },
    { name: 'Rosa', value: '#ec4899', class: 'bg-pink-600' },
    { name: 'Amarillo', value: '#eab308', class: 'bg-yellow-600' },
  ]

  // Cargar preferencias guardadas
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme-mode') as 'light' | 'dark' | 'system' | null
    const savedFontSize = localStorage.getItem('font-size') as 'small' | 'medium' | 'large' | null

    if (savedTheme) setTheme(savedTheme)
    if (savedFontSize) setFontSize(savedFontSize)

    // Aplicar preferencias actuales
    applyTheme(savedTheme || 'system')
    applyFontSize(savedFontSize || 'medium')
  }, [])

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement

    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.remove('light', 'dark')
      root.classList.add(systemTheme)
    } else {
      root.classList.remove('light', 'dark')
      root.classList.add(newTheme)
    }
  }

  const applyFontSize = (size: 'small' | 'medium' | 'large') => {
    const root = document.documentElement

    switch (size) {
      case 'small':
        root.style.fontSize = '14px'
        break
      case 'medium':
        root.style.fontSize = '16px'
        break
      case 'large':
        root.style.fontSize = '18px'
        break
    }
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    localStorage.setItem('theme-mode', newTheme)
    applyTheme(newTheme)

    toast({
      title: "Tema actualizado",
      description: "El tema se ha aplicado correctamente",
    })
  }

  const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
    setFontSize(size)
    localStorage.setItem('font-size', size)
    applyFontSize(size)

    toast({
      title: "Tamaño de texto actualizado",
      description: "El tamaño se ha aplicado correctamente",
    })
  }

  const handleColorPerfilChange = async (color: string) => {
    // 1. Optimistic Update (UI changes immediately)
    const previousColor = colorPerfil
    setColorPerfil(color)
    setSaving(true)

    try {
      // 2. Server Action Call (Write-Back Bridge)
      const result = await actualizarAparienciaUsuario(color)

      if (!result.ok) {
        throw new Error(result.error || "Error al guardar color")
      }

      toast({
        title: "Color de perfil actualizado",
        description: "Tu color de perfil se ha guardado correctamente",
      })

      // 3. Sync Server State (optional but good for consistency)
      router.refresh()

    } catch (err: any) {
      console.error("Error inesperado:", err)
      // 4. Revert Optimistic Update
      setColorPerfil(previousColor)

      toast({
        title: "Error",
        description: err.message || "Error inesperado al guardar el color",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Tema de la Aplicación
          </CardTitle>
          <CardDescription>Elige entre modo claro, oscuro o automático</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selector visual de tema */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleThemeChange('light')}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border-2 p-3 md:p-4 transition-all hover:border-primary",
                theme === 'light' ? "border-primary bg-primary/5" : "border-border"
              )}
              disabled={saving}
            >
              <Sun className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-xs md:text-sm font-medium">Claro</span>
            </button>

            <button
              onClick={() => handleThemeChange('dark')}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border-2 p-3 md:p-4 transition-all hover:border-primary",
                theme === 'dark' ? "border-primary bg-primary/5" : "border-border"
              )}
              disabled={saving}
            >
              <Moon className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-xs md:text-sm font-medium">Oscuro</span>
            </button>

            <button
              onClick={() => handleThemeChange('system')}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border-2 p-3 md:p-4 transition-all hover:border-primary",
                theme === 'system' ? "border-primary bg-primary/5" : "border-border"
              )}
              disabled={saving}
            >
              <Monitor className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-xs md:text-sm font-medium">Sistema</span>
            </button>
          </div>

          {/* Switch alternativo */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label>Modo Oscuro</Label>
              <p className="text-xs md:text-sm text-muted-foreground">Activar manualmente el modo oscuro</p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => handleThemeChange(checked ? 'dark' : 'light')}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tamaño de texto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Tamaño de Texto
          </CardTitle>
          <CardDescription>Ajusta el tamaño de la fuente para mejor legibilidad</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Type className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <Select value={fontSize} onValueChange={(value: any) => handleFontSizeChange(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Pequeño (14px)</SelectItem>
                  <SelectItem value="medium">Medio (16px)</SelectItem>
                  <SelectItem value="large">Grande (18px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Vista previa */}
            <div className="rounded-lg border p-3 md:p-4 bg-muted/30">
              <p className="text-xs md:text-sm text-muted-foreground mb-2">Vista previa:</p>
              <p style={{ fontSize: fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px' }}>
                Este es un ejemplo de texto con el tamaño seleccionado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color de perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color de Perfil
          </CardTitle>
          <CardDescription>Personaliza el color de tu perfil (se guarda en tu cuenta)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 md:grid-cols-4 gap-3">
              {coloresPerfil.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorPerfilChange(color.value)}
                  disabled={saving}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-2 md:p-3 transition-all hover:scale-105",
                    colorPerfil === color.value ? "border-primary scale-105 ring-2 ring-primary ring-offset-2" : "border-border",
                    saving && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className={cn("h-8 w-8 md:h-10 md:w-10 rounded-full", color.class)} />
                  <span className="text-[10px] md:text-xs font-medium">{color.name}</span>
                </button>
              ))}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs md:text-sm text-blue-800 dark:text-blue-200">
                <strong>💡 Información:</strong> El color de perfil se guarda en tu cuenta y se sincroniza en todos tus dispositivos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de preferencias */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base">Preferencias Actuales</CardTitle>
          <CardDescription className="text-xs">Resumen de tu configuración</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tema:</span>
              <span className="font-medium">
                {theme === 'light' ? '☀️ Claro' : theme === 'dark' ? '🌙 Oscuro' : '💻 Sistema'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tamaño de texto:</span>
              <span className="font-medium">
                {fontSize === 'small' ? 'Pequeño' : fontSize === 'large' ? 'Grande' : 'Medio'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Color de perfil:</span>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-4 w-4 rounded-full",
                  coloresPerfil.find(c => c.value === colorPerfil)?.class
                )} />
                <span className="font-medium capitalize">{colorPerfil}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
