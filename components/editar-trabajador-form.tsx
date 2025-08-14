"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

interface EditarTrabajadorFormProps {
  trabajadorId: string
}

export function EditarTrabajadorForm({ trabajadorId }: EditarTrabajadorFormProps) {
  const [salarioDiario, setSalarioDiario] = useState("")
  const [activo, setActivo] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [trabajador, setTrabajador] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  // Cargar datos del trabajador
  useEffect(() => {
    async function loadTrabajadorData() {
      try {
        setIsLoadingData(true)
        setError(null)

        // Obtener datos del usuario/trabajador
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("*, configuracion_trabajadores(salario_diario, activo)")
          .eq("id", trabajadorId)
          .single()

        if (userError || !userData) {
          setError("Error al cargar los datos del trabajador")
          console.error("Error al cargar datos:", userError)
          return
        }

        setTrabajador(userData)
        
        // Si hay configuración, establecer los valores iniciales
        const configTrabajador = userData.configuracion_trabajadores as any
        if (configTrabajador) {
          setSalarioDiario(configTrabajador.salario_diario?.toString() || "")
          setActivo(configTrabajador.activo || false)
        }
      } catch (err) {
        console.error("Error inesperado:", err)
        setError("Ocurrió un error inesperado")
      } finally {
        setIsLoadingData(false)
      }
    }

    if (trabajadorId) {
      loadTrabajadorData()
    }
  }, [trabajadorId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!salarioDiario) {
      toast({
        title: "Error",
        description: "Por favor completa el salario diario",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Actualizar o crear configuración de trabajador
      // Usando any para evitar problemas de tipos con Supabase
      const supabaseAny = supabase as any
      const { error } = await supabaseAny.from("configuracion_trabajadores").upsert({
        id_trabajador: trabajadorId,
        salario_diario: Number.parseInt(salarioDiario),
        activo: activo,
      })

      if (error) {
        throw error
      }

      toast({
        title: "¡Configuración actualizada!",
        description: "La configuración del trabajador ha sido actualizada correctamente",
      })

      // Forzar recarga completa para obtener datos actualizados desde la base de datos
      // Agregamos el parámetro refresh=true para indicar que venimos de una edición exitosa
      window.location.href = "/dashboard/configuracion?tab=trabajadores&refresh=true"
    } catch (error: any) {
      console.error("Error al actualizar:", error)
      toast({
        title: "Error",
        description: `No se pudo actualizar la configuración: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !trabajador) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{error || "No se encontró el trabajador"}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/dashboard/configuracion?tab=trabajadores">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a trabajadores
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar Trabajador</CardTitle>
        <CardDescription>
          Configuración para {trabajador.email || "trabajador"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={trabajador.email || ""} disabled />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="salario">Salario diario</Label>
            <Input
              id="salario"
              type="number"
              value={salarioDiario}
              onChange={(e) => setSalarioDiario(e.target.value)}
              placeholder="Ingrese el salario diario"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="activo"
              checked={activo}
              onCheckedChange={setActivo}
            />
            <Label htmlFor="activo">Trabajador activo</Label>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/dashboard/configuracion?tab=trabajadores">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancelar
            </Link>
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
