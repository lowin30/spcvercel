"use client"

import type React from "react"

import { useState } from "react"
import { useSupabase } from "@/lib/supabase-provider"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save } from "lucide-react"

export function AdminForm() {
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [estado, setEstado] = useState("activo")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { supabase } = useSupabase()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim() || !telefono.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa los campos requeridos",
        variant: "destructive",
      })
      return
    }

    // Validar formato de teléfono
    if (!/^[0-9]{10,15}$/.test(telefono)) {
      toast({
        title: "Error",
        description: "El teléfono debe contener entre 10 y 15 dígitos numéricos",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const { data, error } = await supabase
        .from("administradores")
        .insert({
          nombre,
          telefono,
          estado,
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: "Administrador creado",
        description: "El administrador ha sido creado correctamente",
      })

      router.push(`/dashboard/administradores/${data.id}`)
    } catch (error) {
      console.error("Error al crear administrador:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el administrador",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="pb-32">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del Administrador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del administrador o consorcio"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input
                id="telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="1155667788"
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">Ingresa solo números (entre 10 y 15 dígitos)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select value={estado} onValueChange={setEstado} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button type="submit" disabled={isSubmitting} size="lg" className="w-full max-w-md py-6 text-lg">
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              {isSubmitting ? "Guardando..." : "Guardar Administrador"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
