"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase-client"

interface Trabajador {
  id: string
  email: string
  code: string
}

interface ConfigurarTrabajadorFormProps {
  trabajadores: Trabajador[]
}

export function ConfigurarTrabajadorForm({ trabajadores }: ConfigurarTrabajadorFormProps) {
  const [selectedTrabajador, setSelectedTrabajador] = useState("")
  const [salarioDiario, setSalarioDiario] = useState("")
  const [activo, setActivo] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTrabajador || !salarioDiario) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.from("configuracion_trabajadores").upsert({
        id_trabajador: selectedTrabajador,
        salario_diario: Number.parseInt(salarioDiario),
        activo: activo,
      })

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Configuración de trabajador guardada correctamente",
      })

      router.push("/dashboard/trabajadores")
      router.refresh()
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="trabajador">Trabajador</Label>
        <Select value={selectedTrabajador} onValueChange={setSelectedTrabajador}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un trabajador" />
          </SelectTrigger>
          <SelectContent>
            {trabajadores.map((trabajador) => (
              <SelectItem key={trabajador.id} value={trabajador.id}>
                {trabajador.email} ({trabajador.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="salario">Salario Diario</Label>
        <Input
          id="salario"
          type="number"
          placeholder="35000"
          value={salarioDiario}
          onChange={(e) => setSalarioDiario(e.target.value)}
          required
        />
        <p className="text-sm text-muted-foreground">Ingresa el salario diario en pesos (sin puntos ni comas)</p>
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="activo" checked={activo} onCheckedChange={setActivo} />
        <Label htmlFor="activo">Trabajador activo</Label>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Guardando..." : "Guardar Configuración"}
      </Button>
    </form>
  )
}
