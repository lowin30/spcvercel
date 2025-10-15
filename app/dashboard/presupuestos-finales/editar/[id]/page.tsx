"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import { BudgetForm } from "@/components/budget-form"
import { toast } from "@/components/ui/use-toast"
import { AprobadoCheckbox } from "./aprobado-checkbox"

interface PresupuestoFinalItem {
  id: number
  id_presupuesto: number
  descripcion: string
  cantidad: number
  precio: number
  es_producto?: boolean
  producto_id?: string
}

interface Tarea {
  id: number;
  code: string;
  titulo: string;
  id_edificio?: number;
  edificios?: {
    nombre?: string;
  };
}

interface PresupuestoBase {
  id: number;
  code: string;
  materiales: number;
  mano_obra: number;
  total: number;
  aprobado: boolean;
  id_edificio?: number;
  id_tarea?: number;
  id_administrador?: number;
  tareas?: Tarea;
}

interface PresupuestoFinal {
  id: number;
  code: string;
  total: number;
  aprobado: boolean;
  id_presupuesto_base: number | null;
  created_at: string;
  // Campos directos de la vista
  id_edificio?: number;
  id_tarea?: number;
  id_administrador?: number;
  nombre_edificio?: string;
  nombre_administrador?: string;
  titulo_tarea?: string;
  presupuestos_base?: PresupuestoBase | null;
  // Info adicional del edificio
  edificio_info?: {
    cuit?: string;
  };
}

interface EditarPresupuestoFinalPageProps {
  params: Promise<{ id: string }>
}

export default function EditarPresupuestoFinalPage({ params: paramsPromise }: EditarPresupuestoFinalPageProps) {
  const { id: presupuestoId } = use(paramsPromise)
  const [presupuesto, setPresupuesto] = useState<PresupuestoFinal | null>(null)
  const [items, setItems] = useState<PresupuestoFinalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!presupuestoId || !supabase) return;

      try {
        setLoading(true)

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !sessionData.session) {
          router.push("/login")
          return
        }

        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("rol")
          .eq("id", sessionData.session.user.id)
          .single()

        if (userError) throw userError
        if (userData?.rol !== "admin") {
          toast({ title: "Acceso denegado", description: "Solo los administradores pueden editar presupuestos.", variant: "destructive" })
          router.push("/dashboard")
          return
        }

        // Usar la vista completa que ya tiene todos los datos resueltos
        const { data: presupuestoData, error: presupuestoError } = await supabase
          .from("vista_presupuestos_finales_completa")
          .select("*")
          .eq("id", presupuestoId)
          .single<PresupuestoFinal>()
        
        // Si tiene presupuesto base asociado, obtenerlo también
        if (presupuestoData && presupuestoData.id_presupuesto_base) {
          const { data: presupuestoBase } = await supabase
            .from("vista_presupuestos_base_completa")
            .select("*")
            .eq("id", presupuestoData.id_presupuesto_base)
            .single()
          
          if (presupuestoBase) {
            presupuestoData.presupuestos_base = presupuestoBase
          }
        }

        // Obtener información adicional del edificio (CUIT)
        if (presupuestoData && presupuestoData.id_edificio) {
          const { data: edificioData } = await supabase
            .from("edificios")
            .select("cuit")
            .eq("id", presupuestoData.id_edificio)
            .single()
          
          if (edificioData) {
            presupuestoData.edificio_info = { cuit: edificioData.cuit }
          }
        }

        if (presupuestoError) throw presupuestoError
        if (!presupuestoData) throw new Error("Presupuesto no encontrado")

        setPresupuesto(presupuestoData)

        const { data: itemsData, error: itemsError } = await supabase
          .from("items")
          .select<"*", PresupuestoFinalItem>("*")
          .eq("id_presupuesto", presupuestoData.id) // Asegurarse que es el ID del presupuesto final
          .order("id", { ascending: true })

        if (itemsError) throw itemsError
        setItems(itemsData || [])

      } catch (err) {
        console.error("Error detallado al cargar datos:", err)
        setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [presupuestoId, supabase, router])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !presupuesto) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="mr-2" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Error</h1>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-lg font-semibold text-red-600">{error || "El presupuesto que buscas no existe o no se pudo cargar."}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 encabezado-flexible">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/presupuestos-finales/${presupuesto.id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Editar Presupuesto Final: {presupuesto.code}</h1>
        </div>
        <div className="flex items-center gap-4">
          <AprobadoCheckbox 
            presupuestoId={parseInt(presupuestoId)} 
            initialValue={presupuesto.aprobado || false}
          />
        </div>
      </div>
      <BudgetForm
        tipo="final"
        presupuestoAEditar={presupuesto}
        itemsBase={items}
        presupuestoBase={presupuesto.presupuestos_base || undefined}
      />
    </div>
  )
}
