"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RegistroGastosForm } from "@/components/registro-gastos-form"
import { HistorialGastos } from "@/components/historial-gastos"
import { createClient } from "@/lib/supabase-client"
import { UserSessionData } from "@/lib/types"
import { Plus, Receipt, DollarSign, Calendar, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface Tarea {
  id: number
  titulo: string
  code: string
}



interface TrabajadorTarea {
  tareas: Tarea
}

export default function GastosPage() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [usuario, setUsuario] = useState<UserSessionData | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    cargarDatos()
  }, [router])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      
      
      if (!supabase) {
        setError("No se pudo inicializar el cliente de Supabase")
        setLoading(false)
        return
      }

      // Obtener usuario actual
      const sessionResponse = await supabase.auth.getSession()
      const sessionData = sessionResponse.data || {}
      const sessionError = sessionResponse.error

      if (sessionError) {
        console.error("Error de sesión:", sessionError)
        setError("Error de sesión")
        setLoading(false)
        return
      }

      const session = sessionData.session
      if (!session) {
        setError("No hay sesión activa")
        setLoading(false)
        return
      }

      // Obtener datos del usuario
      const userQuery = supabase
        .from("usuarios")
        .select("id, email, rol")
        .eq("id", session.user.id)
        .single()
      
      const userResponse = await userQuery
      const userData = userResponse.data
      const userError = userResponse.error

      if (userError) {
        console.error("Error al cargar usuario:", userError)
        setError("Error al cargar usuario")
        setLoading(false)
        return
      }

      setUsuario(userData as Usuario)

      // Obtener tareas asignadas
      if (userData?.rol === "trabajador") {
        // Consulta para obtener tareas asignadas al trabajador
        // Usamos un tipo explícito para la respuesta de Supabase
        type TrabajadoresTareasResponse = { 
          data: TrabajadorTarea[] | null; 
          error: any; 
        }
        
        const tareasQuery = supabase
          .from("trabajadores_tareas")
          .select(`
            tareas (
              id,
              titulo,
              code
            )
          `)
          .eq("id_trabajador", session.user.id)
        
        const tareasResponse = await tareasQuery as TrabajadoresTareasResponse
        const tareasData = tareasResponse.data || []
        const tareasError = tareasResponse.error

        if (tareasError) {
          console.error("Error al cargar tareas:", tareasError)
          setError("Error al cargar tareas")
          setLoading(false)
          return
        }
          
        const tareasAsignadas = tareasData?.map((item: TrabajadorTarea) => item.tareas).filter(Boolean) || []
        setTareas(tareasAsignadas as Tarea[])
      } else {
        // Admin y supervisores pueden registrar gastos en todas las tareas
        // Usamos un tipo explícito para la respuesta de Supabase
        type TareasResponse = { 
          data: Tarea[] | null; 
          error: any; 
        }
        
        const tareasQuery = supabase.from("tareas").select("id, titulo, code").order("titulo")
        
        const tareasResponse = await tareasQuery as TareasResponse
        const tareasData = tareasResponse.data || []
        const tareasError = tareasResponse.error

        if (tareasError) {
          console.error("Error al cargar tareas:", tareasError)
          setError("Error al cargar tareas")
          setLoading(false)
          return
        }

        setTareas(tareasData as Tarea[] || [])
      }

      setLoading(false)
    } catch (error) {
      console.error("Error cargando datos:", error)
      setError("Error inesperado al cargar datos")
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-6">
        <div className="bg-red-50 p-4 rounded-md mb-4">
          <h2 className="text-red-800 text-lg font-medium">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gastos de Materiales</h1>
        <Button 
          onClick={() => {
            console.log('Mostrando formulario...');
            setMostrarFormulario(true);
          }} 
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Registrar Gasto
        </Button>
      </div>

      {/* Resumen rápido */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$85,000</div>
            <p className="text-xs text-muted-foreground">5 comprobantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$320,000</div>
            <p className="text-xs text-muted-foreground">18 comprobantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Por aprobar</p>
          </CardContent>
        </Card>
      </div>

      {/* Formulario de registro */}
      {mostrarFormulario && (
        <Card className="mb-6">
          <CardContent className="p-0">
            <RegistroGastosForm
              tareas={tareas}
              usuario={usuario}
              onClose={() => {
                console.log('Cerrando formulario...');
                setMostrarFormulario(false);
              }}
              onSuccess={() => {
                console.log('Formulario enviado con éxito!');
                setMostrarFormulario(false);
                // Recargar datos después de guardar
                cargarDatos();
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      <HistorialGastos userId={usuario?.id || ""} userRole={usuario?.rol || ""}/>
    </div>
  )
}
