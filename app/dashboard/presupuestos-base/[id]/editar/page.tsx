"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import PresupuestoBaseForm from "@/components/presupuesto-base-form"
import { toast } from "@/components/ui/use-toast"

export default function EditarPresupuestoBasePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [presupuesto, setPresupuesto] = useState<any>(null)
  const [tareas, setTareas] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const supabase = createBrowserSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push("/login")
          return
        }
        setUserId(session.user.id)

        const { data: userDetails } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", session.user.id)
          .single()

        if (userDetails?.rol !== "supervisor" && userDetails?.rol !== "admin") {
          toast({ title: "Acceso denegado", variant: "destructive" })
          router.push("/dashboard")
          return
        }

        const { data: presupuestoData, error: presupuestoError } = await supabase
          .from("presupuestos_base")
          .select("*")
          .eq("id", params.id)
          .single()

        if (presupuestoError || !presupuestoData) {
          toast({ title: "Error", description: "El presupuesto no existe.", variant: "destructive" })
          router.push("/dashboard/presupuestos-base")
          return
        }

        if (userDetails?.rol === "supervisor" && presupuestoData.id_supervisor !== session.user.id) {
          toast({ title: "Acceso denegado", description: "No puedes editar este presupuesto.", variant: "destructive" })
          router.push("/dashboard/presupuestos-base")
          return
        }

        if (presupuestoData.aprobado) {
          toast({ title: "Error", description: "No se puede editar un presupuesto aprobado.", variant: "destructive" })
          router.push(`/dashboard/presupuestos-base/${params.id}`)
          return
        }

        setPresupuesto(presupuestoData)

        let tareasData: any[] = [];
        let tareasError: any = null;
        if (userDetails?.rol === "supervisor") {
          // 1. Buscar tareas asignadas al supervisor en la tabla supervisores_tareas
          const { data: asignaciones, error: errorAsignaciones } = await supabase
            .from('supervisores_tareas')
            .select('id_tarea')
            .eq('id_supervisor', session.user.id)
          if (errorAsignaciones) {
            throw new Error("Error al cargar asignaciones de tareas para el supervisor.")
          }
          const idsTareas = asignaciones?.map((a: { id_tarea: number }) => a.id_tarea) || [];
          if (idsTareas.length > 0) {
            // 2. Buscar las tareas con esos IDs
            const { data, error } = await supabase
              .from('tareas')
              .select('*')
              .in('id', idsTareas)
            tareasData = data || [];
            tareasError = error;
          } else {
            tareasData = [];
          }
        } else {
          // Si es admin u otro rol, traer todas las tareas
          const { data, error } = await supabase
            .from('tareas')
            .select('*')
          tareasData = data || [];
          tareasError = error;
        }
        if (tareasError) {
          throw new Error("Error al cargar las tareas.")
        }
        setTareas(tareasData)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params.id, router])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/presupuestos-base/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Editar Presupuesto Base: {presupuesto?.code}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar Presupuesto Base</CardTitle>
        </CardHeader>
        <CardContent>
          {presupuesto && userId && (
            <PresupuestoBaseForm tareas={tareas} userId={userId} presupuesto={presupuesto} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
