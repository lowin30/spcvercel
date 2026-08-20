"use client"

import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save } from "lucide-react"
import { sanitizeText } from "@/lib/utils"

interface AdminFormProps {
  initialData?: { nombre?: string; telefono?: string; estado?: string }
  isChatVariant?: boolean
  onSuccess?: () => void
}

export function AdminForm({ initialData, isChatVariant = false, onSuccess }: AdminFormProps = {}) {
  const [nombre, setNombre] = useState(initialData?.nombre || "")
  const [telefono, setTelefono] = useState(initialData?.telefono || "")
  const [estado, setEstado] = useState(initialData?.estado || "activo")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim() || !telefono.trim()) {
      toast.error("Por favor completa los campos requeridos")
      return
    }

    // Sanitizar teléfono para permitir formatos WhatsApp como "+54 9 11 3082-0608"
    const digitsOnly = telefono.replace(/[^0-9]/g, "")

    // Validar que queden entre 8 y 15 dígitos
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      toast.error("El teléfono debe contener entre 8 y 15 números")
      return
    }

    setIsSubmitting(true)

    try {
      const cleanedNombre = sanitizeText(nombre)

      const { data, error } = await supabase
        .from("administradores")
        .insert({
          nombre: cleanedNombre,
          telefono: digitsOnly,
          estado,
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      toast.success("Administrador creado correctamente")

      if (isChatVariant && onSuccess) {
        onSuccess()
      } else {
        router.push(`/dashboard/administradores/${data.id}`)
        router.refresh()
      }
    } catch (error: any) {
      console.error("Error al crear administrador:", error)
      toast.error(error?.message || "No se pudo crear el administrador")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre *</Label>
        <Input
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="NOMBRE DEL ADMINISTRADOR"
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
          placeholder="+54 9 11 3082-0608"
          required
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">Podés pegar directamente tu número de WhatsApp (ej: +54 9 11 3082-0608)</p>
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
    </>
  )

  if (isChatVariant) {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        {formFields}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSubmitting ? "Guardando..." : "Crear Admin"}
        </Button>
      </form>
    )
  }

  return (
    <div className="pb-32">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del Administrador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formFields}
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
