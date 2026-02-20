"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { getDashboardStats } from "./actions"
import { formatDate } from "@/lib/date-utils"
import { executeCountQuery, executeQuery } from "@/lib/supabase-helpers"
import { TaskStatusBadge } from "./tasks-badge"
import { TaskStatusBadge } from "./tasks-badge"

// Importar componentes específicos por rol
import { AdminDashboard } from "./admin-dashboard"
import { SupervisorDashboard } from "./supervisor-dashboard"
import { TrabajadorDashboard } from "./trabajador-dashboard"


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

  // Estados generales
  const [stats, setStats] = useState<StatsType | null>(null)
  const [recentTasks, setRecentTasks] = useState<TaskType[]>([])
  const [recentBuildings, setRecentBuildings] = useState<BuildingType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estado para almacenar los datos del usuario
  const [userDetails, setUserDetails] = useState<any>(null)

  // Estados específicos por rol
  const [financialStats, setFinancialStats] = useState<any>(null) // Para admin
  const [supervisorStats, setSupervisorStats] = useState<any>(null) // Para supervisor
  const [trabajadorStats, setTrabajadorStats] = useState<any>(null) // Para trabajador
  const [salarioDiarioTrabajador, setSalarioDiarioTrabajador] = useState<number>(0) // Salario del trabajador

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)

        if (!supabase) {
          setError("no se pudo inicializar supabase")
          return
        }

        // Usar Server Action para obtener datos (lee el JWT automáticamente)
        const { stats: dashboardStats, userDetails: userData, error: serverError } = await getDashboardStats()

        if (serverError || !userData) {
          console.error('spc: error server side', serverError)
          setError("no se pudieron cargar los datos del usuario")
          return
        }

        setUserDetails(userData)
        setStats(dashboardStats)

        // Cargar estadísticas específicas según el rol del usuario
        /* if (userData.rol === 'admin') {
          try {
            // Estadísticas financieras para administradores
            const presupuestosQuery = supabase
              .from('presupuestos_finales')
              .select('id, total', { count: 'exact', head: true })
              .eq('id_estado', 5) // ID de estado "activo"
            const { count: presupuestosActivos } = await executeCountQuery(presupuestosQuery)

            // Monto total de presupuestos activos
            const { data: montoData } = await supabase
              .from('presupuestos_finales')
              .select('total')
              .eq('id_estado', 5) // ID de estado "activo"
            const montoTotal = montoData?.reduce((sum, item) => sum + (item.total || 0), 0) || 0

            // Facturas pendientes
            const { count: facturasPendientes } = await executeCountQuery(
              supabase
                .from('facturas')
                .select('id', { count: 'exact', head: true })
                .eq('id_estado_nuevo', 1) // ID de estado "pendiente"
            )

            const { data: adminFinance } = await supabase
              .from('vista_finanzas_admin')
              .select('gastos_no_liquidados_semana, monto_jornales_pendientes_semana, ganancia_admin_mes, liquidaciones_pendientes, facturas_por_cobrar_total, saldos_pendientes_total, jornales_pendientes_mayor_7d, monto_jornales_pendientes_mayor_7d, visitas_hoy_total')
              .maybeSingle()

            setFinancialStats({
              presupuestos_activos: presupuestosActivos || 0,
              presupuestos_monto_total: montoTotal || 0,
              facturas_pendientes: facturasPendientes || 0,
              liquidaciones_pendientes: adminFinance?.liquidaciones_pendientes ?? 0,
              gastos_no_liquidados_semana: adminFinance?.gastos_no_liquidados_semana ?? 0,
              monto_jornales_pendientes_semana: adminFinance?.monto_jornales_pendientes_semana ?? 0,
              ingresos_mes_actual: adminFinance?.ganancia_admin_mes ?? 0,
              facturas_por_cobrar_total: adminFinance?.facturas_por_cobrar_total ?? 0,
              saldos_pendientes_total: adminFinance?.saldos_pendientes_total ?? 0,
              jornales_pendientes_mayor_7d: adminFinance?.jornales_pendientes_mayor_7d ?? 0,
              monto_jornales_pendientes_mayor_7d: adminFinance?.monto_jornales_pendientes_mayor_7d ?? 0,
              visitas_hoy_total: adminFinance?.visitas_hoy_total ?? 0
            })
          } catch (e) {
            console.error("Error al cargar estadísticas para administrador:", e)
            setFinancialStats({
              presupuestos_activos: 0,
              presupuestos_monto_total: 0,
              facturas_pendientes: 0,
              liquidaciones_pendientes: 0
            })
          }

        } else if (userData.rol === 'supervisor') {
          try {
            // Tareas supervisadas
            const { count: tareasSupervisadas } = await executeCountQuery(
              supabase
                .from('supervisores_tareas')
                .select('id_tarea', { count: 'exact', head: true })
                .eq('id_supervisor', userData.id)
            )

            // Cargar vista financiera del supervisor (KPIs permitidos)
            const { data: supFin } = await supabase
              .from('vista_finanzas_supervisor')
              .select('tareas_supervisadas_total, visitas_hoy_total, liquidaciones_pendientes, liquidaciones_mes, ganancia_supervisor_mes, gastos_sin_comprobante_total, gastos_no_liquidados, jornales_no_liquidados, gastos_no_liquidados_semana, jornales_pendientes_semana, monto_jornales_pendientes_semana, jornales_pendientes_mayor_7d, monto_jornales_pendientes_mayor_7d, presupuestos_base_total, presupuestos_base_monto_total')
              .maybeSingle()

            // Trabajadores asignados a sus tareas
            const { data: tareasDelSupervisor } = await supabase
              .from('supervisores_tareas')
              .select('id_tarea')
              .eq('id_supervisor', userData.id)
            const idsTareas = tareasDelSupervisor?.map(t => t.id_tarea) || []
            let trabajadoresAsignados = 0
            if (idsTareas.length > 0) {
              const { data: trabajadoresData } = await supabase
                .from('trabajadores_tareas')
                .select('id_trabajador')
                .in('id_tarea', idsTareas)
              const trabajadoresUnicos = new Set()
              trabajadoresData?.forEach(t => trabajadoresUnicos.add(t.id_trabajador))
              trabajadoresAsignados = trabajadoresUnicos.size
            }

            // Liquidaciones propias (total)
            const { count: liquidacionesPropias } = await executeCountQuery(
              supabase
                .from('liquidaciones_nuevas')
                .select('id', { count: 'exact', head: true })
                .eq('id_usuario_supervisor', userData.id)
            )

            setSupervisorStats({
              tareas_supervisadas: tareasSupervisadas || 0,
              trabajadores_asignados: trabajadoresAsignados || 0,
              liquidaciones_propias: liquidacionesPropias || 0,
              visitas_hoy_total: supFin?.visitas_hoy_total ?? 0,
              liquidaciones_pendientes: supFin?.liquidaciones_pendientes ?? 0,
              liquidaciones_mes: supFin?.liquidaciones_mes ?? 0,
              ganancia_supervisor_mes: supFin?.ganancia_supervisor_mes ?? 0,
              gastos_sin_comprobante_total: supFin?.gastos_sin_comprobante_total ?? 0,
              gastos_no_liquidados: supFin?.gastos_no_liquidados ?? 0,
              jornales_no_liquidados: supFin?.jornales_no_liquidados ?? 0,
              gastos_no_liquidados_semana: supFin?.gastos_no_liquidados_semana ?? 0,
              jornales_pendientes_semana: supFin?.jornales_pendientes_semana ?? 0,
              monto_jornales_pendientes_semana: supFin?.monto_jornales_pendientes_semana ?? 0,
              jornales_pendientes_mayor_7d: supFin?.jornales_pendientes_mayor_7d ?? 0,
              monto_jornales_pendientes_mayor_7d: supFin?.monto_jornales_pendientes_mayor_7d ?? 0,
              presupuestos_base_total: supFin?.presupuestos_base_total ?? 0,
              presupuestos_base_monto_total: supFin?.presupuestos_base_monto_total ?? 0
            })
          } catch (e) {
            console.error("Error al cargar estadísticas para supervisor:", e)
            setSupervisorStats({
              tareas_supervisadas: 0,
              trabajadores_asignados: 0,
              liquidaciones_propias: 0
            })
          }
        } else if (userData.rol === 'trabajador') {
          try {
            const { data: workerFinance } = await supabase
              .from('vista_finanzas_trabajador')
              .select('tareas_asignadas_total, dias_registrados_mes, cantidad_gastos_pendientes, proximo_pago_estimado')
              .maybeSingle()

            setTrabajadorStats({
              mis_tareas: workerFinance?.tareas_asignadas_total ?? 0,
              dias_registrados_mes: workerFinance?.dias_registrados_mes ?? 0,
              gastos_pendientes: workerFinance?.cantidad_gastos_pendientes ?? 0,
              proximo_pago_estimado: workerFinance?.proximo_pago_estimado ?? 0
            })

            // Cargar salario diario del trabajador
            const { data: configTrabajador } = await supabase
              .from('configuracion_trabajadores')
              .select('salario_diario')
              .eq('id_trabajador', userData.id)
              .maybeSingle()

            setSalarioDiarioTrabajador(configTrabajador?.salario_diario ?? 0)
          } catch (e) {
            setTrabajadorStats({
              mis_tareas: 0,
              dias_registrados_mes: 0,
              gastos_pendientes: 0,
              proximo_pago_estimado: 0
            })
            setSalarioDiarioTrabajador(0)
          }
        }
      } catch (statsError) {
        console.error("Error al obtener estadísticas:", statsError)
        // Usar valores por defecto para que la interfaz no se rompa
        setStats({
          total_edificios: 0,
          total_contactos: 0, // Ahora representa el total de teléfonos
          total_administradores: 0,
          tareas_activas: 0
        })
      } */

        // Obtener tareas recientes filtradas por rol
        let tasksQuery;

        // Filtrar tareas según el rol del usuario
        if (userData?.rol === 'admin') {
          // Los admin ven todas las tareas usando la vista completa con JOIN a estados_tareas
          tasksQuery = supabase.from("vista_tareas_completa")
            .select(`
              id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
              estados:estados_tareas(id, nombre, color)
            `)
            .eq('finalizada', false)
            .order('fecha_visita', { ascending: true }) // Ordenar por fecha de visita más próxima
        }
        else if (userData?.rol === 'supervisor') {
          // Los supervisores solo ven tareas que supervisan
          try {
            // Primero obtenemos los IDs de tareas asignadas al supervisor
            const { data: asignaciones } = await supabase
              .from('supervisores_tareas')
              .select('id_tarea')
              .eq('id_supervisor', userData.id)

            const idsTareas = asignaciones?.map(a => a.id_tarea) || []

            if (idsTareas.length > 0) {
              // Luego filtramos las tareas por esos IDs usando la vista completa con JOIN a estados_tareas
              tasksQuery = supabase.from("vista_tareas_completa")
                .select(`
                  id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                  estados:estados_tareas(id, nombre, color)
                `)
                .in('id', idsTareas)
                .eq('finalizada', false)
                .order('fecha_visita', { ascending: true }) // Ordenar por fecha de visita más próxima
            } else {
              // Si no tiene tareas asignadas, mostramos una lista vacía
              tasksQuery = supabase.from("vista_tareas_completa")
                .select(`
                  id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                  estados:estados_tareas(id, nombre, color)
                `)
                .eq('id', -1) // No coincidirá con ninguna
            }
          } catch (e) {
            console.error("Error al consultar tareas del supervisor:", e)
            tasksQuery = supabase.from("vista_tareas_completa")
              .select(`
                id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                estados:estados_tareas(id, nombre, color)
              `)
              .limit(0)
          }
        }
        else if (userData?.rol === 'trabajador') {
          // Los trabajadores solo ven tareas donde están asignados
          try {
            // Primero obtenemos los IDs de tareas asignadas al trabajador
            const { data: asignaciones } = await supabase
              .from('trabajadores_tareas')
              .select('id_tarea')
              .eq('id_trabajador', userData.id)

            const idsTareas = asignaciones?.map(a => a.id_tarea) || []

            if (idsTareas.length > 0) {
              // Luego filtramos las tareas por esos IDs usando la vista completa con JOIN a estados_tareas
              tasksQuery = supabase.from("vista_tareas_completa")
                .select(`
                  id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                  estados:estados_tareas(id, nombre, color)
                `)
                .in('id', idsTareas)
                .eq('finalizada', false)
                .order('fecha_visita', { ascending: true }) // Ordenar por fecha de visita más próxima
            } else {
              // Si no tiene tareas asignadas, mostramos una lista vacía
              tasksQuery = supabase.from("vista_tareas_completa")
                .select(`
                  id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                  estados:estados_tareas(id, nombre, color)
                `)
                .eq('id', -1) // No coincidirá con ninguna
            }
          } catch (e) {
            console.error("Error al consultar tareas del trabajador:", e)
            tasksQuery = supabase.from("vista_tareas_completa")
              .select(`
                id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
                estados:estados_tareas(id, nombre, color)
              `)
              .limit(0)
          }
        }
        else {
          // Para otros roles o si no hay rol definido, no mostramos tareas
          tasksQuery = supabase.from("vista_tareas_completa")
            .select(`
              id, titulo, fecha_visita, id_estado_nuevo, estado_tarea, created_at,
              estados:estados_tareas(id, nombre, color)
            `)
            .limit(0)
        }

        // Ejecutamos la consulta con límite
        const { data: tasksData, error: tasksError } = await executeQuery<TaskType>(
          tasksQuery,
          5,
          "created_at",
          false // descendente
        );

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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>

      </div>

      {/* Mostrar interfaz específica según el rol del usuario */}
      {userDetails?.rol === 'admin' && (
        <AdminDashboard
          stats={stats ?? undefined}
          financialStats={financialStats}
          recentTasks={recentTasks}
          recentBuildings={recentBuildings}
        />
      )}

      {userDetails?.rol === 'supervisor' && (
        <SupervisorDashboard
          stats={stats ?? undefined}
          supervisorStats={supervisorStats}
          recentTasks={recentTasks}
        />
      )}

      {userDetails?.rol === 'trabajador' && (
        <TrabajadorDashboard
          stats={stats ?? undefined}
          trabajadorStats={trabajadorStats}
          recentTasks={recentTasks}
          userId={userDetails.id}
          salarioDiario={salarioDiarioTrabajador}
        />
      )}

      {/* Si no hay un rol definido, mostrar la interfaz genérica */}
      {!userDetails?.rol && (
        <>
          {/* Estadísticas generales */}
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
                            <TaskStatusBadge task={task} />
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
        </>
      )}
    </div>
  )
}
