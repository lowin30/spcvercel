"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Moon, Sun, Monitor, Type } from "lucide-react"
import { cn } from "@/lib/utils"

export function AparienciaTab() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [colorPrimario, setColorPrimario] = useState<string>('blue')

  const coloresPrimarios = [
    { name: 'Azul', value: 'blue', class: 'bg-blue-600' },
    { name: 'Verde', value: 'green', class: 'bg-green-600' },
    { name: 'Púrpura', value: 'purple', class: 'bg-purple-600' },
    { name: 'Naranja', value: 'orange', class: 'bg-orange-600' },
    { name: 'Rojo', value: 'red', class: 'bg-red-600' },
    { name: 'Índigo', value: 'indigo', class: 'bg-indigo-600' }
  ]

  // Cargar preferencias guardadas
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme-mode') as 'light' | 'dark' | 'system' | null
    const savedFontSize = localStorage.getItem('font-size') as 'small' | 'medium' | 'large' | null
    const savedColor = localStorage.getItem('primary-color')

    if (savedTheme) setTheme(savedTheme)
    if (savedFontSize) setFontSize(savedFontSize)
    if (savedColor) setColorPrimario(savedColor)

    // Aplicar tema actual
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
    root.classList.remove('text-small', 'text-medium', 'text-large')
    
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
  }

  const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
    setFontSize(size)
    localStorage.setItem('font-size', size)
    applyFontSize(size)
  }

  const handleColorChange = (color: string) => {
    setColorPrimario(color)
    localStorage.setItem('primary-color', color)
    // Nota: Para cambiar el color primario necesitarías CSS variables o Tailwind con configuración dinámica
  }

  return (
    <div className="space-y-4">
      {/* Tema */}
      <Card>
        <CardHeader>
          <CardTitle>Tema de la Aplicación</CardTitle>
          <CardDescription>Elige entre modo claro, oscuro o automático</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selector visual de tema */}
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => handleThemeChange('light')}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-primary",
                theme === 'light' ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <Sun className="h-6 w-6" />
              <span className="text-sm font-medium">Claro</span>
            </button>
            
            <button
              onClick={() => handleThemeChange('dark')}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-primary",
                theme === 'dark' ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <Moon className="h-6 w-6" />
              <span className="text-sm font-medium">Oscuro</span>
            </button>
            
            <button
              onClick={() => handleThemeChange('system')}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-primary",
                theme === 'system' ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <Monitor className="h-6 w-6" />
              <span className="text-sm font-medium">Sistema</span>
            </button>
          </div>

          {/* Switch alternativo */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label>Modo Oscuro</Label>
              <p className="text-sm text-muted-foreground">Activar manualmente el modo oscuro</p>
            </div>
            <Switch 
              checked={theme === 'dark'}
              onCheckedChange={(checked) => handleThemeChange(checked ? 'dark' : 'light')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tamaño de texto */}
      <Card>
        <CardHeader>
          <CardTitle>Tamaño de Texto</CardTitle>
          <CardDescription>Ajusta el tamaño de la fuente para mejor legibilidad</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Type className="h-5 w-5 text-muted-foreground" />
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
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground mb-2">Vista previa:</p>
              <p style={{ fontSize: fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px' }}>
                Este es un ejemplo de texto con el tamaño seleccionado. Los cambios se aplican a toda la aplicación.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color primario (próximamente) */}
      <Card>
        <CardHeader>
          <CardTitle>Color Principal</CardTitle>
          <CardDescription>Personaliza el color de acento de la aplicación</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {coloresPrimarios.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorChange(color.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all hover:scale-105",
                    colorPrimario === color.value ? "border-primary scale-105" : "border-border"
                  )}
                >
                  <div className={cn("h-10 w-10 rounded-full", color.class)} />
                  <span className="text-xs font-medium">{color.name}</span>
                </button>
              ))}
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>⚠️ Nota:</strong> Los cambios de color se guardan pero requieren configuración adicional en el sistema para aplicarse completamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Preferencias Guardadas</CardTitle>
          <CardDescription>Tus preferencias se guardan en tu navegador</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tema actual:</span>
              <span className="font-medium">{theme === 'light' ? 'Claro' : theme === 'dark' ? 'Oscuro' : 'Sistema'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tamaño de texto:</span>
              <span className="font-medium">{fontSize === 'small' ? 'Pequeño' : fontSize === 'large' ? 'Grande' : 'Medio'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Color principal:</span>
              <span className="font-medium capitalize">{colorPrimario}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
