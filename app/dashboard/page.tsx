"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { formatDate } from "@/lib/date-utils"
import { executeCountQuery, executeQuery } from "@/lib/supabase-helpers"

// Definir tipos para mejorar la inferencia
type StatsType = {
  total_edificios: number;
  total_contactos: number;
  total_administradores: number;
  tareas_activas: number;
};

type TaskType = {
  id: string;
  created_at: string;
  [key: string]: any;
};

type BuildingType = {
  id: string;
  created_at: string;
  [key: string]: any;
};

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<StatsType | null>(null)
  const [recentTasks, setRecentTasks] = useState<TaskType[]>([])
  const [recentBuildings, setRecentBuildings] = useState<BuildingType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        
        
        if (!supabase) {
          setError("No se pudo inicializar el cliente de Supabase")
          return
        }

        // Obtener estadísticas mediante consultas directas a las tablas
        try {
          // 1. Contar edificios - usando la función de ayuda
          const edificiosQuery = supabase
            .from('edificios')
            .select('id', { count: 'exact', head: true })
          const { count: edificiosCount } = await executeCountQuery(edificiosQuery)

          // 2. Contar teléfonos de departamentos (reemplaza el antiguo conteo de contactos)
          const telefonosQuery = supabase
            .from('telefonos_departamento')
            .select('id', { count: 'exact', head: true })
          const { count: telefonosCount } = await executeCountQuery(telefonosQuery)
            
          // 3. Contar usuarios administradores - usando la función de ayuda
          const adminsQuery = supabase
            .from('usuarios')
            .select('id', { count: 'exact', head: true })
            .eq('rol', 'admin')
          const { count: adminsCount } = await executeCountQuery(adminsQuery)

          // 4. Contar tareas activas - usando la columna 'finalizada' (false = activa, true = finalizada)
          const tareasActivasQuery = supabase
            .from('tareas')
            .select('id', { count: 'exact', head: true })
            .eq('finalizada', false) // Una tarea es activa cuando finalizada = false
          const { count: tareasActivasCount } = await executeCountQuery(tareasActivasQuery)

          // Crear objeto de estadísticas
          setStats({
            total_edificios: edificiosCount || 0,
            total_contactos: telefonosCount || 0, // Ahora muestra el total de teléfonos
            total_administradores: adminsCount || 0,
            tareas_activas: tareasActivasCount || 0
          })
        } catch (statsError) {
          console.error("Error al obtener estadísticas:", statsError)
          // Usar valores por defecto para que la interfaz no se rompa
          setStats({
            total_edificios: 0,
            total_contactos: 0, // Ahora representa el total de teléfonos
            total_administradores: 0,
            tareas_activas: 0
          })
        }

        // Obtener tareas recientes - usando la función de ayuda
        const tasksQuery = supabase.from("tareas").select("*")
        const { data: tasksData, error: tasksError } = await executeQuery<TaskType>(
          tasksQuery,
          5,
          "created_at",
          false // descendente
        )

        if (tasksError) {
          console.error("Error al obtener tareas recientes:", tasksError)
        } else {
          setRecentTasks(tasksData)
        }

        // Obtener edificios recientes - usando la función de ayuda
        const buildingsQuery = supabase.from("edificios").select("*")
        const { data: buildingsData, error: buildingsError } = await executeQuery<BuildingType>(
          buildingsQuery,
          5,
          "created_at",
          false // descendente
        )

        if (buildingsError) {
          console.error("Error al obtener edificios recientes:", buildingsError)
        } else {
          setRecentBuildings(buildingsData)
        }

      } catch (err) {
        console.error("Error al cargar datos del dashboard:", err)
        setError("Ocurrió un error al cargar los datos del dashboard")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Estado de error
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-red-800">Error</h2>
        <p className="mt-2 text-red-700">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Total Edificios</h3>
          <p className="mt-2 text-3xl font-bold">{stats?.total_edificios || 0}</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Total Administradores</h3>
          <p className="mt-2 text-3xl font-bold">{stats?.total_administradores || 0}</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Total Teléfonos</h3>
          <p className="mt-2 text-3xl font-bold">{stats?.total_contactos || 0}</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">Tareas Activas</h3>
          <p className="mt-2 text-3xl font-bold">{stats?.tareas_activas || 0}</p>
        </div>
      </div>

      {/* Tareas recientes */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Tareas Recientes</h2>
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Título</th>
                  <th className="px-4 py-2 text-left font-medium">Estado</th>
                  <th className="px-4 py-2 text-left font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks && recentTasks.length > 0 ? (
                  recentTasks.map((task) => (
                    <tr key={task.id} className="border-b">
                      <td className="px-4 py-2">{task.titulo}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                            task.estado === "pendiente"
                              ? "bg-yellow-100 text-yellow-800"
                              : task.estado === "en_progreso"
                                ? "bg-blue-100 text-blue-800"
                                : task.estado === "completada"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {task.estado === "pendiente"
                            ? "Pendiente"
                            : task.estado === "en_progreso"
                              ? "En Progreso"
                              : task.estado === "completada"
                                ? "Completada"
                                : task.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2">{formatDate(task.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-center text-muted-foreground">
                      No hay tareas recientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edificios recientes */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Edificios Recientes</h2>
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Nombre</th>
                  <th className="px-4 py-2 text-left font-medium">Dirección</th>
                  <th className="px-4 py-2 text-left font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recentBuildings && recentBuildings.length > 0 ? (
                  recentBuildings.map((building) => (
                    <tr key={building.id} className="border-b">
                      <td className="px-4 py-2">{building.nombre}</td>
                      <td className="px-4 py-2">{building.direccion}</td>
                      <td className="px-4 py-2">{formatDate(building.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-center text-muted-foreground">
                      No hay edificios recientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
