"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BudgetForm } from "@/components/budget-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase-client"

export default function NuevoPresupuestoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<any>(null)
  const [tareas, setTareas] = useState<any[]>([])
  const [presupuestoBase, setPresupuestoBase] = useState<any>(null)
  const [itemsBase, setItemsBase] = useState<any[]>([])
  const [tareaSingle, setTareaSingle] = useState<any>(null)
  
  // Obtener parámetros de la URL
  const tipo = searchParams.get('tipo')
  const tipoPresupuesto = tipo === "final" ? "final" : "base"
  const idTarea = searchParams.get('id_tarea') || ""
  const idPadre = searchParams.get('id_padre') || ""
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null); // Ya se resetea el error, lo cual es bueno
        setPresupuestoBase(null); // Asegurar que el presupuesto base anterior se limpia
        setItemsBase([]);         // Asegurar que los items base anteriores se limpian
        
        // Verificar sesión de usuario
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }
        
        // Obtener detalles del usuario
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", session.user.id)
          .single()
          
        if (userError) {
          console.error("Error al obtener datos del usuario:", userError)
          router.push('/login')
          return
        }
        
        setUserDetails(userData)

        // Solo supervisores y admins pueden crear presupuestos
        if (userData?.rol !== "supervisor" && userData?.rol !== "admin") {
          router.push("/dashboard")
          return
        }

        // Verificar si es un presupuesto final (solo admin puede crear presupuestos finales)
        if (tipoPresupuesto === "final" && userData?.rol !== "admin") {
          router.push("/dashboard/presupuestos")
          return
        }
        
        // Si es un presupuesto final, cargar datos del presupuesto base
        if (tipoPresupuesto === "final" && idTarea && idPadre) {
          const { data: presupuestoBaseData, error: presupuestoBaseError } = await supabase
            .from("presupuestos_base")
            .select("*, tareas(titulo, code, edificios(nombre))") // Asegúrate que las relaciones sean correctas
            .eq("id", idPadre)
            .single();

          if (presupuestoBaseError) {
            console.error("Error al obtener presupuesto base de referencia:", presupuestoBaseError);
            setError("No se pudo cargar el presupuesto base de referencia.");
            // setLoading(false); // setLoading se maneja en el finally
            return;
          }
          
          setPresupuestoBase(presupuestoBaseData);
          // Para un presupuesto final nuevo, los ítems se añaden desde cero.
          // El presupuesto base rápido no tiene ítems detallados para copiar.
          setItemsBase([]); 

        } else {
          // Para presupuestos base, obtener tareas con más información
          let tareasQuery = supabase
            .from("tareas")
            .select("id, code, titulo, id_edificio, id_administrador, edificios(id, nombre, id_administrador)")
            .in("estado", ["pendiente", "asignada"])
            .order("created_at", { ascending: false })

          // Si se proporciona un id_tarea en la URL, filtrar solo esa tarea
          if (idTarea) {
            tareasQuery = supabase.from("tareas").select("id, code, titulo, id_edificio, id_administrador, edificios(id, nombre, id_administrador)").eq("id", idTarea)
          }
          
          const { data: tareasData, error: tareasError } = await tareasQuery
          
          if (tareasError) {
            console.error("Error al obtener tareas:", tareasError)
            setError("No se pudieron cargar las tareas")
            return
          }
          
          setTareas(tareasData || [])
          
          // Si se proporcionó un id_tarea, obtener los detalles de esa tarea
          if (idTarea && tareasData && tareasData.length > 0) {
            setTareaSingle(tareasData[0])
          }
          // Asegurar que para otros casos (ej. presupuesto base nuevo) los items también empiecen vacíos
          setPresupuestoBase(null);
          setItemsBase([]);
        }

      } catch (err) {
        console.error("Error inesperado:", err)
        setError("Ocurrió un error al cargar los datos necesarios")
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [idPadre, idTarea, tipoPresupuesto, router, supabase])
  
  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="rounded-md bg-destructive/15 p-4 text-center">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/presupuestos')}>
            Volver a presupuestos
          </Button>
        </div>
      </div>
    )
  }
  
  // Renderizar interfaz para presupuesto final
  if (tipo === "final" && idTarea && idPadre && presupuestoBase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-2"
            onClick={() => router.push(`/dashboard/tareas/${idTarea}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver a la Tarea
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo Presupuesto Final</h1>
        </div>

        <BudgetForm
          tipo="final"
          idPadre={idPadre}
          idTarea={idTarea}
          presupuestoBase={presupuestoBase}
          itemsBase={itemsBase}
        />
      </div>
    )
  }

  // Para presupuestos base o finales sin tarea con ID padre
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-2"
          onClick={() => {
            if (idTarea) {
              router.push(`/dashboard/tareas/${idTarea}`)
            } else {
              router.push("/dashboard/presupuestos")
            }
          }}
        >
          {idTarea ? (
            <>
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver a la Tarea
            </>
          ) : (
            <>
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </>
          )}
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Nuevo Presupuesto {tipoPresupuesto === "final" ? "Final" : "Base"}
        </h1>
      </div>

      <BudgetForm tipo={tipoPresupuesto} tareas={tareas} tareaSeleccionada={tareaSingle} />
    </div>
  )
}
