"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { BuildingWizard } from "@/components/buildings/building-wizard"
import { DepartmentManager } from "@/components/buildings/department-manager"
import { createClient } from "@/lib/supabase-client"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function EditarEdificioPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter()
  const supabase = createClient()

  const [edificio, setEdificio] = useState<any>(null)
  const [administradores, setAdministradores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // 1. Verificar sesión del usuario y obtener JWT payload
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        // 🛡️ SEGUNDA BARRERA: Extracción del Rol desde el JWT Claim
        const access_token = session.access_token
        const payload = JSON.parse(atob(access_token.split('.')[1]))
        const userRol = payload.user_metadata?.rol || 'trabajador' // fallback seguro

        if (userRol === 'trabajador') {
          console.warn(`[SEGUNDA BARRERA] Acceso denegado a Edición para Trabajador (${session.user.email})`)
          router.push('/dashboard/edificios')
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
    <div className="container mx-auto p-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-6">Editar Edificio</h1>
        <BuildingWizard
          administradores={administradores || []}
          mode="edit"
          initialData={edificio}
        />
      </div>

      <div>
        <DepartmentManager buildingId={edificio.id} />
      </div>
    </div>
  )
}
