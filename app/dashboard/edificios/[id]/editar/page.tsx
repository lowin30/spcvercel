"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { EditBuildingForm } from "@/components/edit-building-form"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function EditarEdificioPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  
  const [edificio, setEdificio] = useState<any>(null)
  const [administradores, setAdministradores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Verificar sesión del usuario
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        // Obtener el edificio
        const { data: edificioData, error: edificioError } = await supabase
          .from("edificios")
          .select("*")
          .eq("id", id)
          .single()

        if (edificioError) {
          console.error("Error al obtener edificio:", edificioError)
          setError("No se pudo cargar la información del edificio")
          return
        }

        if (!edificioData) {
          router.push("/dashboard/edificios")
          return
        }
        
        setEdificio(edificioData)

        // Obtener los administradores
        const { data: administradoresData, error: administradoresError } = await supabase
          .from("administradores")
          .select("id, nombre")
          .eq("estado", "activo")
          .order("nombre", { ascending: true })

        if (administradoresError) {
          console.error("Error al obtener administradores:", administradoresError)
          // No es un error crítico, continuamos con la lista vacía
        } else {
          setAdministradores(administradoresData || [])
        }
        
      } catch (err) {
        console.error("Error inesperado:", err)
        setError("Ocurrió un error al cargar la información")
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [id, router, supabase])

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando datos del edificio...</p>
        </div>
      </div>
    )
  }
  
  if (error || !edificio) {
    return (
      <div className="container mx-auto p-4">
        <div className="rounded-md bg-destructive/15 p-4 text-center">
          <p className="text-destructive">{error || "No se pudo cargar la información del edificio"}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/edificios')}>
            Volver a edificios
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Editar Edificio</h1>
      <EditBuildingForm edificio={edificio} administradores={administradores || []} />
    </div>
  )
}
